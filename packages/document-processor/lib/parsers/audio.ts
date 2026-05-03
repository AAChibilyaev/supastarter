import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { ParsedDocument } from "../types";

/**
 * Transcribe audio files using OpenAI Whisper (via whisper.cpp or local CLI).
 *
 * Supported formats: MP3, WAV, OGG, FLAC, M4A, AAC, WMA, WebM
 *
 * Resolution priority:
 *   1. `whisper-cli` (whisper.cpp) — fastest, local, no GPU required
 *   2. `whisper` (OpenAI Whisper Python) — most accurate, needs Python + torch
 *
 * Requires one of:
 *   - whisper.cpp compiled + `whisper-cli` in PATH
 *   - openai-whisper Python package installed
 */
export async function parseAudio(
	content: Buffer | string,
	filename: string,
): Promise<ParsedDocument> {
	const buffer = typeof content === "string" ? Buffer.from(content, "utf-8") : content;

	const ext = filename.split(".").pop()?.toLowerCase() ?? "mp3";
	const tmpPath = join(tmpdir(), `${randomUUID()}.${ext}`);

	try {
		writeFileSync(tmpPath, buffer);

		const duration = getAudioDuration(tmpPath);
		const transcription = transcribeAudio(tmpPath);

		return {
			title: filename.replace(/\.[^.]+$/, ""),
			content: transcription || "Unable to transcribe audio",
			mimeType: getAudioMimeType(ext),
			metadata: {
				durationSeconds: duration,
				wordCount: transcription.split(/\s+/).filter(Boolean).length,
				transcriptionEngine: getTranscriptionEngine(),
				format: ext,
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

function transcribeAudio(audioPath: string): string {
	// Strategy 1: whisper.cpp CLI (fastest)
	try {
		const text = execSync(
			`whisper-cli --file "${audioPath}" --output-txt --no-timestamps 2>/dev/null`,
			{ encoding: "utf-8", timeout: 300000, maxBuffer: 50 * 1024 * 1024 },
		).trim();

		// whisper-cli prints to stdout
		if (text) return text;
	} catch {
		// fallthrough
	}

	// Strategy 2: whisper.cpp with different output mode
	try {
		const text = execSync(
			`whisper-cli -f "${audioPath}" -otxt -nt 2>/dev/null`,
			{ encoding: "utf-8", timeout: 300000, maxBuffer: 50 * 1024 * 1024 },
		).trim();
		if (text) return text;
	} catch {
		// fallthrough
	}

	// Strategy 3: OpenAI Whisper Python
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

	// Strategy 4: ffmpeg + whisper.cpp (convert to 16kHz WAV first)
	try {
		const wavPath = audioPath.replace(/\.[^.]+$/, ".wav");
		execSync(
			`ffmpeg -y -i "${audioPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${wavPath}" 2>/dev/null`,
			{ timeout: 60000 },
		);
		const text = execSync(
			`whisper-cli -f "${wavPath}" -otxt -nt 2>/dev/null`,
			{ encoding: "utf-8", timeout: 300000, maxBuffer: 50 * 1024 * 1024 },
		).trim();
		try {
			unlinkSync(wavPath);
		} catch {
			// cleanup
		}
		if (text) return text;
	} catch {
		// fallthrough
	}

	return "";
}

function getAudioDuration(audioPath: string): number {
	try {
		const result = execSync(
			`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}" 2>/dev/null`,
			{ encoding: "utf-8", timeout: 10000 },
		).trim();
		const seconds = parseFloat(result);
		return isNaN(seconds) ? 0 : Math.round(seconds);
	} catch {
		return 0;
	}
}

function getTranscriptionEngine(): string {
	try {
		execSync("whisper-cli --version 2>/dev/null", { timeout: 5000 });
		return "whisper.cpp";
	} catch {
		try {
			execSync("python3 -c \"import whisper; print(whisper.__version__)\" 2>/dev/null", {
				timeout: 5000,
			});
			return "openai-whisper";
		} catch {
			return "unknown";
		}
	}
}

function getAudioMimeType(ext: string): string {
	const mimeMap: Record<string, string> = {
		mp3: "audio/mpeg",
		wav: "audio/wav",
		ogg: "audio/ogg",
		flac: "audio/flac",
		m4a: "audio/mp4",
		aac: "audio/aac",
		wma: "audio/x-ms-wma",
		webm: "audio/webm",
	};
	return mimeMap[ext] ?? "application/octet-stream";
}
