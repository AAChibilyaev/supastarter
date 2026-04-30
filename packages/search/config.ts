export const config = {
	collectionPrefix: "ss",
	defaultPerPage: 20,
	maxPerPage: 100,
	tenantField: "tenant_id",
	ingestBatchSize: 200,
	defaultUsageWindowDays: 30,
} as const;
