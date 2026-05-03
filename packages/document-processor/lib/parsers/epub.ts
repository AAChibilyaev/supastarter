import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFileSync, unlinkSync, readFileSync, mkdtempSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { ParsedDocument } from "../types";

export async function parseEpub(
	content: Buffer | string,
	filename: string,
): Promise<ParsedDocument> {
	const buffer = typeof content === "string" ? Buffer.from(content, "utf-8") : content;

	const tmpDir = mkdtempSync(join(tmpdir(), `epub-${randomUUID()}`));
	const epubPath = join(tmpdir(), `${randomUUID()}.epub`);

	try {
		writeFileSync(epubPath, buffer);

		execSync(`unzip -o "${epubPath}" -d "${tmpDir}" 2>/dev/null`, {
			timeout: 15000,
		});

		// Find all XHTML/HTML files
		const chapters: string[] = [];
		let title = filename.replace(/\.epub$/i, "");

		// Try to find container.xml → content.opf for metadata and spine
		const containerPath = join(tmpDir, "META-INF", "container.xml");
		let opfPath: string | null = null;

		try {
			const containerXml = readFileSync(containerPath, "utf-8");
			const opfMatch = containerXml.match(/full-path="([^"]+)"/);
			if (opfMatch) {
				opfPath = join(tmpDir, opfMatch[1]!);
			}
		} catch {
			// Try common OPF locations
			const opfCandidates = ["content.opf", "OEBPS/content.opf", "OPS/content.opf"];
			for (const candidate of opfCandidates) {
				try {
					const candidatePath = join(tmpDir, candidate);
					readFileSync(candidatePath, "utf-8");
					opfPath = candidatePath;
					break;
				} catch {
					// continue
				}
			}
		}

		if (opfPath) {
			const opfContent = readFileSync(opfPath, "utf-8");
			const titleMatch = opfContent.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/);
			if (titleMatch) title = titleMatch[1]!;

			// Extract manifest items and find those in the spine
			const itemMatches = opfContent.matchAll(
				/<item[^>]*href="([^"]+)"[^>]*media-type="([^"]+)"[^>]*\/?>/g,
			);
			const spineMatches = opfContent.matchAll(/<itemref[^>]*idref="([^"]+)"[^>]*\/?>/g);

			const opfDir = opfPath.substring(0, opfPath.lastIndexOf("/"));
			const itemMap = new Map<string, string>();

			for (const item of itemMatches) {
				const [_, href, mediaType] = item;
				if (href && (mediaType?.includes("xhtml") || mediaType?.includes("html"))) {
					// Resolve relative to OPF directory
					const resolvedPath = join(opfDir, href);
					itemMap.set(_!, resolvedPath);
				}
			}

			// Process in spine order
			for (const spineMatch of spineMatches) {
				const idref = spineMatch[1];
				const chapterPath = itemMap.get(idref!);
				if (chapterPath) {
					try {
						const htmlContent = readFileSync(chapterPath, "utf-8");
						const text = extractTextFromHtml(htmlContent);
						if (text.trim()) chapters.push(text.trim());
					} catch {
						// skip unreadable chapters
					}
				}
			}
		}

		// Fallback: find all XHTML/HTML files recursively
		if (chapters.length === 0) {
			const files = findAllFiles(tmpDir, /\.x?html?$/i);
			for (const file of files) {
				try {
					const htmlContent = readFileSync(file, "utf-8");
					if (htmlContent.includes("<html") || htmlContent.includes("<body")) {
						const text = extractTextFromHtml(htmlContent);
						if (text.trim()) chapters.push(text.trim());
					}
				} catch {
					// skip unreadable
				}
			}
		}

		const contentText = chapters.join("\n\n---\n\n");

		return {
			title,
			content: contentText || "Unable to extract text from EPUB",
			mimeType: "application/epub+zip",
			metadata: {
				chapterCount: chapters.length,
				wordCount: contentText.split(/\s+/).filter(Boolean).length,
			},
		};
	} finally {
		try {
			unlinkSync(epubPath);
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

function extractTextFromHtml(html: string): string {
	return html
		.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
		.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
		.replace(/\s+/g, " ")
		.trim();
}

function findAllFiles(dir: string, pattern: RegExp): string[] {
	const results: string[] = [];
	try {
		const entries = readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = join(dir, entry.name);
			if (entry.isDirectory()) {
				results.push(...findAllFiles(fullPath, pattern));
			} else if (pattern.test(entry.name)) {
				results.push(fullPath);
			}
		}
	} catch {
		// skip unreadable directories
	}
	return results;
}
