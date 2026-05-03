import { logger } from "@repo/logs";

import type { ChunkMetadata, ChunkResult, ChunkStrategy, ChunkerOptions } from "./types";

export { type ChunkerOptions } from "./types";

export const DEFAULT_CHUNKER_OPTIONS: ChunkerOptions = {
	strategy: "fixed",
	maxWords: 500,
	minChunkSize: 50,
	maxChunkSize: 1500,
	overlapWords: 25,
};

export interface ChunkTextResult {
	chunks: string[];
	metadata: ChunkMetadata[];
}

/**
 * Main entry: chunk text using the configured strategy.
 */
export function chunkText(text: string, options: Partial<ChunkerOptions> = {}): ChunkTextResult {
	const opts = { ...DEFAULT_CHUNKER_OPTIONS, ...options };

	if (!text || text.trim().length === 0) {
		return { chunks: [], metadata: [] };
	}

	switch (opts.strategy) {
		case "semantic":
			return chunkSemantic(text, opts);
		case "markdown":
			return chunkMarkdown(text, opts);
		case "code":
			return chunkCode(text, opts);
		case "fixed":
		default:
			return chunkFixed(text, opts);
	}
}

// ─── Fixed (paragraph-aware) ───────────────────────────────────

function chunkFixed(text: string, opts: ChunkerOptions): ChunkTextResult {
	const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

	const allChunks: string[] = [];
	const allMetadata: ChunkMetadata[] = [];
	let currentChunk: string[] = [];
	let currentWordCount = 0;

	for (const paragraph of paragraphs) {
		const paraWords = countWords(paragraph);

		if (paraWords > opts.maxWords) {
			flushChunk(currentChunk, allChunks, allMetadata);
			currentChunk = [];
			currentWordCount = 0;

			// Split large paragraph into sentence-level chunks
			const sentences = splitSentences(paragraph);
			let sentenceGroup: string[] = [];
			let sentenceWordCount = 0;

			for (const sentence of sentences) {
				const swc = countWords(sentence);
				if (sentenceWordCount + swc > opts.maxWords && sentenceGroup.length > 0) {
					const chunkText = sentenceGroup.join(" ");
					allChunks.push(chunkText);
					allMetadata.push({
						index: allMetadata.length,
						text: chunkText,
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
				allChunks.push(chunkText);
				allMetadata.push({
					index: allMetadata.length,
					text: chunkText,
					wordCount: sentenceWordCount,
					charCount: chunkText.length,
				});
			}

			continue;
		}

		if (currentWordCount + paraWords > opts.maxWords && currentChunk.length > 0) {
			flushChunk(currentChunk, allChunks, allMetadata);
			currentChunk = [];
			currentWordCount = 0;
		}

		currentChunk.push(paragraph);
		currentWordCount += paraWords;
	}

	if (currentChunk.length > 0) {
		flushChunk(currentChunk, allChunks, allMetadata);
	}

	return filterByMinSize(allChunks, allMetadata, opts.minChunkSize);
}

// ─── Semantic (embedding-based) ────────────────────────────────

function chunkSemantic(text: string, opts: ChunkerOptions): ChunkTextResult {
	// Semantic chunking: split by topic boundaries using sentence-level analysis
	// Falls back to fixed chunking with overlap for coherence
	const sentences = splitSentences(text);

	if (sentences.length <= 3) {
		// Too few sentences — just use fixed
		return chunkFixed(text, { ...opts, strategy: "fixed" });
	}

	const chunks: string[] = [];
	const metadata: ChunkMetadata[] = [];
	let currentGroup: string[] = [];
	let currentWordCount = 0;

	for (let i = 0; i < sentences.length; i++) {
		const sentence = sentences[i]!;
		const swc = countWords(sentence);

		// Check for semantic boundary markers
		if (currentGroup.length > 0 && isSemanticBoundary(sentence, sentences[i - 1] ?? "")) {
			// Topic shift detected — flush current chunk
			const chunkText = currentGroup.join(" ");
			chunks.push(chunkText);
			metadata.push({
				index: metadata.length,
				text: chunkText,
				wordCount: currentWordCount,
				charCount: chunkText.length,
			});

			// Apply overlap: keep last 1-2 sentences for context continuity
			const overlapSentences = getOverlap(currentGroup, opts.overlapWords);
			currentGroup = overlapSentences;
			currentWordCount = overlapSentences.reduce((sum, s) => sum + countWords(s), 0);

			currentGroup.push(sentence);
			currentWordCount += swc;
			continue;
		}

		// Check word count limit
		if (currentWordCount + swc > opts.maxWords && currentGroup.length > 0) {
			const chunkText = currentGroup.join(" ");
			chunks.push(chunkText);
			metadata.push({
				index: metadata.length,
				text: chunkText,
				wordCount: currentWordCount,
				charCount: chunkText.length,
			});

			// Apply overlap
			const overlapSentences = getOverlap(currentGroup, opts.overlapWords);
			currentGroup = overlapSentences;
			currentWordCount = overlapSentences.reduce((sum, s) => sum + countWords(s), 0);
		}

		currentGroup.push(sentence);
		currentWordCount += swc;
	}

	// Flush remaining
	if (currentGroup.length > 0) {
		const chunkText = currentGroup.join(" ");
		chunks.push(chunkText);
		metadata.push({
			index: metadata.length,
			text: chunkText,
			wordCount: currentWordCount,
			charCount: chunkText.length,
		});
	}

	return filterByMinSize(chunks, metadata, opts.minChunkSize);
}

/** Detect topic transitions using heuristic markers */
function isSemanticBoundary(current: string, previous: string): boolean {
	// Heading-like patterns
	if (/^#{1,6}\s/.test(current.trim())) return true;
	if (/^[A-Z][A-Z\s]{3,}$/.test(current.trim())) return true;

	// Transitional phrases
	if (
		/\b(however|therefore|meanwhile|in conclusion|firstly|secondly|finally|in addition|moreover|furthermore|consequently|nevertheless|on the other hand|in contrast|specifically|for example|as a result)\b/i.test(
			current,
		)
	) {
		return true;
	}

	// Numbered section start
	if (/^\d+[\.\)]\s/.test(current.trim())) return true;

	// Whitespace gap indicator (previous ended with paragraph break)
	if (previous.endsWith("\n") || previous.endsWith("  ")) return true;

	return false;
}

/** Get last N words worth of sentences for overlap */
function getOverlap(sentences: string[], overlapWords: number): string[] {
	if (overlapWords <= 0 || sentences.length <= 1) return [];

	const reversed = [...sentences].reverse();
	const result: string[] = [];
	let wordCount = 0;

	for (const sentence of reversed) {
		if (wordCount + countWords(sentence) > overlapWords && result.length > 0) break;
		result.unshift(sentence);
		wordCount += countWords(sentence);
	}

	return result;
}

// ─── Markdown-aware ───────────────────────────────────────────

function chunkMarkdown(text: string, opts: ChunkerOptions): ChunkTextResult {
	// Split by markdown headers while preserving structure
	const lines = text.split("\n");

	const sections: Array<{ heading: string; content: string[]; level: number }> = [];
	let currentHeading = "";
	let currentLevel = 0;
	let currentContent: string[] = [];

	for (const line of lines) {
		const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
		if (headingMatch) {
			if (currentContent.length > 0 || currentHeading) {
				sections.push({
					heading: currentHeading,
					content: currentContent,
					level: currentLevel,
				});
			}
			currentHeading = headingMatch[2]!.trim();
			currentLevel = headingMatch[1]!.length;
			currentContent = [];
		} else {
			currentContent.push(line);
		}
	}

	if (currentContent.length > 0 || currentHeading) {
		sections.push({
			heading: currentHeading,
			content: currentContent,
			level: currentLevel,
		});
	}

	// Now chunk sections, respecting structure
	const chunks: string[] = [];
	const metadata: ChunkMetadata[] = [];
	let currentChunk: string[] = [];
	let currentWordCount = 0;

	for (const section of sections) {
		const sectionText = section.content.join("\n").trim();
		if (!sectionText) {
			// Still add the heading if meaningful
			if (section.heading) {
				currentChunk.push(section.heading);
				currentWordCount += countWords(section.heading);
			}
			continue;
		}

		const sectionWords = countWords(sectionText);
		const headerPrefix = section.heading ? `## ${section.heading}\n\n` : "";

		if (currentWordCount + sectionWords > opts.maxWords && currentChunk.length > 0) {
			flushChunk(currentChunk, chunks, metadata);
			currentChunk = [];
			currentWordCount = 0;
		}

		// If a single section is huge, split it
		if (sectionWords > opts.maxWords) {
			flushChunk(currentChunk, chunks, metadata);
			currentChunk = [];
			currentWordCount = 0;

			// Sub-chunk within the section
			const subChunks = chunkFixed(sectionText, opts);
			for (let i = 0; i < subChunks.chunks.length; i++) {
				const subText = headerPrefix + subChunks.chunks[i]!;
				chunks.push(subText);
				metadata.push({
					index: metadata.length,
					text: subText,
					wordCount: countWords(subText),
					charCount: subText.length,
				});
			}
			continue;
		}

		currentChunk.push(headerPrefix + sectionText);
		currentWordCount += countWords(headerPrefix) + sectionWords;
	}

	if (currentChunk.length > 0) {
		flushChunk(currentChunk, chunks, metadata);
	}

	return filterByMinSize(chunks, metadata, opts.minChunkSize);
}

// ─── Code-aware ────────────────────────────────────────────────

function chunkCode(text: string, opts: ChunkerOptions): ChunkTextResult {
	// Code-aware chunking: split by function/class boundaries first,
	// then by logical blocks, preserving code structure
	const chunks: string[] = [];
	const metadata: ChunkMetadata[] = [];

	// First pass: extract code blocks and text separately
	const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	const segments: Array<{ type: "code" | "text"; content: string; language?: string }> = [];

	while ((match = codeBlockRegex.exec(text)) !== null) {
		// Text before code block
		if (match.index > lastIndex) {
			const textSegment = text.slice(lastIndex, match.index).trim();
			if (textSegment) {
				segments.push({ type: "text", content: textSegment });
			}
		}

		segments.push({
			type: "code",
			content: match[2]!,
			language: match[1] || "unknown",
		});

		lastIndex = codeBlockRegex.lastIndex;
	}

	// Remaining text after last code block
	if (lastIndex < text.length) {
		const remaining = text.slice(lastIndex).trim();
		if (remaining) {
			segments.push({ type: "text", content: remaining });
		}
	}

	// If no code blocks found, treat as all text
	if (segments.length === 0) {
		return chunkFixed(text, { ...opts, strategy: "fixed" });
	}

	let currentChunk: string[] = [];
	let currentWordCount = 0;

	for (const segment of segments) {
		let segmentText: string;
		let segmentWords: number;

		if (segment.type === "code") {
			// Format code block with language annotation
			const codeFence = segment.language
				? `\`\`\`${segment.language}\n${segment.content}\n\`\`\``
				: `\`\`\`\n${segment.content}\n\`\`\``;

			// For code, check if it can be split by function boundaries
			if (segment.content.length > opts.maxChunkSize * 4) {
				// Large code block — split by function/class
				const subChunks = splitCodeByFunction(segment.content, segment.language || "");
				for (const sub of subChunks) {
					const formatted = segment.language
						? `\`\`\`${segment.language}\n${sub}\n\`\`\``
						: `\`\`\`\n${sub}\n\`\`\``;
					const subWords = countWords(formatted);

					if (currentWordCount + subWords > opts.maxWords && currentChunk.length > 0) {
						flushChunk(currentChunk, chunks, metadata);
						currentChunk = [];
						currentWordCount = 0;
					}

					currentChunk.push(formatted);
					currentWordCount += subWords;
				}
				continue;
			}

			segmentText = codeFence;
			segmentWords = countWords(segmentText);
		} else {
			segmentText = segment.content;
			segmentWords = countWords(segmentText);
		}

		if (currentWordCount + segmentWords > opts.maxWords && currentChunk.length > 0) {
			flushChunk(currentChunk, chunks, metadata);
			currentChunk = [];
			currentWordCount = 0;
		}

		currentChunk.push(segmentText);
		currentWordCount += segmentWords;
	}

	if (currentChunk.length > 0) {
		flushChunk(currentChunk, chunks, metadata);
	}

	return filterByMinSize(chunks, metadata, opts.minChunkSize);
}

/** Split a code block by function/class/method boundaries */
function splitCodeByFunction(code: string, language: string): string[] {
	const functions: string[] = [];

	// Language-specific function/class patterns
	let patterns: RegExp[];

	switch (language.toLowerCase()) {
		case "typescript":
		case "javascript":
		case "ts":
		case "js":
		case "tsx":
		case "jsx":
			patterns = [
				/^(export\s+)?(async\s+)?function\s+\w+/m,
				/^(export\s+)?(abstract\s+)?class\s+\w+/m,
				/^(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s+)?\(/m,
				/^(export\s+)?interface\s+\w+/m,
				/^(export\s+)?type\s+\w+/m,
				/^(export\s+)?enum\s+\w+/m,
			];
			break;
		case "python":
		case "py":
			patterns = [/^def\s+\w+/m, /^class\s+\w+/m, /^async\s+def\s+\w+/m, /@\w+/m];
			break;
		case "go":
			patterns = [/^func\s+\w+/m, /^type\s+\w+\s+struct/m, /^type\s+\w+\s+interface/m];
			break;
		case "rust":
		case "rs":
			patterns = [
				/^fn\s+\w+/m,
				/^struct\s+\w+/m,
				/^enum\s+\w+/m,
				/^impl\s+\w+/m,
				/^trait\s+\w+/m,
			];
			break;
		default:
			patterns = [/^(function|def|func|fn|class)\s+\w+/m];
	}

	// Try to split by function boundaries
	const lines = code.split("\n");
	let currentFunction: string[] = [];
	let indent = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!;

		// Check if line starts a new function/class
		const isFunctionStart = patterns.some((p) => p.test(line));

		if (isFunctionStart && currentFunction.length > 0) {
			functions.push(currentFunction.join("\n"));
			currentFunction = [];
			indent = 0;
		}

		currentFunction.push(line);

		// Track indentation for body detection
		if (isFunctionStart) {
			const trimmed = line.trimLeft();
			indent = line.length - trimmed.length;
		}
	}

	if (currentFunction.length > 0) {
		functions.push(currentFunction.join("\n"));
	}

	// If splitting didn't produce multiple functions, return whole block
	return functions.length > 1 ? functions : [code];
}

// ─── Utilities ─────────────────────────────────────────────────

function flushChunk(lines: string[], chunks: string[], metadata: ChunkMetadata[]): void {
	const text = lines.join("\n\n");
	chunks.push(text);
	metadata.push({
		index: metadata.length,
		text,
		wordCount: countWords(text),
		charCount: text.length,
	});
}

function countWords(text: string): number {
	return text.split(/\s+/).filter(Boolean).length;
}

function splitSentences(text: string): string[] {
	const rawSentences = text.match(/[^.!?\n]+[.!?]*/g) ?? [text];
	return rawSentences.map((s) => s.trim()).filter((s) => s.length > 0);
}

function filterByMinSize(
	chunks: string[],
	metadata: ChunkMetadata[],
	minChunkSize: number,
): ChunkTextResult {
	if (chunks.length <= 1) return { chunks, metadata };

	const filteredChunks: string[] = [];
	const filteredMetadata: ChunkMetadata[] = [];

	for (let i = 0; i < chunks.length; i++) {
		const wc = countWords(chunks[i]!);
		if (wc >= minChunkSize) {
			filteredChunks.push(chunks[i]!);
			filteredMetadata.push(metadata[i]!);
		} else if (filteredChunks.length > 0) {
			// Merge into previous chunk
			const merged = filteredChunks[filteredChunks.length - 1]! + "\n\n" + chunks[i]!;
			filteredChunks[filteredChunks.length - 1] = merged;
			filteredMetadata[filteredMetadata.length - 1] = {
				...filteredMetadata[filteredMetadata.length - 1]!,
				text: merged,
				wordCount: countWords(merged),
				charCount: merged.length,
			};
		} else {
			// First chunk below min size — keep it anyway
			filteredChunks.push(chunks[i]!);
			filteredMetadata.push(metadata[i]!);
		}
	}

	return { chunks: filteredChunks, metadata: filteredMetadata };
}
