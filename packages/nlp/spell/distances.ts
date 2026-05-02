/**
 * String distance algorithms for spell correction and fuzzy matching.
 * Implements 9 algorithms: Levenshtein, Damerau-Levenshtein, Hamming,
 * Jaro-Winkler, Sørensen-Dice, Jaccard, Tversky, Smith-Waterman, Needleman-Wunsch.
 */

export type DistanceType =
	| "levenshtein"
	| "damerau-levenshtein"
	| "hamming"
	| "jaro-winkler"
	| "sorensen-dice"
	| "jaccard"
	| "tversky"
	| "smith-waterman"
	| "needleman-wunsch";

export interface DistanceResult {
	word: string;
	distance: number;
	algorithm: DistanceType;
	similarity: number; // 0.0 to 1.0
}

type DistanceFn = (a: string, b: string) => number;

const DISTANCE_ALGORITHMS: Record<DistanceType, { fn: DistanceFn; name: string }> = {
	levenshtein: { fn: levenshteinDistance, name: "Levenshtein" },
	"damerau-levenshtein": { fn: damerauLevenshteinDistance, name: "Damerau-Levenshtein" },
	hamming: { fn: hammingDistance, name: "Hamming" },
	"jaro-winkler": { fn: jaroWinklerDistance, name: "Jaro-Winkler" },
	"sorensen-dice": { fn: sorensenDiceCoefficient, name: "Sørensen-Dice" },
	jaccard: { fn: jaccardDistance, name: "Jaccard" },
	tversky: { fn: tverskyDistance, name: "Tversky" },
	"smith-waterman": { fn: smithWatermanDistance, name: "Smith-Waterman" },
	"needleman-wunsch": { fn: needlemanWunschDistance, name: "Needleman-Wunsch" },
};

/**
 * Compute distance using a specific algorithm.
 * Returns 0 for identical strings, higher values for more different strings.
 */
export function computeDistance(a: string, b: string, algorithm: DistanceType): number {
	return DISTANCE_ALGORITHMS[algorithm].fn(a, b);
}

/**
 * Compute similarity (1.0 = identical, 0.0 = completely different) for a distance algorithm.
 */
export function computeSimilarity(a: string, b: string, algorithm: DistanceType): number {
	const fn = DISTANCE_ALGORITHMS[algorithm].fn;
	const distance = fn(a, b);

	// Normalize to 0..1
	const maxLen = Math.max(a.length, b.length);
	if (maxLen === 0) return 1.0;

	switch (algorithm) {
		case "sorensen-dice":
		case "jaccard":
			// These already return 0..1 as similarity
			return 1 - distance;
		case "jaro-winkler":
			// Jaro-Winkler returns distance, not similarity
			return Math.max(0, 1 - distance);
		default:
			return Math.max(0, 1 - distance / maxLen);
	}
}

/**
 * Compute all distances between two strings.
 */
export function computeAllDistances(a: string, b: string): DistanceResult[] {
	const results: DistanceResult[] = [];
	const maxLen = Math.max(a.length, b.length);

	for (const [type, algo] of Object.entries(DISTANCE_ALGORITHMS)) {
		const distance = algo.fn(a, b);
		let similarity: number;

		if (maxLen === 0) {
			similarity = 1.0;
		} else {
			switch (type as DistanceType) {
				case "sorensen-dice":
				case "jaccard":
					similarity = 1 - distance;
					break;
				default:
					similarity = Math.max(0, 1 - distance / maxLen);
			}
		}

		results.push({
			word: b,
			distance,
			algorithm: type as DistanceType,
			similarity,
		});
	}

	return results.sort((a, b) => a.distance - b.distance);
}

// ─── 1. LEVENSHTEIN DISTANCE ──────────────────────────────────────────────────

export function levenshteinDistance(a: string, b: string): number {
	const an = a.length;
	const bn = b.length;
	if (an === 0) return bn;
	if (bn === 0) return an;

	// Use single-row optimization for memory efficiency
	let prevRow: number[] = new Array(bn + 1);
	let currRow: number[] = new Array(bn + 1);

	for (let j = 0; j <= bn; j++) prevRow[j] = j;

	for (let i = 1; i <= an; i++) {
		currRow[0] = i;
		for (let j = 1; j <= bn; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			currRow[j] = Math.min(
				prevRow[j] + 1, // deletion
				currRow[j - 1] + 1, // insertion
				prevRow[j - 1] + cost, // substitution
			);
		}
		[prevRow, currRow] = [currRow, prevRow];
	}

	return prevRow[bn];
}

