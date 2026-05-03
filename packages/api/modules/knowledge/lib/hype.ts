import { generateText, textModel } from "@repo/ai";

import { cosineSimilarity, embedTextLocally } from "./chunking";

const DEFAULT_QUESTION_COUNT = 3;

const HYPE_SYSTEM_PROMPT =
	"You are a search quality engineer. Generate concise hypothetical search queries that this text passage could answer.";

const HYPE_USER_PROMPT_TEMPLATE = `Given the following text passage, generate {count} hypothetical search queries that this passage could answer. Return one query per line, no numbering, no bullet points.

Passage:
{chunkText}`;

export async function generateHypotheticalQuestions(
	chunkText: string,
	count: number = DEFAULT_QUESTION_COUNT,
): Promise<string[]> {
	const userPrompt = HYPE_USER_PROMPT_TEMPLATE.replace("{count}", String(count)).replace(
		"{chunkText}",
		chunkText,
	);

	const result = await generateText({
		model: textModel,
		system: HYPE_SYSTEM_PROMPT,
		prompt: userPrompt,
	});

	const questions = result.text
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.slice(0, count);

	return questions;
}

export function computeHypeScore(
	queryEmbedding: number[],
	queryKeywordScore: number,
	chunk: {
		embedding: number[];
		hypoQuestionEmbeddings?: number[][];
	},
): number {
	const chunkSemantic = cosineSimilarity(queryEmbedding, chunk.embedding);

	if (!chunk.hypoQuestionEmbeddings || chunk.hypoQuestionEmbeddings.length === 0) {
		return chunkSemantic * 0.65 + queryKeywordScore * 0.35;
	}

	let hypoMaxSimilarity = 0;
	for (const hypoEmbedding of chunk.hypoQuestionEmbeddings) {
		const sim = cosineSimilarity(queryEmbedding, hypoEmbedding);
		if (sim > hypoMaxSimilarity) {
			hypoMaxSimilarity = sim;
		}
	}

	return chunkSemantic * 0.4 + queryKeywordScore * 0.2 + hypoMaxSimilarity * 0.4;
}

export function hasHypeQuestions(metadata: Record<string, unknown>): boolean {
	const questions = metadata?.hypotheticalQuestions;
	return Array.isArray(questions) && questions.length > 0 && typeof questions[0] === "string";
}

export function getHypoQuestionEmbeddings(metadata: Record<string, unknown>): number[][] {
	const questions = metadata?.hypotheticalQuestions as string[] | undefined;
	if (!Array.isArray(questions) || questions.length === 0) {
		return [];
	}
	return embedHypoQuestions(questions);
}

export function embedHypoQuestions(questions: string[]): number[][] {
	return questions.map((q) => embedTextLocally(q));
}
