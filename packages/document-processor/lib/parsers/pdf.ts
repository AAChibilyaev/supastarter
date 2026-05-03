import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFileSync, unlinkSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { ParsedDocument } from "../types";

/**
 * Minimum word count threshold to consider PDF text extraction successful.
 * Scanned documents typically return empty or near-empty text from pdftotext.
 */
const MIN_ACCEPTABLE_WORDS = 10;

/**
 * Parse PDF files — first tries pdftotext, then falls back to OCR via tesseract
 * for scanned documents.
 *
 * Requires system dependencies:
 *   - poppler-utils (provides pdftotext, pdfinfo)
 *   - tesseract-ocr (for OCR fallback on scanned docs)
 *   - ghostscript (for PDF-to-image conversion in OCR path)
 */
export async function parsePdf(
	content: Buffer | string,
	filename: string,
): Promise<ParsedDocument> {
	const buffer = typeof content === "string" ? Buffer.from(content, "utf-8") : content;

	const tmpPath = join(tmpdir(), `${randomUUID()}.pdf`);

	try {
		writeFileSync(tmpPath, buffer);

		// Phase 1: Try native text extraction via poppler
		let text = "";
		let pageCount = 0;
		let usedOcr = false;

		try {
			const result = execSync(`pdftotext "${tmpPath}" - 2>/dev/null`, {
				encoding: "utf-8",
				timeout: 30000,
			});
			text = result.trim();

			// Count pages
			try {
				const pageCountResult = execSync(
					`pdfinfo "${tmpPath}" 2>/dev/null | grep Pages | awk '{print $2}'`,
					{ encoding: "utf-8", timeout: 10000 },
				);
				pageCount = parseInt(pageCountResult.trim(), 10) || 0;
			} catch {
				pageCount = 0;
			}
		} catch {
			// pdftotext failed entirely
		}

		// Phase 2: If text is too sparse, try OCR via tesseract
		const wordCount = text.split(/\s+/).filter(Boolean).length;
		if (wordCount < MIN_ACCEPTABLE_WORDS) {
			try {
				const ocrText = runOcrOnPdf(tmpPath);
				if (ocrText.trim()) {
					text = ocrText.trim();
					usedOcr = true;
				}
			} catch {
				// OCR failed — keep whatever pdftotext gave us
			}
		}

		// Phase 3: Last resort — raw text extraction from binary
		if (!text) {
			text = extractTextFromPdfRaw(buffer);
		}

		const finalWordCount = text.split(/\s+/).filter(Boolean).length;

		return {
			title: filename.replace(/\.pdf$/i, ""),
			content: text || "Unable to extract text from PDF",
			mimeType: "application/pdf",
			metadata: {
				pageCount,
				wordCount: finalWordCount,
				usedOcr,
				ocrFallback: usedOcr,
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

/**
 * Run OCR on a PDF using Ghostscript + Tesseract.
 *
 * Pipeline: PDF → (gs) → TIFF images → (tesseract) → text output
 *
 * Requires ghostscript and tesseract-ocr with language data installed.
 */
function runOcrOnPdf(pdfPath: string): string {
	const ocrTmpDir = join(tmpdir(), `ocr-${randomUUID()}`);
	const tiffPrefix = join(ocrTmpDir, "page");

	try {
		execSync(`mkdir -p "${ocrTmpDir}"`, { timeout: 5000 });

		// Step 1: Convert PDF pages to TIFF images using Ghostscript
		// -dTextAlphaBits=4 and -dGraphicsAlphaBits=4 for antialiasing
		// -r300 for 300 DPI (good balance of speed vs accuracy)
		execSync(
			`gs -dNOPAUSE -dBATCH -sDEVICE=tiff24nc -r300 ` +
				`-dTextAlphaBits=4 -dGraphicsAlphaBits=4 ` +
				`-sOutputFile="${tiffPrefix}-%d.tif" "${pdfPath}" 2>/dev/null`,
			{ timeout: 120000, encoding: "utf-8" },
		);

		// Step 2: Run tesseract on each page image
		const { readdirSync } = require("node:fs");
		const tiffFiles = readdirSync(ocrTmpDir)
			.filter((f: string) => f.endsWith(".tif"))
			.sort();

		if (tiffFiles.length === 0) {
			return "";
		}

		const pageTexts: string[] = [];
		for (const tiffFile of tiffFiles) {
			const tiffPath = join(ocrTmpDir, tiffFile);
			const textOutPath = tiffPath.replace(/\.tif$/, "");

			try {
				// Tesseract outputs to textOutPath.txt automatically
				execSync(
					`tesseract "${tiffPath}" "${textOutPath}" --oem 1 --psm 3 -l eng+rus 2>/dev/null`,
					{
						timeout: 60000,
					},
				);

				const textFilePath = `${textOutPath}.txt`;
				try {
					const pageText = readFileSync(textFilePath, "utf-8").trim();
					if (pageText) {
						pageTexts.push(pageText);
					}
				} catch {
					// skip failed page
				}
			} catch {
				// skip failed page
			}
		}

		return pageTexts.join("\n\n---\n\n");
	} finally {
		// Cleanup OCR temp dir
		try {
			execSync(`rm -rf "${ocrTmpDir}"`, { timeout: 5000 });
		} catch {
			// cleanup best-effort
		}
	}
}

function extractTextFromPdfRaw(buffer: Buffer): string {
	const content = buffer.toString("latin1");
	const texts: string[] = [];

	// Extract text between parentheses in PDF streams (basic approach)
	const regex = /\(([^)]*)\)/g;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(content)) !== null) {
		const text = match[1]!
			.replace(/\\n/g, "\n")
			.replace(/\\r/g, "\r")
			.replace(/\\t/g, "\t")
			.replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
			.replace(/\\(.)/g, "$1");

		if (text.length > 2 && /[a-zA-Z]{3,}/.test(text)) {
			texts.push(text);
		}
	}

	return texts.join(" ").trim();
}
