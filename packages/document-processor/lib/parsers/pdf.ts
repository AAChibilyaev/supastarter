import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { ParsedDocument } from "../types";

export async function parsePdf(
	content: Buffer | string,
	filename: string,
): Promise<ParsedDocument> {
	const buffer = typeof content === "string" ? Buffer.from(content, "utf-8") : content;

	let text = "";
	let pageCount = 0;

	try {
		const tmpPath = join(tmpdir(), `${randomUUID()}.pdf`);
		writeFileSync(tmpPath, buffer);
		try {
			const result = execSync(`pdftotext "${tmpPath}" - 2>/dev/null`, {
				encoding: "utf-8",
				timeout: 30000,
			});
			text = result.trim();

			// Count pages
			const pageCountResult = execSync(`pdfinfo "${tmpPath}" 2>/dev/null | grep Pages | awk '{print $2}'`, {
				encoding: "utf-8",
				timeout: 10000,
			});
			pageCount = parseInt(pageCountResult.trim(), 10) || 0;
		} finally {
			try {
				unlinkSync(tmpPath);
			} catch {
				// cleanup best-effort
			}
		}
	} catch {
		// Fallback: raw text extraction from PDF binary
		text = extractTextFromPdfRaw(buffer);
	}

	return {
		title: filename.replace(/\.pdf$/i, ""),
		content: text || "Unable to extract text from PDF",
		mimeType: "application/pdf",
		metadata: {
			pageCount,
			wordCount: text.split(/\s+/).filter(Boolean).length,
		},
	};
}

function extractTextFromPdfRaw(buffer: Buffer): string {
	const content = buffer.toString("latin1");
	const texts: string[] = [];

	// Extract text between parentheses in PDF streams (basic approach)
	const regex = /\(([^)]*)\)/g;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(content)) !== null) {
		const text = match[1]
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
