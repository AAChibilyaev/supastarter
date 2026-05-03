export interface ChunkerOptions {
	maxWords: number;
	minChunkSize: number;
}

export const DEFAULT_CHUNKER_OPTIONS: ChunkerOptions = {
	maxWords: 500,
	minChunkSize: 50,
};

export interface ChunkResult {
	chunks: string[];
	metadata: Array<{
		index: number;
		wordCount: number;
		charCount: number;
	}>;
}

export function chunkText(text: string, options: Partial<ChunkerOptions> = {}): ChunkResult {
	const { maxWords, minChunkSize } = { ...DEFAULT_CHUNKER_OPTIONS, ...options };

	if (!text || text.trim().length === 0) {
		return { chunks: [], metadata: [] };
	}

	// Split into paragraphs first
	const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

	const chunks: string[] = [];
	const metadata: ChunkResult["metadata"] = [];
	let currentChunk: string[] = [];
	let currentWordCount = 0;

	for (const paragraph of paragraphs) {
		const paraWords = countWords(paragraph);

		// If single paragraph exceeds maxWords, split it further
		if (paraWords > maxWords) {
			// Flush current chunk first
			if (currentChunk.length > 0) {
				flushChunk(currentChunk, chunks, metadata);
				currentChunk = [];
				currentWordCount = 0;
			}

			// Split large paragraph into sentence-level chunks
			const sentences = splitSentences(paragraph);
			let sentenceGroup: string[] = [];
			let sentenceWordCount = 0;

			for (const sentence of sentences) {
				const swc = countWords(sentence);
				if (sentenceWordCount + swc > maxWords && sentenceGroup.length > 0) {
					const chunkText = sentenceGroup.join(" ");
					chunks.push(chunkText);
					metadata.push({
						index: metadata.length,
						wordCount: sentenceWordCount,
						charCount: chunkText.length,
					});
					sentenceGroup = [];
					sentenceWordCount = 0;
				}
				sentenceGroup.push(sentence);
				sentenceWordCount += swc;
			}

			if (sentenceGroup.length > 0) {
				const chunkText = sentenceGroup.join(" ");
				chunks.push(chunkText);
				metadata.push({
					index: metadata.length,
					wordCount: sentenceWordCount,
					charCount: chunkText.length,
				});
			}

			continue;
		}

		// Normal paragraph: add to current chunk
		if (currentWordCount + paraWords > maxWords && currentChunk.length > 0) {
			flushChunk(currentChunk, chunks, metadata);
			currentChunk = [];
			currentWordCount = 0;
		}

		currentChunk.push(paragraph);
		currentWordCount += paraWords;
	}

	// Flush remaining
	if (currentChunk.length > 0) {
		flushChunk(currentChunk, chunks, metadata);
	}

	// Filter out chunks below minChunkSize
	const filteredChunks = chunks.filter((c, i) => {
		if (countWords(c) < minChunkSize && chunks.length > 1) {
			// Merge with previous or next chunk
			return false;
		}
		return true;
	});
	const filteredMetadata = metadata.filter((_, i) => {
		if (countWords(chunks[i]!) < minChunkSize && chunks.length > 1) {
			return false;
		}
		return true;
	});

	return { chunks: filteredChunks, metadata: filteredMetadata };
}

function flushChunk(lines: string[], chunks: string[], metadata: ChunkResult["metadata"]): void {
	const text = lines.join("\n\n");
	chunks.push(text);
	metadata.push({
		index: metadata.length,
		wordCount: countWords(text),
		charCount: text.length,
	});
}

function countWords(text: string): number {
	return text.split(/\s+/).filter(Boolean).length;
}

function splitSentences(text: string): string[] {
	// Basic sentence splitting
	const rawSentences = text.match(/[^.!?\n]+[.!?]*/g) ?? [text];
	return rawSentences.map((s) => s.trim()).filter((s) => s.length > 0);
}
