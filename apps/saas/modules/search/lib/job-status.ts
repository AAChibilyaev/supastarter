export type JobBadgeStatus = "warning" | "info" | "success" | "error";

/** Maps ingest-job status strings to Badge `status` prop values. */
export const ingestJobStatusBadge: Record<string, JobBadgeStatus> = {
	pending: "warning",
	processing: "info",
	completed: "success",
	failed: "error",
};

/** Maps connector sync-job status strings to Badge `status` prop values. */
export const syncJobStatusBadge: Record<string, JobBadgeStatus> = {
	running: "warning",
	completed: "success",
	failed: "error",
};
