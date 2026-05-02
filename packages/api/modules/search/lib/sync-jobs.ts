import {
	completeConnectorSyncJob,
	createConnectorSyncJob,
	failConnectorSyncJob,
	getConnectorSyncJob,
	listConnectorSyncJobs,
	type ConnectorSyncJobView,
} from "@repo/database";

export type SyncJob = ConnectorSyncJobView;

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