// ─── 2. DAMERAU-LEVENSHTEIN DISTANCE ─────────────────────────────────────────

export function damerauLevenshteinDistance(a: string, b: string): number {
	const an = a.length;
	const bn = b.length;
	if (an === 0) return bn;
	if (bn === 0) return an;

	const matrix: number[][] = Array.from({ length: an + 1 }, () => new Array(bn + 1).fill(0));

	for (let i = 0; i <= an; i++) matrix[i][0] = i;
	for (let j = 0; j <= bn; j++) matrix[0][j] = j;

	for (let i = 1; i <= an; i++) {
		for (let j = 1; j <= bn; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			matrix[i][j] = Math.min(
				matrix[i - 1][j] + 1, // deletion
				matrix[i][j - 1] + 1, // insertion
				matrix[i - 1][j - 1] + cost, // substitution
			);

			// Transposition
			if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
				matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + cost);
			}
		}
	}

	return matrix[an][bn];
}

// ─── 3. HAMMING DISTANCE ──────────────────────────────────────────────────────

export function hammingDistance(a: string, b: string): number {
	if (a.length !== b.length) {
		return Math.max(a.length, b.length); // Not equal length → max distance
	}

	let distance = 0;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) distance++;
	}
	return distance;
}

// ─── 4. JARO-WINKLER DISTANCE ─────────────────────────────────────────────────

export function jaroWinklerDistance(a: string, b: string): number {
	const an = a.length;
	const bn = b.length;
	if (an === 0 && bn === 0) return 0;
	if (an === 0 || bn === 0) return 1;

	const matchDistance = Math.max(0, Math.floor(Math.max(an, bn) / 2) - 1);

	const aMatches: boolean[] = new Array(an).fill(false);
	const bMatches: boolean[] = new Array(bn).fill(false);

	let matches = 0;
	let transpositions = 0;

	for (let i = 0; i < an; i++) {
		const start = Math.max(0, i - matchDistance);
		const end = Math.min(i + matchDistance + 1, bn);

		for (let j = start; j < end; j++) {
			if (bMatches[j]) continue;
			if (a[i] !== b[j]) continue;
			aMatches[i] = true;
			bMatches[j] = true;
			matches++;
			break;
		}
	}

	if (matches === 0) return 1;

	let k = 0;
	for (let i = 0; i < an; i++) {
		if (!aMatches[i]) continue;
		while (!bMatches[k]) k++;
		if (a[i] !== b[k]) transpositions++;
		k++;
	}

	const jaro = (matches / an + matches / bn + (matches - transpositions / 2) / matches) / 3;

	// Winkler modification: prefix bonus
	const prefix = Math.min(
		4,
		(() => {
			let p = 0;
			while (p < Math.min(an, bn) && a[p] === b[p]) p++;
			return p;
		})(),
	);

	return 1 - (jaro + prefix * 0.1 * (1 - jaro));
}

// ─── 5. SØRENSEN-DICE COEFFICIENT ─────────────────────────────────────────────

export function sorensenDiceCoefficient(a: string, b: string): number {
	const bigramsA = getBigrams(a);
	const bigramsB = getBigrams(b);

	if (bigramsA.size === 0 && bigramsB.size === 0) return 0;

	let intersection = 0;
	for (const bigram of bigramsA) {
		if (bigramsB.has(bigram)) intersection++;
	}

	// Returns distance (0 = same, 1 = different)
	return 1 - (2 * intersection) / (bigramsA.size + bigramsB.size);
}

function getBigrams(s: string): Set<string> {
	const bigrams = new Set<string>();
	for (let i = 0; i < s.length - 1; i++) {
		bigrams.add(s.slice(i, i + 2));
	}
	return bigrams;
}

// ─── 6. JACCARD DISTANCE ──────────────────────────────────────────────────────

export function jaccardDistance(a: string, b: string): number {
	const bigramsA = getBigrams(a);
	const bigramsB = getBigrams(b);

	if (bigramsA.size === 0 && bigramsB.size === 0) return 0;

	const union = new Set([...bigramsA, ...bigramsB]);
	let intersection = 0;
	for (const bigram of bigramsA) {
		if (bigramsB.has(bigram)) intersection++;
	}

	return 1 - intersection / union.size;
}

