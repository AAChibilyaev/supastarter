import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFileSync, unlinkSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, extname } from "node:path";

import { logger } from "@repo/logs";
import OpenAI from "openai";

import type { ParsedDocument } from "../types";

/**
 * Parse audio files via Whisper speech-to-text transcription.
 *
 * Pipeline:
 *   1. Try whisper-cli (local Python package) — fast, offline
 *   2. Fall back to OpenAI Whisper API (whisper-1) — requires API key
 *
 * Requires one of:
 *   - `openai-whisper` Python package (pip install openai-whisper)
 *   - `OPENAI_API_KEY` env var for API fallback
 *   - `ffmpeg` for audio format conversion
 */
export async function parseAudio(
	content: Buffer | string,
	filename: string,
): Promise<ParsedDocument> {
	const buffer = typeof content === "string" ? Buffer.from(content, "utf-8") : content;
	const ext = extname(filename).toLowerCase().replace(/^\./, "");

	// Normalize to a format whistle/ffmpeg can handle: convert to 16kHz mono WAV
	const tmpDir = join(tmpdir(), `audio-${randomUUID()}`);
	const inputPath = join(tmpdir(), `${randomUUID()}.${ext}`);
	const wavPath = join(tmpDir, "audio.wav");

	try {
		execSync(`mkdir -p "${tmpDir}"`, { timeout: 5000 });
		writeFileSync(inputPath, buffer);

		// Convert to 16kHz mono WAV using ffmpeg
		try {
			execSync(`ffmpeg -y -i "${inputPath}" -ar 16000 -ac 1 "${wavPath}" 2>/dev/null`, {
				timeout: 60000,
				encoding: "utf-8",
			});
		} catch {
			// If ffmpeg fails, use the original file as-is
			logger.warn({ filename }, "parseAudio: ffmpeg conversion failed, using raw input");
			// Copy original to wavPath
			const { copyFileSync } = await import("node:fs");
			copyFileSync(inputPath, wavPath);
		}

		// Phase 1: Try whisper-cli (local)
		let transcript = "";
		let usedApi = false;

		try {
			transcript = await transcribeWithWhisperCli(wavPath);
		} catch {
			logger.info({ filename }, "parseAudio: whisper-cli unavailable, falling back to API");
		}

		// Phase 2: Fall back to OpenAI Whisper API
		if (!transcript) {
			try {
				transcript = await transcribeWithOpenAI(wavPath);
				usedApi = true;
			} catch (err) {
				logger.error({ err, filename }, "parseAudio: OpenAI Whisper API failed");
			}
		}

		// Estimate duration from file size (rough: 16kHz 16-bit mono = 32KB/s)
		const estimatedDurationSeconds = Math.round(buffer.length / 32000);

		const wordCount = transcript.split(/\s+/).filter(Boolean).length;

		return {
			title: filename.replace(/\.[^.]+$/, ""),
			content: transcript || "Unable to transcribe audio",
			mimeType: getAudioMimeType(ext),
			metadata: {
				durationSeconds: estimatedDurationSeconds,
				wordCount,
				usedApi,
				format: ext,
			},
		};
	} finally {
		// Cleanup
		try {
			unlinkSync(inputPath);
		} catch {
			// best-effort
		}
		try {
			execSync(`rm -rf "${tmpDir}"`, { timeout: 5000 });
		} catch {
			// best-effort
		}
	}
}

/**
 * Transcribe audio using the local whisper-cli tool.
 * Expects `whisper` command available in PATH (from pip install openai-whisper).
 */
async function transcribeWithWhisperCli(wavPath: string): Promise<string> {
	const result = execSync(
		`whisper "${wavPath}" --model small --language en --output_format txt 2>/dev/null`,
		{ encoding: "utf-8", timeout: 300000 }, // 5 min for long audio
	);

	// whisper-cli outputs to a .txt file alongside the input
	const txtPath = wavPath.replace(/\.wav$/, ".txt");
	try {
		const text = readFileSync(txtPath, "utf-8").trim();
		return text;
	} catch {
		// Fallback to stdout
		return result.trim();
	}
}

/**
 * Transcribe audio using OpenAI Whisper API (whisper-1).
 */
let _openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
	if (_openaiClient) return _openaiClient;
	_openaiClient = new OpenAI({
		apiKey: process.env.OPENAI_API_KEY ?? "",
	});
	return _openaiClient;
}

async function transcribeWithOpenAI(wavPath: string): Promise<string> {
	const { createReadStream } = await import("node:fs");
	const client = getOpenAIClient();

	const response = await client.audio.transcriptions.create({
		model: "whisper-1",
		file: createReadStream(wavPath),
		language: "en",
		response_format: "text",
	});

	return (response as unknown as string).trim();
}

/**
 * Map audio file extension to MIME type.
 */
function getAudioMimeType(ext: string): string {
	const mimeMap: Record<string, string> = {
		mp3: "audio/mpeg",
		wav: "audio/wav",
		m4a: "audio/mp4",
		ogg: "audio/ogg",
		flac: "audio/flac",
		webm: "audio/webm",
		aac: "audio/aac",
		wma: "audio/x-ms-wma",
	};
	return mimeMap[ext] ?? "application/octet-stream";
}
