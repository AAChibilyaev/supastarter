import { db } from "../client";
import type { Prisma } from "../generated/client";

export interface ConnectorSyncJobEvent {
	timestamp: string;
	message: string;
	level: "info" | "warn" | "error";
}

export interface ConnectorSyncJobView {
	id: string;
	type: "full" | "delta";
	status: "running" | "completed" | "failed";
	indexId: string;
	organizationId: string;
	startedAt: string;
	finishedAt: string | null;
	duration: string | null;
	itemsCount: number;
	failuresCount: number;
	events: ConnectorSyncJobEvent[];
}

export interface SearchOwnerScope {
	organizationId?: string;
}

export const SEARCH_USAGE_EVENT_TYPES = {
	searchQuery: "search_query",
	ingestWrite: "ingest_write",
	documentsIndexed: "documents_indexed",
	click: "click",
	zeroResults: "zero_results",
	widgetOpen: "widget_open",
	widgetQuery: "widget_query",
	filterApplied: "filter_applied",
	syncJob: "sync_job",
} as const;

export type SearchUsageMetricType =
	(typeof SEARCH_USAGE_EVENT_TYPES)[keyof typeof SEARCH_USAGE_EVENT_TYPES];

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

export async function updateSearchIndex(
	id: string,
	data: { displayName?: string; enabled?: boolean },
) {
	return db.searchIndex.update({
		where: { id },
		data,
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
	type: SearchUsageMetricType;
	count?: number;
	metadata?: Prisma.InputJsonValue;
}) {
	return db.searchUsageEvent.create({
		data: {
			indexId: input.indexId,
			organizationId: input.organizationId,
			type: input.type,
			count: input.count ?? 1,
			metadata: input.metadata,
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

const BASE_BACKOFF_MS = 30 * 1000;
const MAX_BACKOFF_MS = 7200 * 1000; // 2 hours
const SLOW_RETRY_THRESHOLD = 5; // attempts >= 5 → long park
const SLOW_RETRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function markIngestRowsFailure(input: { id: string; error: string }[]) {
	if (input.length === 0) {
		return;
	}
	const ids = input.map((r) => r.id);
	const currentRows = await db.searchIngestBuffer.findMany({
		where: { id: { in: ids } },
		select: { id: true, attempts: true },
	});
	const attemptsMap = new Map(currentRows.map((r) => [r.id, r.attempts]));

	const now = Date.now();
	for (const row of input) {
		const nextAttempts = (attemptsMap.get(row.id) ?? 0) + 1;
		const backoffMs =
			nextAttempts >= SLOW_RETRY_THRESHOLD
				? SLOW_RETRY_MS
				: Math.min(BASE_BACKOFF_MS * 2 ** (nextAttempts - 1), MAX_BACKOFF_MS);
		await db.searchIngestBuffer.update({
			where: { id: row.id },
			data: {
				attempts: nextAttempts,
				lastError: row.error.slice(0, 1000),
				nextRetryAt: new Date(now + backoffMs),
			},
		});
	}
}

// ─── SearchConnectorSyncJob ──────────────────────────────────────

function durationString(ms: number | null): string | null {
	if (ms === null) return null;
	return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function toSyncJobView(row: {
	id: string;
	type: string;
	status: string;
	indexId: string;
	organizationId: string;
	startedAt: Date;
	finishedAt: Date | null;
	durationMs: number | null;
	itemsCount: number;
	failuresCount: number;
	events: Prisma.JsonValue;
}): ConnectorSyncJobView {
	return {
		id: row.id,
		type: row.type as "full" | "delta",
		status: row.status as "running" | "completed" | "failed",
		indexId: row.indexId,
		organizationId: row.organizationId,
		startedAt: row.startedAt.toISOString(),
		finishedAt: row.finishedAt?.toISOString() ?? null,
		duration: durationString(row.durationMs),
		itemsCount: row.itemsCount,
		failuresCount: row.failuresCount,
		events: row.events as unknown as ConnectorSyncJobEvent[],
	};
}

export async function createConnectorSyncJob(input: {
	type: "full" | "delta";
	indexId: string;
	organizationId: string;
}): Promise<ConnectorSyncJobView> {
	const now = new Date();
	const event: ConnectorSyncJobEvent = {
		timestamp: now.toISOString(),
		message: `${input.type === "full" ? "Full" : "Delta"} sync started`,
		level: "info",
	};
	const row = await db.searchConnectorSyncJob.create({
		data: {
			indexId: input.indexId,
			organizationId: input.organizationId,
			type: input.type,
			status: "running",
			startedAt: now,
			events: [event] as unknown as Prisma.InputJsonValue,
		},
	});
	return toSyncJobView(row);
}

export async function completeConnectorSyncJob(
	jobId: string,
	result: { itemsCount: number; failuresCount?: number },
): Promise<ConnectorSyncJobView | null> {
	const existing = await db.searchConnectorSyncJob.findUnique({ where: { id: jobId } });
	if (!existing) return null;
	const finishedAt = new Date();
	const durationMs = finishedAt.getTime() - existing.startedAt.getTime();
	const event: ConnectorSyncJobEvent = {
		timestamp: finishedAt.toISOString(),
		message: `Sync completed: ${result.itemsCount} items processed`,
		level: "info",
	};
	const existingEvents = (existing.events as unknown as ConnectorSyncJobEvent[]) ?? [];
	const row = await db.searchConnectorSyncJob.update({
		where: { id: jobId },
		data: {
			status: "completed",
			finishedAt,
			durationMs,
			itemsCount: result.itemsCount,
			failuresCount: result.failuresCount ?? 0,
			events: [...existingEvents, event] as unknown as Prisma.InputJsonValue,
		},
	});
	return toSyncJobView(row);
}

export async function failConnectorSyncJob(
	jobId: string,
	error: string,
): Promise<ConnectorSyncJobView | null> {
	const existing = await db.searchConnectorSyncJob.findUnique({ where: { id: jobId } });
	if (!existing) return null;
	const finishedAt = new Date();
	const durationMs = finishedAt.getTime() - existing.startedAt.getTime();
	const event: ConnectorSyncJobEvent = {
		timestamp: finishedAt.toISOString(),
		message: `Sync failed: ${error}`,
		level: "error",
	};
	const existingEvents = (existing.events as unknown as ConnectorSyncJobEvent[]) ?? [];
	const row = await db.searchConnectorSyncJob.update({
		where: { id: jobId },
		data: {
			status: "failed",
			finishedAt,
			durationMs,
			lastError: error.slice(0, 1000),
			events: [...existingEvents, event] as unknown as Prisma.InputJsonValue,
		},
	});
	return toSyncJobView(row);
}

export async function listConnectorSyncJobs(
	organizationId: string,
): Promise<ConnectorSyncJobView[]> {
	const rows = await db.searchConnectorSyncJob.findMany({
		where: { organizationId },
		orderBy: { startedAt: "desc" },
		take: 50,
	});
	return rows.map(toSyncJobView);
}

export async function getConnectorSyncJob(
	jobId: string,
	organizationId: string,
): Promise<ConnectorSyncJobView | null> {
	const row = await db.searchConnectorSyncJob.findFirst({
		where: { id: jobId, organizationId },
	});
	if (!row) return null;
	return toSyncJobView(row);
}
