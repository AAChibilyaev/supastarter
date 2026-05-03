import type { ParsedDocument } from "../types";

export async function parseCsv(
	content: Buffer | string,
	filename: string,
): Promise<ParsedDocument> {
	const text = typeof content === "string" ? content : content.toString("utf-8");
	const lines = text.split(/\r?\n/).filter((l) => l.trim());

	if (lines.length === 0) {
		return {
			title: filename.replace(/\.csv$/i, ""),
			content: "",
			mimeType: "text/csv",
			metadata: { rows: 0, columns: 0 },
		};
	}

	const headers = parseCsvLine(lines[0]);
	const rows = lines.slice(1).map((line) => parseCsvLine(line));

	const contentLines: string[] = [];
	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		const rowObj: Record<string, string> = {};
		for (let j = 0; j < headers.length; j++) {
			rowObj[headers[j] ?? `col_${j}`] = row[j] ?? "";
		}
		contentLines.push(`Row ${i + 1}: ${JSON.stringify(rowObj)}`);
	}

	return {
		title: filename.replace(/\.csv$/i, ""),
		content: contentLines.join("\n"),
		mimeType: "text/csv",
		metadata: {
			rows: rows.length,
			columns: headers.length,
			columnNames: headers,
		},
	};
}

function parseCsvLine(line: string): string[] {
	const result: string[] = [];
	let current = "";
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		if (char === '"') {
			if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
				current += '"';
				i++;
			} else {
				inQuotes = !inQuotes;
			}
		} else if (char === "," && !inQuotes) {
			result.push(current.trim());
			current = "";
		} else {
			current += char;
		}
	}
	result.push(current.trim());
	return result;
}
