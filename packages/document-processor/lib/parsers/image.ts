import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { ParsedDocument } from "../types";

/**
 * Parse images using Tesseract OCR.
 *
 * Supported: JPEG, PNG, WebP, TIFF, BMP
 * Requires: tesseract-ocr with language data
 */
export async function parseImage(
	content: Buffer | string,
	filename: string,
): Promise<ParsedDocument> {
	const buffer = typeof content === "string" ? Buffer.from(content, "utf-8") : content;

	const ext = filename.split(".").pop()?.toLowerCase() ?? "png";
	const tmpPath = join(tmpdir(), `${randomUUID()}.${ext}`);

	try {
		writeFileSync(tmpPath, buffer);

		// Detect language from filename or metadata hints
		const language = detectLanguage(filename);

		// Run tesseract with best-practice flags
		// --oem 1: LSTM neural net only (best accuracy)
		// --psm 3: automatic page segmentation
		const text = execSync(
			`tesseract "${tmpPath}" stdout --oem 1 --psm 3 -l ${language} 2>/dev/null`,
			{ encoding: "utf-8", timeout: 60000 },
		).trim();

		// If first attempt gave near-empty result, retry with different PSM
		const wordCount = text.split(/\s+/).filter(Boolean).length;
		let usedPsm6 = false;

		if (wordCount < 5) {
			try {
				const retryText = execSync(
					`tesseract "${tmpPath}" stdout --oem 1 --psm 6 -l ${language} 2>/dev/null`,
					{ encoding: "utf-8", timeout: 60000 },
				).trim();
				if (retryText.split(/\s+/).filter(Boolean).length > wordCount) {
					usedPsm6 = true;
				}
			} catch {
				// keep original
			}
		}

		const finalText = usedPsm6
			? execSync(
					`tesseract "${tmpPath}" stdout --oem 1 --psm 6 -l ${language} 2>/dev/null`,
					{ encoding: "utf-8", timeout: 60000 },
				).trim()
			: text;

		return {
			title: filename.replace(/\.[^.]+$/, ""),
			content: finalText || "Unable to extract text from image",
			mimeType: getMimeType(ext),
			metadata: {
				language,
				wordCount: finalText.split(/\s+/).filter(Boolean).length,
				ocrEngine: "tesseract",
				psmMode: usedPsm6 ? 6 : 3,
				ocrSuccess: finalText.length > 0,
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

function detectLanguage(filename: string): string {
	const lower = filename.toLowerCase();

	// Common language hints in filenames
	if (
		lower.includes("russian") ||
		lower.includes("рус") ||
		lower.includes("ru_") ||
		lower.includes("_ru")
	) {
		return "rus+eng";
	}
	if (
		lower.includes("german") ||
		lower.includes("de_") ||
		lower.includes("_de") ||
		lower.includes("deutsch")
	) {
		return "deu+eng";
	}
	if (lower.includes("french") || lower.includes("fr_") || lower.includes("_fr")) {
		return "fra+eng";
	}
	if (lower.includes("spanish") || lower.includes("es_") || lower.includes("_es")) {
		return "spa+eng";
	}

	return "eng";
}

function getMimeType(ext: string): string {
	const mimeMap: Record<string, string> = {
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		png: "image/png",
		webp: "image/webp",
		tiff: "image/tiff",
		tif: "image/tiff",
		bmp: "image/bmp",
		gif: "image/gif",
	};
	return mimeMap[ext] ?? "application/octet-stream";
}
