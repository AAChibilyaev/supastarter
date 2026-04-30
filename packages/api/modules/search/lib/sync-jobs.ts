import type { ConnectorSyncJobView } from "@repo/database";

export type SyncJob = ConnectorSyncJobView;

// In-memory ephemeral sync job storage.
// Sync jobs are lost on server restart — acceptable for MVP since
// CMS modules retry on heartbeat fail. When this becomes a pain
// point, DB-unfreeze a SearchConnectorSyncJob table.
const jobs: Map<string, SyncJob> = new Map();

let nextJobId = 1;

export async function createSyncJob(input: {
	type: "full" | "delta";
	indexId: string;
	organizationId: string;
}): Promise<SyncJob> {
	const id = `sync_${nextJobId++}_${Date.now()}`;
	const now = new Date().toISOString();
	const job: SyncJob = {
		id,
		type: input.type,
		status: "running",
		indexId: input.indexId,
		organizationId: input.organizationId,
		startedAt: now,
		finishedAt: null,
		duration: null,
		itemsCount: 0,
		failuresCount: 0,
		events: [
			{
				timestamp: now,
				message: `${input.type === "full" ? "Full" : "Delta"} sync started`,
				level: "info",
			},
		],
	};
	jobs.set(id, job);
	// Keep only last 50
	if (jobs.size > 50) {
		const oldest = jobs.keys().next().value;
		if (oldest) jobs.delete(oldest);
	}
	return job;
}

export async function completeSyncJob(
	jobId: string,
	result: { itemsCount: number; failuresCount?: number },
): Promise<SyncJob | null> {
	const job = jobs.get(jobId);
	if (!job) return null;
	const finishedAt = new Date().toISOString();
	const startedMs = new Date(job.startedAt).getTime();
	const durationMs = Date.now() - startedMs;
	const updated: SyncJob = {
		...job,
		status: "completed",
		finishedAt,
		duration: durationMs >= 1000 ? `${(durationMs / 1000).toFixed(1)}s` : `${durationMs}ms`,
		itemsCount: result.itemsCount,
		failuresCount: result.failuresCount ?? 0,
		events: [
			...job.events,
			{
				timestamp: finishedAt,
				message: `Sync completed: ${result.itemsCount} items processed`,
				level: "info",
			},
		],
	};
	jobs.set(jobId, updated);
	return updated;
}

export async function failSyncJob(jobId: string, error: string): Promise<SyncJob | null> {
	const job = jobs.get(jobId);
	if (!job) return null;
	const finishedAt = new Date().toISOString();
	const startedMs = new Date(job.startedAt).getTime();
	const durationMs = Date.now() - startedMs;
	const updated: SyncJob = {
		...job,
		status: "failed",
		finishedAt,
		duration: durationMs >= 1000 ? `${(durationMs / 1000).toFixed(1)}s` : `${durationMs}ms`,
		events: [
			...job.events,
			{
				timestamp: finishedAt,
				message: `Sync failed: ${error}`,
				level: "error",
			},
		],
	};
	jobs.set(jobId, updated);
	return updated;
}

export async function listSyncJobs(organizationId: string): Promise<SyncJob[]> {
	const all = Array.from(jobs.values());
	return all
		.filter((j) => j.organizationId === organizationId)
		.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
		.slice(0, 50);
}
