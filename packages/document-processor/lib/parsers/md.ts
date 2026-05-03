import type { ParsedDocument } from "../types";

export async function parseMd(content: Buffer | string, filename: string): Promise<ParsedDocument> {
	const text = typeof content === "string" ? content : content.toString("utf-8");

	// Strip markdown formatting for plain text extraction
	const plainText = text
		// Remove code blocks
		.replace(/```[\s\S]*?```/g, "")
		// Remove inline code
		.replace(/`([^`]+)`/g, "$1")
		// Remove images
		.replace(/!\[([^\]]*)\]\([^)]+\)/g, "")
		// Remove links, keep text
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
		// Remove heading markers
		.replace(/^#{1,6}\s+/gm, "")
		// Remove bold/italic
		.replace(/(\*{1,3}|_{1,3})(.*?)\1/g, "$2")
		// Remove horizontal rules
		.replace(/^---+\s*$/gm, "")
		// Remove blockquote markers
		.replace(/^>\s+/gm, "")
		// Remove list markers
		.replace(/^[*-]\s+/gm, "")
		.replace(/^\d+\.\s+/gm, "")
		.trim();

	// Extract title from first # heading
	const titleMatch = text.match(/^#\s+(.+)$/m);
	const title = titleMatch?.[1] ?? filename.replace(/\.md$/i, "");

	// Count headings
	const headings = text.match(/^#{1,6}\s+.+$/gm) ?? [];

	return {
		title,
		content: plainText,
		mimeType: "text/markdown",
		metadata: {
			wordCount: plainText.split(/\s+/).filter(Boolean).length,
			headingCount: headings.length,
			hasCodeBlocks: text.includes("```"),
		},
	};
}
