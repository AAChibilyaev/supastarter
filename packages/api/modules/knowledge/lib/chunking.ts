export interface TextChunk {
	chunkIndex: number;
	text: string;
	tokenCount: number;
	embedding: number[];
}

const VECTOR_SIZE = 128;

function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s]+/gu, " ")
		.split(/\s+/)
		.filter((token) => token.length > 1);
}

function hashToken(token: string): number {
	let hash = 2166136261;
	for (let i = 0; i < token.length; i += 1) {
		hash ^= token.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return Math.abs(hash);
}

export function embedTextLocally(text: string): number[] {
	const vector = Array.from({ length: VECTOR_SIZE }, () => 0);
	const tokens = tokenize(text);
	if (tokens.length === 0) return vector;

	for (const token of tokens) {
		const idx = hashToken(token) % VECTOR_SIZE;
		vector[idx] += 1;
	}

	const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
	if (norm === 0) return vector;
	return vector.map((value) => value / norm);
}

export function chunkText(text: string, chunkSize = 900, overlap = 180): TextChunk[] {
	const normalized = text.replace(/\s+/g, " ").trim();
	if (!normalized) return [];

	const chunks: TextChunk[] = [];
	let cursor = 0;
	let index = 0;

	while (cursor < normalized.length) {
		const rawSlice = normalized.slice(cursor, cursor + chunkSize);
		const chunkTextValue = rawSlice.trim();
		if (chunkTextValue.length > 0) {
			const tokenCount = tokenize(chunkTextValue).length;
			chunks.push({
				chunkIndex: index,
				text: chunkTextValue,
				tokenCount,
				embedding: embedTextLocally(chunkTextValue),
			});
			index += 1;
		}

		if (cursor + chunkSize >= normalized.length) break;
		cursor += Math.max(1, chunkSize - overlap);
	}

	return chunks;
}

export function cosineSimilarity(a: number[], b: number[]): number {
	if (a.length !== b.length || a.length === 0) return 0;
	let sum = 0;
	for (let i = 0; i < a.length; i += 1) {
		sum += a[i] * b[i];
	}
	return sum;
}
