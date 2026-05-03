import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFileSync, unlinkSync, readFileSync, mkdtempSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { ParsedDocument } from "../types";

/**
 * Parse XLSX (Excel) files by unzipping and extracting text from XML.
 *
 * XLSX is a ZIP archive containing:
 *   - xl/sharedStrings.xml — shared string table (SI → <t> or <r>→<t>)
 *   - xl/worksheets/sheetN.xml — sheet data
 *   - xl/workbook.xml — workbook metadata (sheet names)
 */
export async function parseXlsx(
	content: Buffer | string,
	filename: string,
): Promise<ParsedDocument> {
	const buffer = typeof content === "string" ? Buffer.from(content, "utf-8") : content;

	const tmpDir = mkdtempSync(join(tmpdir(), `xlsx-${randomUUID()}`));
	const xlsxPath = join(tmpdir(), `${randomUUID()}.xlsx`);

	try {
		writeFileSync(xlsxPath, buffer);

		// Unzip to temp directory
		execSync(`unzip -o "${xlsxPath}" -d "${tmpDir}" 2>/dev/null`, {
			timeout: 15000,
		});

		// Parse shared strings
		const sharedStrings = parseSharedStrings(join(tmpDir, "xl", "sharedStrings.xml"));

		// Find all worksheet files
		const sheetsDir = join(tmpDir, "xl", "worksheets");
		let sheetFiles: string[];
		try {
			sheetFiles = readdirSync(sheetsDir)
				.filter((f) => f.match(/^sheet\d+\.xml$/))
				.sort((a, b) => {
					const numA = parseInt(a.match(/\d+/)?.[0] ?? "0", 10);
					const numB = parseInt(b.match(/\d+/)?.[0] ?? "0", 10);
					return numA - numB;
				})
				.map((f) => join(sheetsDir, f));
		} catch {
			sheetFiles = [];
		}

		// Parse each sheet
		const sheets: string[] = [];
		for (const sheetPath of sheetFiles) {
			try {
				const xmlContent = readFileSync(sheetPath, "utf-8");
				const rows = extractRowsFromSheet(xmlContent, sharedStrings);
				if (rows.length > 0) {
					sheets.push(rows.filter(Boolean).join("\n"));
				}
			} catch {
				// skip unreadable sheets
			}
		}

		// Try to extract workbook title
		let title = filename.replace(/\.(xlsx|xls)$/i, "");
		try {
			const workbookXml = readFileSync(join(tmpDir, "xl", "workbook.xml"), "utf-8");
			const titleMatch = workbookXml.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/);
			if (titleMatch) title = titleMatch[1]!;
		} catch {
			// fallback to filename
		}

		const contentText = sheets.join("\n\n---\n\n");

		return {
			title,
			content: contentText || "Unable to extract text from XLSX",
			mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			metadata: {
				sheetCount: sheets.length,
				rowCount: sheets.reduce((sum, s) => sum + s.split("\n").length, 0),
				wordCount: contentText.split(/\s+/).filter(Boolean).length,
			},
		};
	} finally {
		try {
			unlinkSync(xlsxPath);
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
 * Parse sharedStrings.xml to build an array of string values indexed by their position.
 */
function parseSharedStrings(sharedStringsPath: string): string[] {
	try {
		const xml = readFileSync(sharedStringsPath, "utf-8");
		const strings: string[] = [];

		// Match each <si>...</si> block
		const siRegex = /<si>([\s\S]*?)<\/si>/g;
		let match: RegExpExecArray | null;

		while ((match = siRegex.exec(xml)) !== null) {
			const siContent = match[1]!;

			// Try <t> elements (plain text)
			const tRegex = /<t[^>]*>([^<]*)<\/t>/g;
			const parts: string[] = [];
			let tMatch: RegExpExecArray | null;

			while ((tMatch = tRegex.exec(siContent)) !== null) {
				parts.push(tMatch[1]!);
			}

			strings.push(parts.join(""));
		}

		return strings;
	} catch {
		return [];
	}
}

/**
 * Extract row data from a worksheet XML.
 * Cells containing inline strings (<is><t>) or shared string references (<v>)
 * are resolved against the sharedStrings array.
 */
function extractRowsFromSheet(xml: string, sharedStrings: string[]): string[] {
	const rows: string[] = [];

	// Match each <row>...</row> block
	const rowRegex = /<row[\s\S]*?>([\s\S]*?)<\/row>/g;
	let rowMatch: RegExpExecArray | null;

	while ((rowMatch = rowRegex.exec(xml)) !== null) {
		const rowContent = rowMatch[1]!;
		const cells: string[] = [];

		// Match each cell <c>...</c>
		const cellRegex = /<c[\s\S]*?>([\s\S]*?)<\/c>/g;
		let cellMatch: RegExpExecArray | null;

		while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
			const cellContent = cellMatch[1]!;

			// Determine cell type from <c t="...">
			const cellTag = cellMatch[0]!;

			// Check for shared string (t="s" or t="inlineStr")
			const isSharedString = /t="s"/.test(cellTag);

			// Extract <v> value (for shared strings) or <is><t> (for inline strings)
			let cellText = "";

			if (isSharedString) {
				const vMatch = cellContent.match(/<v>([^<]*)<\/v>/);
				if (vMatch) {
					const idx = parseInt(vMatch[1]!, 10);
					if (!isNaN(idx) && idx < sharedStrings.length) {
						cellText = sharedStrings[idx]!;
					}
				}
			} else {
				// Try <is><t> for inline strings
				const tMatch = cellContent.match(/<t[^>]*>([^<]*)<\/t>/);
				if (tMatch) {
					cellText = tMatch[1]!;
				} else {
					// Try <v> for numeric values
					const vMatch = cellContent.match(/<v>([^<]*)<\/v>/);
					if (vMatch) {
						cellText = vMatch[1]!;
					}
				}
			}

			if (cellText.trim()) {
				cells.push(cellText.trim());
			}
		}

		if (cells.length > 0) {
			rows.push(cells.join("\t"));
		}
	}

	return rows;
}
