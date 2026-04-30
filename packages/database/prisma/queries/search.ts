import { db } from "../client";
import type { Prisma } from "../generated/client";

export interface SearchOwnerScope {
	organizationId?: string;
}

function toOwnerWhere(scope: SearchOwnerScope) {
	return { organizationId: scope.organizationId ?? "" };
}

export async function listSearchIndexes(organizationId: string) {
	return db.searchIndex.findMany({
		where: { organizationId },
		orderBy: { createdAt: "desc" },
		include: {
			_count: {
				select: { apiKeys: true },
			},
		},
	});
}

export async function getSearchIndexBySlug(organizationId: string, slug: string) {
	return db.searchIndex.findUnique({
		where: { organizationId_slug: { organizationId, slug } },
	});
}

export async function listSearchIndexesByOwner(scope: SearchOwnerScope) {
	return db.searchIndex.findMany({
		where: toOwnerWhere(scope),
		orderBy: { createdAt: "desc" },
		include: {
			_count: {
				select: { apiKeys: true },
			},
		},
	});
}

export async function getSearchIndexByOwnerSlug(scope: SearchOwnerScope, slug: string) {
	return db.searchIndex.findFirst({
		where: {
			...toOwnerWhere(scope),
			slug,
		},
	});
}

export async function getSearchIndexById(id: string) {
	return db.searchIndex.findUnique({
		where: { id },
	});
}

export async function createSearchIndex(input: {
	organizationId: string;
	slug: string;
	displayName: string;
	schema: Prisma.InputJsonValue;
}) {
	return db.searchIndex.create({
		data: {
			organizationId: input.organizationId,
			slug: input.slug,
			displayName: input.displayName,
			schema: input.schema,
		},
	});
}

export async function createSearchIndexByOwner(input: {
	organizationId?: string;
	slug: string;
	displayName: string;
	schema: Prisma.InputJsonValue;
}) {
	if (!input.organizationId) {
		throw new Error("organizationId is required");
	}

	return db.searchIndex.create({
		data: {
			organizationId: input.organizationId,
			slug: input.slug,
			displayName: input.displayName,
			schema: input.schema,
		},
	});
}

export async function updateSearchIndexVersion(id: string, version: number) {
	return db.searchIndex.update({
		where: { id },
		data: { version },
	});
}

export async function deleteSearchIndex(id: string) {
	return db.searchIndex.delete({
		where: { id },
	});
}

export async function listSearchApiKeys(indexId: string) {
	return db.searchApiKey.findMany({
		where: { indexId },
		orderBy: { createdAt: "desc" },
	});
}

export async function getSearchApiKeyByHash(hash: string) {
	return db.searchApiKey.findUnique({
		where: { hash },
		include: { index: true },
	});
}

export async function getSearchApiKeyById(id: string) {
	return db.searchApiKey.findUnique({
		where: { id },
	});
}

export async function createSearchApiKey(input: {
	indexId: string;
	organizationId: string;
	name: string;
	prefix: string;
	hash: string;
	scopes: string[];
	allowedOrigins?: string[];
	rateLimitPerMinute?: number;
	expiresAt?: Date | null;
}) {
	return db.searchApiKey.create({
		data: {
			indexId: input.indexId,
			organizationId: input.organizationId,
			name: input.name,
			prefix: input.prefix,
			hash: input.hash,
			scopes: input.scopes,
			allowedOrigins: input.allowedOrigins ?? [],
			rateLimitPerMinute: input.rateLimitPerMinute ?? 600,
			expiresAt: input.expiresAt ?? null,
		},
	});
}

export async function revokeSearchApiKey(id: string) {
	return db.searchApiKey.update({
		where: { id },
		data: { revokedAt: new Date() },
	});
}

export async function touchSearchApiKey(id: string) {
	return db.searchApiKey.update({
		where: { id },
		data: { lastUsedAt: new Date() },
	});
}

export async function recordSearchUsage(input: {
	indexId: string;
	organizationId: string;
	type: "search" | "ingest" | "ingest_enqueued";
	count?: number;
}) {
	return db.searchUsageEvent.create({
		data: {
			indexId: input.indexId,
			organizationId: input.organizationId,
			type: input.type,
			count: input.count ?? 1,
		},
	});
}

export async function aggregateSearchUsage(organizationId: string, since: Date) {
	const rows = await db.searchUsageEvent.groupBy({
		by: ["indexId", "type"],
		where: {
			organizationId,
			createdAt: { gte: since },
		},
		_sum: { count: true },
	});

	return rows.map((row) => ({
		indexId: row.indexId,
		type: row.type,
		total: row._sum.count ?? 0,
	}));
}

export async function enqueueSearchIngest(input: {
	indexId: string;
	organizationId: string;
	action: "upsert" | "delete";
	document: Prisma.InputJsonValue;
}) {
	return db.searchIngestBuffer.create({
		data: {
			indexId: input.indexId,
			organizationId: input.organizationId,
			action: input.action,
			document: input.document,
		},
	});
}

/**
 * Bulk-enqueue many ingest rows in a single INSERT — used by the import API
 * so it doesn't pay one round-trip per document. Returns the count actually
 * inserted.
 */
export async function enqueueManySearchIngest(
	indexId: string,
	organizationId: string,
	action: "upsert" | "delete",
	documents: Prisma.InputJsonValue[],
): Promise<number> {
	if (documents.length === 0) return 0;
	const result = await db.searchIngestBuffer.createMany({
		data: documents.map((document) => ({
			indexId,
			organizationId,
			action,
			document,
		})),
	});
	return result.count;
}

export async function takePendingIngestRows(indexId: string, limit: number) {
	const now = new Date();
	return db.searchIngestBuffer.findMany({
		where: {
			indexId,
			processedAt: null,
			OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
		},
		orderBy: { createdAt: "asc" },
		take: limit,
	});
}

export async function markIngestRowsSuccess(ids: string[]) {
	if (ids.length === 0) {
		return;
	}
	await db.searchIngestBuffer.updateMany({
		where: { id: { in: ids } },
		data: { processedAt: new Date(), lastError: null },
	});
}

const MAX_BACKOFF_MS = 60 * 60 * 1000;
const BASE_BACKOFF_MS = 30 * 1000;

export async function markIngestRowsFailure(input: { id: string; error: string }[]) {
	if (input.length === 0) {
		return;
	}
	for (const row of input) {
		const current = await db.searchIngestBuffer.findUnique({
			where: { id: row.id },
			select: { attempts: true },
		});
		const nextAttempts = (current?.attempts ?? 0) + 1;
		const backoffMs = Math.min(BASE_BACKOFF_MS * 2 ** (nextAttempts - 1), MAX_BACKOFF_MS);
		await db.searchIngestBuffer.update({
			where: { id: row.id },
			data: {
				attempts: nextAttempts,
				lastError: row.error.slice(0, 1000),
				nextRetryAt: new Date(Date.now() + backoffMs),
			},
		});
	}
}
