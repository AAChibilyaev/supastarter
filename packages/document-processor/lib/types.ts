export interface ParsedDocument {
	title: string;
	content: string;
	mimeType: string;
	metadata: Record<string, unknown>;
}

export interface ChunkResult {
	chunks: string[];
	chunkCount: number;
}

export type FileType = "pdf" | "docx" | "csv" | "json" | "md" | "txt" | "epub";

export const SUPPORTED_MIME_TYPES: Record<string, FileType> = {
	"application/pdf": "pdf",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
	"text/csv": "csv",
	"application/json": "json",
	"text/markdown": "md",
	"text/plain": "txt",
	"application/epub+zip": "epub",
};

export function detectFileType(filename: string, mimeType?: string): FileType | null {
	if (mimeType && mimeType in SUPPORTED_MIME_TYPES) {
		return SUPPORTED_MIME_TYPES[mimeType];
	}

	const ext = filename.split(".").pop()?.toLowerCase();
	const mimeMap: Record<string, FileType> = {
		pdf: "pdf",
		docx: "docx",
		csv: "csv",
		json: "json",
		md: "md",
		txt: "txt",
		epub: "epub",
	};

	return mimeMap[ext ?? ""] ?? null;
}

// Exported for use in URL content parsing
export interface ParsedUrlResult extends ParsedDocument {
	sourceUrl: string;
}
