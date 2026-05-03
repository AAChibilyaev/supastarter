import type { ParsedDocument } from "../types";

export async function parseTxt(
	content: Buffer | string,
	filename: string,
): Promise<ParsedDocument> {
	const text = typeof content === "string" ? content : content.toString("utf-8");
	return {
		title: filename.replace(/\.txt$/i, ""),
		content: text,
		mimeType: "text/plain",
		metadata: {
			wordCount: text.split(/\s+/).filter(Boolean).length,
			charCount: text.length,
		},
	};
}