// ─── 7. TVERSKY INDEX ─────────────────────────────────────────────────────────

export function tverskyDistance(a: string, b: string, alpha = 0.5, beta = 0.5): number {
	const bigramsA = getBigrams(a);
	const bigramsB = getBigrams(b);

	if (bigramsA.size === 0 && bigramsB.size === 0) return 0;

	// |A ∩ B|
	let intersection = 0;
	for (const bigram of bigramsA) {
		if (bigramsB.has(bigram)) intersection++;
	}

	// |A \ B|
	let aMinusB = 0;
	for (const bigram of bigramsA) {
		if (!bigramsB.has(bigram)) aMinusB++;
	}

	// |B \ A|
	let bMinusA = 0;
	for (const bigram of bigramsB) {
		if (!bigramsA.has(bigram)) bMinusA++;
	}

	if (intersection + alpha * aMinusB + beta * bMinusA === 0) return 1;

	// Tversky index = |A∩B| / (|A∩B| + α|A\B| + β|B\A|)
	return 1 - intersection / (intersection + alpha * aMinusB + beta * bMinusA);
}

// ─── 8. SMITH-WATERMAN ALIGNMENT ──────────────────────────────────────────────

const SW_GAP = -1;
const SW_MATCH = 2;
const SW_MISMATCH = -1;

export function smithWatermanDistance(a: string, b: string): number {
	const an = a.length;
	const bn = b.length;
	if (an === 0) return bn;
	if (bn === 0) return an;

	const matrix: number[][] = Array.from({ length: an + 1 }, () => new Array(bn + 1).fill(0));
	let maxScore = 0;

	for (let i = 1; i <= an; i++) {
		for (let j = 1; j <= bn; j++) {
			const score = a[i - 1] === b[j - 1] ? SW_MATCH : SW_MISMATCH;
			matrix[i][j] = Math.max(
				0,
				matrix[i - 1][j - 1] + score, // match/mismatch
				matrix[i - 1][j] + SW_GAP, // gap in b
				matrix[i][j - 1] + SW_GAP, // gap in a
			);
			maxScore = Math.max(maxScore, matrix[i][j]);
		}
	}

	const alignmentLength = Math.max(an, bn);
	const normalizedScore = alignmentLength > 0 ? maxScore / (SW_MATCH * alignmentLength) : 0;

	return 1 - normalizedScore;
}

// ─── 9. NEEDLEMAN-WUNSCH ALIGNMENT ────────────────────────────────────────────

export function needlemanWunschDistance(a: string, b: string): number {
	const an = a.length;
	const bn = b.length;
	if (an === 0) return bn;
	if (bn === 0) return an;

	const matrix: number[][] = Array.from({ length: an + 1 }, () => new Array(bn + 1).fill(0));

	for (let i = 0; i <= an; i++) matrix[i][0] = i * SW_GAP;
	for (let j = 0; j <= bn; j++) matrix[0][j] = j * SW_GAP;

	for (let i = 1; i <= an; i++) {
		for (let j = 1; j <= bn; j++) {
			const score = a[i - 1] === b[j - 1] ? SW_MATCH : SW_MISMATCH;
			matrix[i][j] = Math.max(
				matrix[i - 1][j - 1] + score,
				matrix[i - 1][j] + SW_GAP,
				matrix[i][j - 1] + SW_GAP,
			);
		}
	}

	// The distance is the fraction of the alignment that isn't a perfect match
	const optimalScore = matrix[an][bn];
	const maxPossibleScore = SW_MATCH * Math.max(an, bn);
	const similarity = maxPossibleScore > 0 ? optimalScore / maxPossibleScore : 0;

	return 1 - Math.max(0, similarity);
}

/**
 * Available distance algorithm descriptions.
 */
export const DISTANCE_ALGORITHM_INFO: Record<DistanceType, string> = {
	levenshtein: "Edit distance (insert/delete/replace)",
	"damerau-levenshtein": "Edit distance + transposition",
	hamming: "Equal length only — count differing positions",
	"jaro-winkler": "Prefix bonus for matching early characters",
	"sorensen-dice": "Bigram overlap coefficient (2 * |A∩B| / (|A| + |B|))",
	jaccard: "Intersection/union ratio on bigrams",
	tversky: "Asymmetric similarity with α/β weighting",
	"smith-waterman": "Local sequence alignment (finds best local match)",
	"needleman-wunsch": "Global sequence alignment (full string alignment)",
};
