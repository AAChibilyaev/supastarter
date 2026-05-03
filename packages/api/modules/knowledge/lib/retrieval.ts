import { db } from "@repo/database";

import { cosineSimilarity, embedTextLocally } from "./chunking";
import { expandGraphNeighborhood } from "./graphrag";
import { computeHypeScore, getHypoQuestionEmbeddings, hasHypeQuestions } from "./hype";

interface RankedChunk {
	id: string;
	documentId: string;
	documentTitle: string;
	text: string;
	score: number;
}

function keywordScore(query: string, text: string): number {
	const normalizedQuery = query.toLowerCase();
	const normalizedText = text.toLowerCase();
	if (!normalizedQuery.trim()) return 0;
	const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
	if (tokens.length === 0) return 0;
	let hits = 0;
	for (const token of tokens) {
		if (normalizedText.includes(token)) hits += 1;
	}
	return hits / tokens.length;
}

export async function retrieveKnowledge(input: {
	knowledgeSpaceId: string;
	query: string;
	limit?: number;
}) {
	const limit = input.limit ?? 10;
	const queryEmbedding = embedTextLocally(input.query);

	const candidateChunks = await db.knowledgeChunk.findMany({
		where: { knowledgeSpaceId: input.knowledgeSpaceId },
		include: {
			document: {
				select: {
					id: true,
					title: true,
				},
			},
		},
		take: 250,
		orderBy: { updatedAt: "desc" },
	});

	const ranked: RankedChunk[] = candidateChunks
		.map((chunk) => {
			const embedding = Array.isArray(chunk.embedding) ? (chunk.embedding as number[]) : [];
			const semantic = embedding.length > 0 ? cosineSimilarity(queryEmbedding, embedding) : 0;
			const lexical = keywordScore(input.query, chunk.text);
			const originalScore = semantic * 0.65 + lexical * 0.35;

			let score = originalScore;

			const meta = chunk.metadata as Record<string, unknown>;
			if (hasHypeQuestions(meta)) {
				const hypoEmbeddings = getHypoQuestionEmbeddings(meta);
				const hypeScore = computeHypeScore(queryEmbedding, lexical, {
					embedding,
					hypoQuestionEmbeddings: hypoEmbeddings,
				});
				score = Math.max(originalScore, hypeScore);
			}

			return {
				id: chunk.id,
				documentId: chunk.document.id,
				documentTitle: chunk.document.title,
				text: chunk.text,
				score,
			};
		})
		.sort((a, b) => b.score - a.score)
		.slice(0, limit);

	const seedNodes = await db.graphNode.findMany({
		where: {
			knowledgeSpaceId: input.knowledgeSpaceId,
			canonicalName: {
				in: input.query
					.toLowerCase()
					.split(/\s+/)
					.filter((word) => word.length > 2),
			},
		},
		take: 10,
	});

	const graphEdges = await expandGraphNeighborhood({
		knowledgeSpaceId: input.knowledgeSpaceId,
		seedNodeIds: seedNodes.map((node) => node.id),
		limit: 60,
	});

	return {
		chunks: ranked,
		graphEdges,
	};
}
