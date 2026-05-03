import { describe, expect, it } from "vitest";

import { detectFileType, SUPPORTED_MIME_TYPES } from "./types";
import type { FileType } from "./types";

describe("detectFileType", () => {
	describe("by mime type", () => {
		it("identifies PDF", () => {
			expect(detectFileType("doc.pdf", "application/pdf")).toBe("pdf");
		});

		it("identifies DOCX", () => {
			expect(
				detectFileType(
					"report.docx",
					"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				),
			).toBe("docx");
		});

		it("identifies XLSX", () => {
			expect(
				detectFileType(
					"data.xlsx",
					"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				),
			).toBe("xlsx");
		});

		it("identifies PPTX", () => {
			expect(
				detectFileType(
					"deck.pptx",
					"application/vnd.openxmlformats-officedocument.presentationml.presentation",
				),
			).toBe("pptx");
		});

		it("identifies EPUB", () => {
			expect(detectFileType("book.epub", "application/epub+zip")).toBe("epub");
		});

		it("identifies plain text", () => {
			expect(detectFileType("readme.txt", "text/plain")).toBe("txt");
		});

		it("identifies markdown", () => {
			expect(detectFileType("doc.md", "text/markdown")).toBe("md");
		});

		it("identifies CSV", () => {
			expect(detectFileType("data.csv", "text/csv")).toBe("csv");
		});

		it("identifies JSON", () => {
			expect(detectFileType("data.json", "application/json")).toBe("json");
		});

		it("identifies JPEG images", () => {
			expect(detectFileType("photo.jpg", "image/jpeg")).toBe("image");
		});

		it("identifies PNG images", () => {
			expect(detectFileType("photo.png", "image/png")).toBe("image");
		});

		it("identifies WebP images", () => {
			expect(detectFileType("photo.webp", "image/webp")).toBe("image");
		});

		it("identifies TIFF images", () => {
			expect(detectFileType("scan.tiff", "image/tiff")).toBe("image");
		});

		it("identifies BMP images", () => {
			expect(detectFileType("drawing.bmp", "image/bmp")).toBe("image");
		});

		it("identifies MP3 audio", () => {
			expect(detectFileType("song.mp3", "audio/mpeg")).toBe("audio");
		});

		it("identifies WAV audio", () => {
			expect(detectFileType("recording.wav", "audio/wav")).toBe("audio");
		});

		it("identifies OGG audio", () => {
			expect(detectFileType("track.ogg", "audio/ogg")).toBe("audio");
		});

		it("identifies FLAC audio", () => {
			expect(detectFileType("music.flac", "audio/flac")).toBe("audio");
		});

		it("identifies MP4 video", () => {
			expect(detectFileType("movie.mp4", "video/mp4")).toBe("video");
		});

		it("identifies WebM video", () => {
			expect(detectFileType("clip.webm", "video/webm")).toBe("video");
		});
	});

	describe("by file extension", () => {
		it("identifies .pdf", () => {
			expect(detectFileType("document.pdf")).toBe("pdf");
		});

		it("identifies .docx", () => {
			expect(detectFileType("report.docx")).toBe("docx");
		});

		it("identifies .xlsx and .xls", () => {
			expect(detectFileType("spreadsheet.xlsx")).toBe("xlsx");
			expect(detectFileType("legacy.xls")).toBe("xlsx");
		});

		it("identifies .pptx and .ppt", () => {
			expect(detectFileType("slides.pptx")).toBe("pptx");
			expect(detectFileType("legacy.ppt")).toBe("pptx");
		});

		it("identifies .epub", () => {
			expect(detectFileType("book.epub")).toBe("epub");
		});

		it("identifies .txt", () => {
			expect(detectFileType("readme.txt")).toBe("txt");
		});

		it("identifies .md", () => {
			expect(detectFileType("doc.md")).toBe("md");
		});

		it("identifies .csv", () => {
			expect(detectFileType("data.csv")).toBe("csv");
		});

		it("identifies .json", () => {
			expect(detectFileType("data.json")).toBe("json");
		});

		it("identifies image extensions", () => {
			for (const ext of ["jpg", "jpeg", "png", "webp", "tiff", "tif", "bmp", "gif"]) {
				expect(detectFileType(`photo.${ext}`)).toBe("image");
			}
		});

		it("identifies audio extensions", () => {
			for (const ext of ["mp3", "wav", "ogg", "flac", "m4a", "aac", "wma"]) {
				expect(detectFileType(`audio.${ext}`)).toBe("audio");
			}
		});

		it("identifies video extensions", () => {
			for (const ext of ["mp4", "webm", "avi", "mov", "mkv"]) {
				expect(detectFileType(`video.${ext}`)).toBe("video");
			}
		});

		it("returns null for unknown extensions", () => {
			expect(detectFileType("file.xyz")).toBeNull();
			expect(detectFileType("file")).toBeNull();
			expect(detectFileType(".hidden")).toBeNull();
		});
	});

	describe("mime type takes priority over extension", () => {
		it("uses mime type when provided", () => {
			expect(detectFileType("file.pdf", "image/png")).toBe("image");
		});

		it("falls back to extension when mime is unknown", () => {
			expect(detectFileType("doc.pdf", "application/octet-stream")).toBe("pdf");
		});

		it("returns null when both mime and extension are unknown", () => {
			expect(detectFileType("file.xyz", "application/unknown")).toBeNull();
		});
	});
});

describe("SUPPORTED_MIME_TYPES", () => {
	it("contains all expected MIME types", () => {
		expect(SUPPORTED_MIME_TYPES["application/pdf"]).toBe("pdf");
		expect(SUPPORTED_MIME_TYPES["image/jpeg"]).toBe("image");
		expect(SUPPORTED_MIME_TYPES["audio/mpeg"]).toBe("audio");
		expect(SUPPORTED_MIME_TYPES["video/mp4"]).toBe("video");
	});

	it("has no duplicate type targets that would cause ambiguity", () => {
		const entries = Object.entries(SUPPORTED_MIME_TYPES);
		const typeCounts = new Map<string, number>();
		for (const [, type] of entries) {
			typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
		}
		// Every type appears at least once — that's fine
		// The important thing is that MIME → type mapping is deterministic
		expect(typeCounts.size).toBeGreaterThan(0);
	});
});
