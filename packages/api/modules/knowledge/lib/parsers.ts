import { detectFileType, processFile, SUPPORTED_MIME_TYPES } from "@repo/document-processor";
import { logger } from "@repo/logs";

export interface ParsedFileContent {
	title: string;
	mimeType: string;
	text: string;
	metadata: Record<string, unknown>;
}

/**
 * Parse an incoming file using the @repo/document-processor pipeline.
 * Supports: pdf, docx, xlsx, pptx, csv, json, md, txt, epub, image, audio, video
 */
export async function parseIncomingFile(input: {
	fileName: string;
	mimeType: string;
	contentBase64: string;
}): Promise<ParsedFileContent> {
	const buffer = Buffer.from(input.contentBase64, "base64");
	const mimeType = input.mimeType.toLowerCase();

	const fileType = detectFileType(input.fileName, mimeType);
	if (!fileType) {
		throw new Error(
			`Unsupported format: ${input.fileName} (${mimeType}). Supported: ${Object.keys(SUPPORTED_MIME_TYPES).join(", ")}`,
		);
	}

	logger.info(`Parsing file via document-processor: ${input.fileName} (${fileType})`);

	const { document } = await processFile({
		filename: input.fileName,
		content: buffer,
		mimeType,
	});

	return {
		title: document.title,
		mimeType: document.mimeType,
		text: document.content,
		metadata: document.metadata,
	};
}
