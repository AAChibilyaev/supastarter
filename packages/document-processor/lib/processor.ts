import { randomUUID } from "node:crypto";

import { logger } from "@repo/logs";

import type { ChunkerOptions } from "./chunker";
import { chunkText } from "./chunker";
import { parseAudio } from "./parsers/audio";
import { parseCsv } from "./parsers/csv";
import { parseDocx } from "./parsers/docx";
import { parseEpub } from "./parsers/epub";
import { parseImage } from "./parsers/image";
import { parseJson } from "./parsers/json";
import { parseMd } from "./parsers/md";
import { parsePdf } from "./parsers/pdf";
import { parsePptx } from "./parsers/pptx";
import { parseTxt } from "./parsers/txt";
import { parseUrl } from "./parsers/url";
import { parseVideo } from "./parsers/video";
import { parseXlsx } from "./parsers/xlsx";
import type { FileType, ParsedDocument } from "./types";
import { detectFileType, SUPPORTED_MIME_TYPES } from "./types";

type ParserFn = (content: Buffer | string, filename: string) => Promise<ParsedDocument>;

const parserRegistry: Record<string, ParserFn> = {
	pdf: parsePdf,
	docx: parseDocx,
	xlsx: parseXlsx,
	pptx: parsePptx,
	csv: parseCsv,
	json: parseJson,
	md: parseMd,
	txt: parseTxt,
	epub: parseEpub,
	image: parseImage,
	audio: parseAudio,
	video: parseVideo,
};

export interface ProcessFileInput {
	filename: string;
	content: Buffer | string;
	mimeType?: string;
}

export interface ProcessFileResult {
	document: ParsedDocument;
	chunks: string[];
	fileType: FileType | null;
}

export interface ProcessUrlInput {
	url: string;
}

export interface ProcessUrlResult {
	document: ParsedDocument;
	chunks: string[];
}

/**
 * Parse and chunk a file.
 */
export async function processFile(
	input: ProcessFileInput,
	chunkerOptions?: Partial<ChunkerOptions>,
): Promise<ProcessFileResult> {
	const { filename, content, mimeType } = input;
	const fileType = detectFileType(filename, mimeType);

	if (!fileType) {
		throw new Error(
			`Unsupported file type: ${filename}${mimeType ? ` (${mimeType})` : ""}. ` +
				`Supported: ${Object.keys(parserRegistry).join(", ")}`,
		);
	}

	const parser = parserRegistry[fileType];
	if (!parser) {
		throw new Error(`No parser registered for file type: ${fileType}`);
	}

	logger.info(`Parsing file: ${filename} (${fileType})`);
	const document = await parser(content, filename);

	logger.info(`Chunking: ${filename}`);
	const { chunks } = chunkText(document.content, chunkerOptions);

	return { document, chunks, fileType };
}

/**
 * Fetch a URL, parse the HTML, and chunk the text.
 */
export async function processUrl(
	input: ProcessUrlInput,
	chunkerOptions?: Partial<ChunkerOptions>,
): Promise<ProcessUrlResult> {
	const { url } = input;

	logger.info(`Fetching URL: ${url}`);
	const document = await parseUrl(url);

	logger.info(`Chunking URL content: ${url}`);
	const { chunks } = chunkText(document.content, chunkerOptions);

	return { document, chunks };
}

export { detectFileType, SUPPORTED_MIME_TYPES } from "./types";
export { chunkText } from "./chunker";
export type { ChunkerOptions } from "./chunker";
