/**
 * HyPE (Hypothetical Prompt Embeddings) — Question Generation.
 *
 * For each document chunk, generates hypothetical questions that the chunk
 * could answer, then combines them with the original text for enhanced
 * embedding. This technique yields ~3.4x retrieval accuracy improvement
 * by bridging the vocabulary gap between user queries and document content.
 *
 * Usage:
 *   const questions = await generateHypotheticalQuestions(chunkText, 5);
 *   const enhancedText = buildHyPEInput(chunkText, questions);
 *   const embedding = await generateEmbedding(enhancedText);
 */

import { generateText, textModel } from "@repo/ai";
import { logger } from "@repo/logs";

/**
 * System prompt for hypothetical question generation.
 * Instructs the LLM to generate diverse, realistic search queries
 * that the given text passage could answer.
 */
const HYPE_QUESTIONS_SYSTEM_PROMPT = `You are a search quality improvement system.
Your task is to generate hypothetical search queries that a user might type
when looking for the information contained in the given text passage.

Rules:
1. Generate questions a real user would actually type into a search bar
2. Cover different aspects: factual queries, how-to questions, comparison queries
3. Use natural, conversational language — not formal or academic
4. Each question must be answerable from the provided text
5. Questions should be diverse — avoid repeating the same concept
6. Keep each question concise (under 20 words)
7. Return ONLY the questions, one per line, no numbering, no prefixes`;

/**
 * Generate hypothetical questions for a document chunk using an LLM.
 *
 * @param text - The document text/chunk to generate questions for
 * @param count - Number of questions to generate (default: 5)
 * @param model - Optional model override (default: gpt-4o-mini)
 * @returns Array of generated questions, or empty array on failure
 */
export async function generateHypotheticalQuestions(
	text: string,
	count: number = 5,
): Promise<string[]> {
	if (!text || text.trim().length < 20) {
		return [];
	}

	const userPrompt = `Generate ${count} hypothetical search queries for this text:\n\n${text.slice(0, 4000)}`;

	try {
		const result = await generateText({
			model: textModel,
			messages: [
				{ role: "system", content: HYPE_QUESTIONS_SYSTEM_PROMPT },
				{ role: "user", content: userPrompt },
			],
			maxOutputTokens: 512,
		});

		const questions = result.text
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.length > 10 && line.endsWith("?"))
			.slice(0, count);

		if (questions.length === 0) {
			logger.warn({ textLength: text.length }, "HyPE: generated no valid questions");
			return [];
		}

		logger.info(
			{ textLength: text.length, questionCount: questions.length },
			"HyPE: generated hypothetical questions",
		);

		return questions;
	} catch (err) {
		logger.error({ err, textLength: text.length }, "HyPE: question generation failed");
		return [];
	}
}

/**
 * Build a combined embedding input from original text + generated questions.
 *
 * The enhanced text combines the original content with hypothetical questions
 * in a format optimized for semantic embedding. Questions are appended with
 * a separator to help the embedding model distinguish content from queries.
 *
 * @param text - Original document text
 * @param questions - Generated hypothetical questions
 * @param maxLength - Maximum total length (default: 8000 tokens worth ~32000 chars)
 * @returns Combined text for embedding
 */
export function buildHyPEInput(
	text: string,
	questions: string[],
	maxLength: number = 32000,
): string {
	if (questions.length === 0) {
		return text.slice(0, maxLength);
	}

	const questionBlock = questions.map((q) => `Q: ${q}`).join("\n");
	const combined = `${text.slice(0, maxLength - 500)}\n\n--- Hypothetical search queries for this content ---\n${questionBlock}`;

	return combined.length > maxLength ? combined.slice(0, maxLength) : combined;
}
