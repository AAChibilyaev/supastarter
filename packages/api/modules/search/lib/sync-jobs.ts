/**
 * In-memory sync jobs tracker for CMS connectors.
 * Jobs are ephemeral (lost on restart) — sufficient for dashboard display.
 */

export interface SyncJob {
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
	events: Array<{
		timestamp: string;
		message: string;
		level: "info" | "warn" | "error";
	}>;
}

const jobs = new Map<string, SyncJob>();
const MAX_JOBS = 50;

function generateJobId(): string {
	return `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createSyncJob(input: {
	type: "full" | "delta";
	indexId: string;
	organizationId: string;
}): SyncJob {
	// Evict oldest if at capacity
	if (jobs.size >= MAX_JOBS) {
		const oldest = [...jobs.entries()].sort(
			([, a], [, b]) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
		)[0];
		if (oldest) jobs.delete(oldest[0]);
	}

	const job: SyncJob = {
		id: generateJobId(),
		type: input.type,
		status: "running",
		indexId: input.indexId,
		organizationId: input.organizationId,
		startedAt: new Date().toISOString(),
		finishedAt: null,
		duration: null,
		itemsCount: 0,
		failuresCount: 0,
		events: [
			{
				timestamp: new Date().toISOString(),
				message: `${input.type === "full" ? "Full" : "Delta"} sync started`,
				level: "info",
			},
		],
	};
	jobs.set(job.id, job);
	return job;
}

export function completeSyncJob(
	jobId: string,
	result: { itemsCount: number; failuresCount?: number },
): SyncJob | null {
	const job = jobs.get(jobId);
	if (!job) return null;

	job.status = "completed";
	job.finishedAt = new Date().toISOString();
	job.itemsCount = result.itemsCount;
	job.failuresCount = result.failuresCount ?? 0;
	const start = new Date(job.startedAt).getTime();
	const end = new Date(job.finishedAt).getTime();
	const ms = end - start;
	job.duration = ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
	job.events.push({
		timestamp: job.finishedAt,
		message: `Sync completed: ${job.itemsCount} items processed`,
		level: "info",
	});
	return job;
}

export function failSyncJob(jobId: string, error: string): SyncJob | null {
	const job = jobs.get(jobId);
	if (!job) return null;

	job.status = "failed";
	job.finishedAt = new Date().toISOString();
	const start = new Date(job.startedAt).getTime();
	const end = new Date(job.finishedAt).getTime();
	const ms = end - start;
	job.duration = ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
	job.events.push({
		timestamp: job.finishedAt,
		message: `Sync failed: ${error}`,
		level: "error",
	});
	return job;
}

export function listSyncJobs(organizationId: string): SyncJob[] {
	return [...jobs.values()]
		.filter((j) => j.organizationId === organizationId)
		.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
		.slice(0, MAX_JOBS);
}

export function getSyncJob(jobId: string): SyncJob | undefined {
	return jobs.get(jobId);
}
