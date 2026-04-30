import { db } from "../client";
import type { Prisma } from "../generated/client";

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
	type: "search" | "ingest";
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

export async function takePendingIngestRows(indexId: string, limit: number) {
	return db.searchIngestBuffer.findMany({
		where: { indexId, processedAt: null },
		orderBy: { createdAt: "asc" },
		take: limit,
	});
}

export async function markIngestRowsProcessed(ids: string[]) {
	if (ids.length === 0) {
		return;
	}
	await db.searchIngestBuffer.updateMany({
		where: { id: { in: ids } },
		data: { processedAt: new Date() },
	});
}
