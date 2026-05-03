import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFileSync, unlinkSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { ParsedDocument } from "../types";

export async function parseDocx(
	content: Buffer | string,
	filename: string,
): Promise<ParsedDocument> {
	const buffer = typeof content === "string" ? Buffer.from(content, "utf-8") : content;

	const tmpDir = mkdtempSync(join(tmpdir(), `docx-${randomUUID()}`));
	const docxPath = join(tmpdir(), `${randomUUID()}.docx`);

	try {
		writeFileSync(docxPath, buffer);

		execSync(`unzip -o "${docxPath}" -d "${tmpDir}" 2>/dev/null`, {
			timeout: 15000,
		});

		const documentXml = join(tmpDir, "word", "document.xml");
		let xmlContent: string;
		try {
			xmlContent = readFileSync(documentXml, "utf-8");
		} catch {
			// Try alternate path
			const altPath = join(tmpDir, "word/document.xml");
			xmlContent = readFileSync(altPath, "utf-8");
		}

		// Extract text from XML (between <w:t> tags)
		const textMatches = xmlContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
		const paragraphs: string[] = [];
		let currentParagraph: string[] = [];

		for (const match of textMatches ?? []) {
			const text = match.replace(/<[^>]+>/g, "");
			currentParagraph.push(text);

			// Check if paragraph break exists
			if (
				xmlContent.indexOf(`</w:p>`, xmlContent.indexOf(match)) <
				xmlContent.indexOf(`<w:t`, xmlContent.indexOf(match) + 1)
			) {
				paragraphs.push(currentParagraph.join(""));
				currentParagraph = [];
			}
		}

		// Flush remaining
		if (currentParagraph.length > 0) {
			paragraphs.push(currentParagraph.join(""));
		}

		const contentText = paragraphs
			.map((p) => p.replace(/\s+/g, " ").trim())
			.filter(Boolean)
			.join("\n\n");

		return {
			title: filename.replace(/\.docx$/i, ""),
			content: contentText || "Unable to extract text from DOCX",
			mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			metadata: {
				paragraphCount: paragraphs.filter((p) => p.trim()).length,
				wordCount: contentText.split(/\s+/).filter(Boolean).length,
			},
		};
	} finally {
		try {
			unlinkSync(docxPath);
		} catch {
			// cleanup best-effort
		}
		try {
			rmSync(tmpDir, { recursive: true, force: true });
		} catch {
			// cleanup best-effort
		}
	}
}
