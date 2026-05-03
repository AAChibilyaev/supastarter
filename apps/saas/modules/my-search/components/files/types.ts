/**
 * File entry from the My Search (personal search) API.
 * Mirrors the shape returned by orpc.mySearch.listFiles.
 */
export interface MySearchFileEntry {
	id: string;
	filename: string;
	originalFilename: string;
	mimeType: string;
	fileType: string;
	fileSize: number;
	wordCount: number;
	uploadedAt: string;
	sourceUrl?: string;
}

export type MySearchFileType =
	| "pdf"
	| "docx"
	| "txt"
	| "csv"
	| "json"
	| "md"
	| "html"
	| "url"
	| "image"
	| "other";

export function inferFileType(entry: MySearchFileEntry): MySearchFileType {
	const mt = entry.mimeType.toLowerCase();
	const ft = entry.fileType.toLowerCase();
	const ext = entry.filename.split(".").pop()?.toLowerCase() ?? "";

	if (ext === "pdf" || mt.includes("pdf")) return "pdf";
	if (ext === "docx" || mt.includes("word")) return "docx";
	if (ext === "csv" || mt.includes("csv")) return "csv";
	if (ext === "json") return "json";
	if (ext === "md") return "md";
	if (ext === "html" || ext === "htm" || mt.includes("html")) return "html";
	if (mt.includes("image") || /\.(png|jpg|jpeg|gif|webp|svg|avif)$/.test(ext)) return "image";
	if (entry.sourceUrl || ft === "url") return "url";
	return "txt";
}

export function getFileStatusColor(
	status: "indexed" | "processing" | "failed",
): "success" | "warning" | "error" {
	switch (status) {
		case "indexed":
			return "success";
		case "processing":
			return "warning";
		case "failed":
			return "error";
	}
}
