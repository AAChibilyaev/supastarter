/**
 * Near-duplicate detection for AACsearch NLP pipeline.
 * Uses Jaccard similarity with shingling for efficient deduplication.
 * Pure TypeScript — no external dependencies.
 */

export interface DedupOptions {
	/** Similarity threshold (0-1). Documents above this are considered duplicates. */
	threshold: number;
	/** Shingle size (number of tokens per shingle) */
	shingleSize: number;
	/** Whether to remove the lower-scoring duplicate */
	removeLower: boolean;
}

const DEFAULT_OPTIONS: DedupOptions = {
	threshold: 0.85,
	shingleSize: 3,
	removeLower: true,
};

/**
 * Generate shingles (n-grams) from a token array.
 */
export function shingle(tokens: string[], size: number): Set<string> {
	const shingles = new Set<string>();

	for (let i = 0; i <= tokens.length - size; i++) {
		shingles.add(tokens.slice(i, i + size).join(" "));
	}

	return shingles;
}

/**
 * Calculate Jaccard similarity between two sets.
 */
export function jaccardSimilarity<T>(a: Set<T>, b: Set<T>): number {
	const intersection = new Set<T>();
	for (const item of a) {
		if (b.has(item)) intersection.add(item);
	}

	const union = new Set([...a, ...b]);

	if (union.size === 0) return 0;
	return intersection.size / union.size;
}

export interface DedupDocument {
	id: string;
	text: string;
	score: number;
	/**
	 * Optional pre-tokenized version.
	 * If not set, text is split on whitespace.
	 */
	tokens?: string[];
}

export interface DedupResult {
	kept: DedupDocument[];
	removed: string[]; // IDs of removed duplicates
}

/**
 * Remove near-duplicate documents from a result set.
 */
export function deduplicate(
	documents: DedupDocument[],
	options?: Partial<DedupOptions>,
): DedupResult {
	if (documents.length <= 1) {
		return { kept: documents, removed: [] };
	}

	const opts = { ...DEFAULT_OPTIONS, ...options };

	// Sort by score descending (best first)
	const sorted = [...documents].sort((a, b) => b.score - a.score);
	const kept: DedupDocument[] = [];
	const removed: string[] = [];

	// Pre-compute shingles
	const shingleMap = new Map<string, Set<string>>();
	for (const doc of sorted) {
		const tokens = doc.tokens || doc.text.split(/\s+/);
		shingleMap.set(doc.id, shingle(tokens, opts.shingleSize));
	}

	for (const doc of sorted) {
		let isDuplicate = false;
		const docShingles = shingleMap.get(doc.id)!;

		for (const keptDoc of kept) {
			const keptShingles = shingleMap.get(keptDoc.id)!;
			const similarity = jaccardSimilarity(docShingles, keptShingles);

			if (similarity >= opts.threshold) {
				isDuplicate = true;
				break;
			}
		}

		if (isDuplicate) {
			removed.push(doc.id);
		} else {
			kept.push(doc);
		}
	}

	return { kept, removed };
}

/**
 * MinHash-based deduplication for large document sets.
 * Much faster than pairwise comparison for >100 documents.
 */
export class MinHashDedup {
	private shingleSize: number;
	private numHashes: number;
	private threshold: number;

	constructor(options?: Partial<DedupOptions & { numHashes: number }>) {
		this.shingleSize = options?.shingleSize ?? 3;
		this.numHashes =
			options && "numHashes" in options ? (options as { numHashes: number }).numHashes : 100;
		this.threshold = options?.threshold ?? 0.85;
	}

	/**
	 * Generate a MinHash signature for a document.
	 */
	private signature(tokens: string[]): number[] {
		const shingles = this.shingleTokens(tokens);
		const sig: number[] = new Array(this.numHashes).fill(Infinity);

		for (const shingle of shingles) {
			const hash = this.hashString(shingle);
			for (let i = 0; i < this.numHashes; i++) {
				const permutedHash = this.permute(hash, i);
				if (permutedHash < sig[i]!) {
					sig[i] = permutedHash;
				}
			}
		}

		return sig;
	}

	private shingleTokens(tokens: string[]): string[] {
		const result: string[] = [];
		for (let i = 0; i <= tokens.length - this.shingleSize; i++) {
			result.push(tokens.slice(i, i + this.shingleSize).join(" "));
		}
		return result;
	}

	private hashString(str: string): number {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash |= 0; // Convert to 32-bit int
		}
		return Math.abs(hash);
	}

	private permute(hash: number, seed: number): number {
		// Simple linear permutation: (a * hash + b) mod large prime
		const a = 2 * seed + 1;
		const b = 3 * seed + 7;
		return (a * hash + b) % 2147483647;
	}

	/**
	 * Estimate Jaccard similarity between two signatures.
	 */
	signatureSimilarity(a: number[], b: number[]): number {
		let matches = 0;
		for (let i = 0; i < this.numHashes; i++) {
			if (a[i] === b[i]) matches++;
		}
		return matches / this.numHashes;
	}

	/**
	 * Deduplicate using MinHash (scales to large document sets).
	 */
	deduplicate(documents: DedupDocument[]): DedupResult {
		if (documents.length <= 1) {
			return { kept: documents, removed: [] };
		}

		const sorted = [...documents].sort((a, b) => b.score - a.score);
		const kept: DedupDocument[] = [];
		const removed: string[] = [];

		// Pre-compute signatures
		const sigMap = new Map<string, number[]>();
		for (const doc of sorted) {
			const tokens = doc.tokens || doc.text.split(/\s+/);
			sigMap.set(doc.id, this.signature(tokens));
		}

		for (const doc of sorted) {
			let isDuplicate = false;
			const docSig = sigMap.get(doc.id)!;

			for (const keptDoc of kept) {
				const keptSig = sigMap.get(keptDoc.id)!;
				const similarity = this.signatureSimilarity(docSig, keptSig);
				if (similarity >= this.threshold) {
					isDuplicate = true;
					break;
				}
			}

			if (isDuplicate) {
				removed.push(doc.id);
			} else {
				kept.push(doc);
			}
		}

		return { kept, removed };
	}
}
