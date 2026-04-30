import {
	createGraphEdge,
	listGraphEdgesForNodes,
	type Prisma,
	upsertGraphNode,
} from "@repo/database";

interface ExtractedEntity {
	name: string;
	type: string;
}

const ENTITY_REGEX = /\b[A-Z][a-zA-Z0-9_-]{2,}\b/g;

function extractEntities(text: string): ExtractedEntity[] {
	const unique = new Set<string>();
	for (const match of text.matchAll(ENTITY_REGEX)) {
		unique.add(match[0]);
	}
	return Array.from(unique).map((name) => ({
		name,
		type: "keyword",
	}));
}

export async function buildGraphFromChunks(input: {
	knowledgeSpaceId: string;
	chunks: Array<{ id: string; text: string }>;
}) {
	const createdNodeIds: string[] = [];

	for (const chunk of input.chunks) {
		const entities = extractEntities(chunk.text).slice(0, 12);
		if (entities.length < 2) continue;

		const nodes = await Promise.all(
			entities.map((entity) =>
				upsertGraphNode({
					knowledgeSpaceId: input.knowledgeSpaceId,
					canonicalName: entity.name.toLowerCase(),
					nodeType: entity.type,
					metadata: { source: "entity-extractor" } as Prisma.InputJsonValue,
				}),
			),
		);

		nodes.forEach((node) => createdNodeIds.push(node.id));

		for (let i = 0; i < nodes.length - 1; i += 1) {
			await createGraphEdge({
				knowledgeSpaceId: input.knowledgeSpaceId,
				fromNodeId: nodes[i].id,
				toNodeId: nodes[i + 1].id,
				relationType: "co_occurs",
				evidenceChunkId: chunk.id,
				metadata: {
					source: "chunk-co-occurrence",
				},
			});
		}
	}

	return {
		createdNodeIds: Array.from(new Set(createdNodeIds)),
	};
}

export async function expandGraphNeighborhood(input: {
	knowledgeSpaceId: string;
	seedNodeIds: string[];
	limit?: number;
}) {
	if (input.seedNodeIds.length === 0) {
		return [];
	}

	return listGraphEdgesForNodes({
		knowledgeSpaceId: input.knowledgeSpaceId,
		nodeIds: input.seedNodeIds,
		limit: input.limit ?? 60,
	});
}
