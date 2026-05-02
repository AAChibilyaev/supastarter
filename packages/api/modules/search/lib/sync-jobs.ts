import {
	completeConnectorSyncJob,
	createConnectorSyncJob,
	failConnectorSyncJob,
	getConnectorSyncJob,
	listConnectorSyncJobs,
	type ConnectorSyncJobView,
} from "@repo/database";

export type SyncJob = ConnectorSyncJobView;

export interface ReindexJob {
	id: string;
	indexId: string;
	organizationId: string;
	slug: string;
	status: "running" | "completed" | "failed";
	processed: number;
	total: number;
	startedAt: string;
	finishedAt: string | null;
}

// In-memory reindex job tracking (volatile by design — reindex is retriggered on heartbeat fail).
const reindexJobs: Map<string, ReindexJob> = new Map();

let nextReindexJobId = 1;

export async function createSyncJob(input: {
	type: "full" | "delta";
	indexId: string;
	organizationId: string;
}): Promise<SyncJob> {
	return createConnectorSyncJob(input);
}

export async function completeSyncJob(
	jobId: string,
	result: { itemsCount: number; failuresCount?: number },
): Promise<SyncJob | null> {
	return completeConnectorSyncJob(jobId, result);
}

export async function failSyncJob(jobId: string, error: string): Promise<SyncJob | null> {
	return failConnectorSyncJob(jobId, error);
}

export async function listSyncJobs(organizationId: string): Promise<SyncJob[]> {
	return listConnectorSyncJobs(organizationId);
}

export async function getSyncJob(jobId: string, organizationId: string): Promise<SyncJob | null> {
	return getConnectorSyncJob(jobId, organizationId);
}

export function createReindexJob(input: {
	indexId: string;
	organizationId: string;
	slug: string;
}): ReindexJob {
	const id = `reindex_${nextReindexJobId++}_${Date.now()}`;
	const job: ReindexJob = {
		id,
		indexId: input.indexId,
		organizationId: input.organizationId,
		slug: input.slug,
		status: "running",
		processed: 0,
		total: 0,
		startedAt: new Date().toISOString(),
		finishedAt: null,
	};
	reindexJobs.set(id, job);
	if (reindexJobs.size > 20) {
		const oldest = reindexJobs.keys().next().value;
		if (oldest) reindexJobs.delete(oldest);
	}
	return job;
}

export function updateReindexProgress(jobId: string, processed: number, total: number): void {
	const job = reindexJobs.get(jobId);
	if (!job) return;
	reindexJobs.set(jobId, { ...job, processed, total });
}

export function completeReindexJob(
	jobId: string,
	processed: number,
	failures: number,
): ReindexJob | null {
	const job = reindexJobs.get(jobId);
	if (!job) return null;
	const updated: ReindexJob = {
		...job,
		status: "completed",
		processed,
		total: Math.max(job.total, processed + failures),
		finishedAt: new Date().toISOString(),
	};
	reindexJobs.set(jobId, updated);
	return updated;
}

export function failReindexJob(jobId: string): ReindexJob | null {
	const job = reindexJobs.get(jobId);
	if (!job) return null;
	const updated: ReindexJob = {
		...job,
		status: "failed",
		finishedAt: new Date().toISOString(),
	};
	reindexJobs.set(jobId, updated);
	return updated;
}

export function listActiveReindexJobs(organizationId: string): ReindexJob[] {
	return Array.from(reindexJobs.values()).filter(
		(j) => j.organizationId === organizationId && j.status === "running",
	);
}
