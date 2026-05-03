import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFileSync, unlinkSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { ParsedDocument } from "../types";

/**
 * Parse PPTX (PowerPoint) files by unzipping and extracting text from XML.
 *
 * PPTX is a ZIP archive containing:
 *   - ppt/slides/slideN.xml — slide content with <a:t> text elements
 *   - ppt/presentation.xml — slide order and metadata
 */
export async function parsePptx(
	content: Buffer | string,
	filename: string,
): Promise<ParsedDocument> {
	const buffer = typeof content === "string" ? Buffer.from(content, "utf-8") : content;

	const tmpDir = mkdtempSync(join(tmpdir(), `pptx-${randomUUID()}`));
	const pptxPath = join(tmpdir(), `${randomUUID()}.pptx`);

	try {
		writeFileSync(pptxPath, buffer);

		// Unzip to temp directory
		execSync(`unzip -o "${pptxPath}" -d "${tmpDir}" 2>/dev/null`, {
			timeout: 15000,
		});

		// Find slide files in spine order
		const slides = parseSlidesInOrder(tmpDir);

		// Extract text from each slide
		const slideTexts: string[] = [];
		for (const slidePath of slides) {
			try {
				const xmlContent = readFileSync(slidePath, "utf-8");
				const text = extractTextFromSlide(xmlContent);
				if (text.trim()) {
					slideTexts.push(text.trim());
				}
			} catch {
				// skip unreadable slides
			}
		}

		// Extract title from presentation.xml metadata
		let title = filename.replace(/\.pptx$/i, "");
		try {
			const presXml = readFileSync(join(tmpDir, "ppt", "presentation.xml"), "utf-8");
			const titleMatch = presXml.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/);
			if (titleMatch) title = titleMatch[1]!;
		} catch {
			// fallback to filename
		}

		const contentText = slideTexts.join("\n\n---\n\n");

		return {
			title,
			content: contentText || "Unable to extract text from PPTX",
			mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
			metadata: {
				slideCount: slides.length,
				wordCount: contentText.split(/\s+/).filter(Boolean).length,
			},
		};
	} finally {
		try {
			unlinkSync(pptxPath);
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

/**
 * Determine slide order from ppt/presentation.xml then resolve to file paths.
 */
function parseSlidesInOrder(tmpDir: string): string[] {
	const slidesDir = join(tmpDir, "ppt", "slides");
	const presPath = join(tmpDir, "ppt", "presentation.xml");

	const slideFiles: string[] = [];

	try {
		// Try to get slide order from presentation.xml <p:sldId> elements
		const presXml = readFileSync(presPath, "utf-8");

		// Match <p:sldId ... r:id="rIdN"/> elements in order
		const sldIdRegex = /r:id="([^"]+)"/g;
		const relsPath = join(tmpDir, "ppt", "_rels", "presentation.xml.rels");

		// Build relationship map: rIdN → target path
		const relMap = new Map<string, string>();
		try {
			const relsXml = readFileSync(relsPath, "utf-8");
			const relRegex = /<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/?>/g;
			let relMatch: RegExpExecArray | null;
			while ((relMatch = relRegex.exec(relsXml)) !== null) {
				relMap.set(relMatch[1]!, relMatch[2]!);
			}
		} catch {
			// fallback to filesystem order
		}

		let match: RegExpExecArray | null;
		while ((match = sldIdRegex.exec(presXml)) !== null) {
			const rid = match[1]!;
			const target = relMap.get(rid);
			if (target) {
				// Resolve relative path from ppt/ directory
				const resolved = join(tmpDir, "ppt", target);
				slideFiles.push(resolved);
			}
		}
	} catch {
		// Fallback: alphabetical order
	}

	// Fallback to filesystem order if presentation.xml parsing failed
	if (slideFiles.length === 0) {
		try {
			const { readdirSync } = require("node:fs");
			const files = readdirSync(slidesDir)
				.filter((f: string) => f.match(/^slide\d+\.xml$/))
				.sort();
			for (const f of files) {
				slideFiles.push(join(slidesDir, f));
			}
		} catch {
			// no slides found
		}
	}

	return slideFiles;
}

/**
 * Extract text content from a PowerPoint slide XML.
 * Text is stored in <a:t> elements (DrawingML text body).
 */
function extractTextFromSlide(xml: string): string {
	const texts: string[] = [];

	// Extract text from <a:t> elements
	const tRegex = /<a:t[^>]*>([^<]*)<\/a:t>/g;
	let match: RegExpExecArray | null;

	while ((match = tRegex.exec(xml)) !== null) {
		const text = match[1]!.trim();
		if (text) {
			texts.push(text);
		}
	}

	// Detect paragraph breaks: </a:p> or <a:br/>
	// Insert newlines between paragraphs for readability
	const paragraphs: string[] = [];
	const paraRegex = /<a:p>([\s\S]*?)<\/a:p>/g;
	let paraMatch: RegExpExecArray | null;

	while ((paraMatch = paraRegex.exec(xml)) !== null) {
		const paraContent = paraMatch[1]!;
		const tRegex2 = /<a:t[^>]*>([^<]*)<\/a:t>/g;
		const paraParts: string[] = [];
		let tMatch: RegExpExecArray | null;

		while ((tMatch = tRegex2.exec(paraContent)) !== null) {
			const text = tMatch[1]!.trim();
			if (text) {
				paraParts.push(text);
			}
		}

		if (paraParts.length > 0) {
			paragraphs.push(paraParts.join(" "));
		}
	}

	return paragraphs.join("\n\n");
}
