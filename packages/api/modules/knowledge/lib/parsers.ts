import {
	detectFileType,
	processFile,
	SUPPORTED_MIME_TYPES,
	parseVideoMoments,
} from "@repo/document-processor";
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
 *
 * Video files get enhanced parsing with scene detection and per-moment
 * transcripts, embedding timestamp markers in the text for search.
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

	// For video files, use enhanced scene-detection parsing with per-moment transcripts
	if (fileType === "video") {
		try {
			const videoMoments = await parseVideoMoments(buffer, input.fileName);

			if (videoMoments.moments.length > 0) {
				// Build a transcript with embedded timecode markers per moment
				const transcriptParts: string[] = [];
				for (const moment of videoMoments.moments) {
					if (moment.transcript.trim()) {
						transcriptParts.push(`[${moment.timecode}] ${moment.transcript.trim()}`);
					}
				}

				const text = transcriptParts.join("\n\n");

				logger.info(
					{
						momentCount: videoMoments.moments.length,
						transcribedMoments: videoMoments.metadata.transcribedMoments,
						durationSeconds: videoMoments.durationSeconds,
					},
					`Video parsed into ${videoMoments.moments.length} moments`,
				);

				return {
					title: videoMoments.title,
					mimeType: videoMoments.mimeType,
					text,
					metadata: {
						...videoMoments.metadata,
						durationSeconds: videoMoments.durationSeconds,
						momentCount: videoMoments.moments.length,
						videoMoments: videoMoments.moments.map((m) => ({
							momentIndex: m.momentIndex,
							startTime: m.startTime,
							endTime: m.endTime,
							timecode: m.timecode,
							durationSeconds: m.durationSeconds,
						})),
					},
				};
			}
		} catch (err) {
			logger.warn(
				{ err },
				"Video moment parsing failed, falling back to standard video parser",
			);
		}
		// Fall through to standard video parsing
	}

	// Standard parsing for all other file types (and video fallback)
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
