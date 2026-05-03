import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { ParsedDocument } from "../types";

/**
 * Extract transcripts/text from video files.
 *
 * Pipeline:
 *   1. Extract audio track using ffmpeg
 *   2. Transcribe audio using Whisper (reuses audio parser)
 *   3. (Optional) Extract embedded subtitle tracks
 *
 * Supported formats: MP4, WebM, AVI, MOV, MKV
 * Requires: ffmpeg + whisper-cli or openai-whisper
 */
export async function parseVideo(
	content: Buffer | string,
	filename: string,
): Promise<ParsedDocument> {
	const buffer = typeof content === "string" ? Buffer.from(content, "utf-8") : content;

	const ext = filename.split(".").pop()?.toLowerCase() ?? "mp4";
	const tmpPath = join(tmpdir(), `${randomUUID()}.${ext}`);

	try {
		writeFileSync(tmpPath, buffer);

		const duration = getVideoDuration(tmpPath);
		const metadata = extractVideoMetadata(tmpPath);

		// Phase 1: Try to extract embedded subtitles first
		let transcript = extractEmbeddedSubtitles(tmpPath);

		// Phase 2: If no subtitles, extract audio and transcribe
		let transcriptionMethod = "embedded_subtitles";
		if (!transcript) {
			transcript = extractAudioAndTranscribe(tmpPath);
			transcriptionMethod = transcript ? "whisper_transcription" : "none";
		}

		return {
			title: filename.replace(/\.[^.]+$/, ""),
			content: transcript || "Unable to extract transcript from video",
			mimeType: getVideoMimeType(ext),
			metadata: {
				durationSeconds: duration,
				transcriptionMethod,
				wordCount: transcript.split(/\s+/).filter(Boolean).length,
				format: ext,
				...metadata,
			},
		};
	} finally {
		try {
			unlinkSync(tmpPath);
		} catch {
			// cleanup best-effort
		}
	}
}

function extractEmbeddedSubtitles(videoPath: string): string {
	const subtitlesDir = join(tmpdir(), `subs-${randomUUID()}`);

	try {
		execSync(`mkdir -p "${subtitlesDir}"`, { timeout: 5000 });

		// Try extracting subtitle streams using ffmpeg
		// Probe for subtitle streams first
		const probe = execSync(
			`ffprobe -v error -select_streams s -show_entries stream=index:stream_tags=language -of csv=p=0 "${videoPath}" 2>/dev/null`,
			{ encoding: "utf-8", timeout: 15000 },
		).trim();

		if (!probe) return "";

		const subtitleTexts: string[] = [];
		const subOutPath = join(subtitlesDir, "subs.srt");

		// Extract first subtitle stream to SRT
		execSync(
			`ffmpeg -y -i "${videoPath}" -map 0:s:0 "${subOutPath}" 2>/dev/null`,
			{ timeout: 120000 },
		);

		// Parse SRT to plain text
		try {
			const srtContent = execSync(
				`cat "${subOutPath}" | sed '/^[0-9]\\{1,\\}$/d; /^[0-9][0-9]:/d; /^$/d' 2>/dev/null`,
				{ encoding: "utf-8", timeout: 10000 },
			).trim();
			if (srtContent) subtitleTexts.push(srtContent);
		} catch {
			// skip
		}

		return subtitleTexts.join("\n");
	} catch {
		return "";
	} finally {
		try {
			execSync(`rm -rf "${subtitlesDir}"`, { timeout: 5000 });
		} catch {
			// cleanup best-effort
		}
	}
}

function extractAudioAndTranscribe(videoPath: string): string {
	const audioPath = join(tmpdir(), `audio-${randomUUID()}.wav`);

	try {
		// Extract audio: 16kHz mono WAV for best compatibility with Whisper
		execSync(
			`ffmpeg -y -i "${videoPath}" -vn -ar 16000 -ac 1 -c:a pcm_s16le "${audioPath}" 2>/dev/null`,
			{ timeout: 180000 },
		);

		// Try whisper-cli first
		try {
			const text = execSync(
				`whisper-cli -f "${audioPath}" -otxt -nt 2>/dev/null`,
				{ encoding: "utf-8", timeout: 300000, maxBuffer: 50 * 1024 * 1024 },
			).trim();
			if (text) return text;
		} catch {
			// fallthrough
		}

		// Fall back to Python whisper
		try {
			const text = execSync(
				`python3 -c "
import sys
try:
    import whisper
    model = whisper.load_model('base')
    result = model.transcribe('${audioPath.replace(/'/g, "'\\''")}')
    print(result['text'])
except Exception as e:
    print(f'[WHISPER_ERROR] {e}', file=sys.stderr)
    sys.exit(1)
" 2>/dev/null`,
				{ encoding: "utf-8", timeout: 600000, maxBuffer: 50 * 1024 * 1024 },
			).trim();
			if (text && !text.startsWith("[WHISPER_ERROR]")) return text;
		} catch {
			// fallthrough
		}

		return "";
	} finally {
		try {
			unlinkSync(audioPath);
		} catch {
			// cleanup best-effort
		}
	}
}

function getVideoDuration(videoPath: string): number {
	try {
		const result = execSync(
			`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}" 2>/dev/null`,
			{ encoding: "utf-8", timeout: 10000 },
		).trim();
		const seconds = parseFloat(result);
		return isNaN(seconds) ? 0 : Math.round(seconds);
	} catch {
		return 0;
	}
}

function extractVideoMetadata(videoPath: string): Record<string, unknown> {
	try {
		const probe = execSync(
			`ffprobe -v error -show_entries format=bit_rate:stream=codec_name,width,height,codec_type -of json "${videoPath}" 2>/dev/null`,
			{ encoding: "utf-8", timeout: 15000 },
		);
		const data = JSON.parse(probe);

		const videoStream = data.streams?.find((s: { codec_type: string }) => s.codec_type === "video");
		const audioStream = data.streams?.find((s: { codec_type: string }) => s.codec_type === "audio");

		return {
			videoCodec: videoStream?.codec_name ?? null,
			audioCodec: audioStream?.codec_name ?? null,
			width: videoStream?.width ?? null,
			height: videoStream?.height ?? null,
			bitRate: data.format?.bit_rate ?? null,
		};
	} catch {
		return {};
	}
}

function getVideoMimeType(ext: string): string {
	const mimeMap: Record<string, string> = {
		mp4: "video/mp4",
		webm: "video/webm",
		avi: "video/x-msvideo",
		mov: "video/quicktime",
		mkv: "video/x-matroska",
	};
	return mimeMap[ext] ?? "application/octet-stream";
}
