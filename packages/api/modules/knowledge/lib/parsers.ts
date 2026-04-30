import { ORPCError } from "@orpc/client";

export interface ParsedFileContent {
	title: string;
	mimeType: string;
	text: string;
	metadata: Record<string, unknown>;
}

function decodeBase64Payload(contentBase64: string): Buffer {
	try {
		return Buffer.from(contentBase64, "base64");
	} catch {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid base64 payload" });
	}
}

function toTitle(fileName: string): string {
	const clean = fileName.trim();
	if (!clean) return "Untitled";
	return clean.replace(/\.[^.]+$/, "");
}

function extractTextFromXml(raw: string): string {
	// A lightweight XML text extractor to keep ingestion deterministic.
	return raw
		.replace(/<\?xml[\s\S]*?\?>/g, " ")
		.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, " $1 ")
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export async function parseIncomingFile(input: {
	fileName: string;
	mimeType: string;
	contentBase64: string;
}): Promise<ParsedFileContent> {
	const title = toTitle(input.fileName);
	const buffer = decodeBase64Payload(input.contentBase64);
	const mimeType = input.mimeType.toLowerCase();

	if (mimeType.includes("markdown") || input.fileName.toLowerCase().endsWith(".md")) {
		return {
			title,
			mimeType: "text/markdown",
			text: buffer.toString("utf-8"),
			metadata: { parser: "markdown" },
		};
	}

	if (mimeType.includes("xml") || input.fileName.toLowerCase().endsWith(".xml")) {
		const xmlText = buffer.toString("utf-8");
		return {
			title,
			mimeType: "application/xml",
			text: extractTextFromXml(xmlText),
			metadata: { parser: "xml" },
		};
	}

	if (mimeType.includes("pdf") || input.fileName.toLowerCase().endsWith(".pdf")) {
		try {
			const pdfParseModule = await import("pdf-parse");
			const pdfParse = (
				pdfParseModule as unknown as {
					default: (buffer: Buffer) => Promise<{ text?: string; numpages?: number }>;
				}
			).default;
			const parsed = await pdfParse(buffer);
			return {
				title,
				mimeType: "application/pdf",
				text: parsed.text?.trim() ?? "",
				metadata: {
					parser: "pdf-parse",
					pages: parsed.numpages,
				},
			};
		} catch {
			throw new ORPCError("BAD_REQUEST", {
				message: "PDF parsing is unavailable. Install pdf-parse and retry.",
			});
		}
	}

	throw new ORPCError("BAD_REQUEST", {
		message: "Unsupported format. Allowed: md, xml, pdf",
	});
}
