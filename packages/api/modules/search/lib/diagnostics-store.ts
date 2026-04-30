/**
 * In-memory diagnostics store. Last-known report per index.
 * Lost on server restart — acceptable for MVP. Promote to DB when this becomes
 * a pain point (would require a `SearchConnectorDiagnostics` Prisma model).
 */

export interface DiagnosticsReport {
	moduleVersion: string;
	platform?: string;
	lastFullSync?: string;
	lastDeltaSync?: string;
	totalProducts?: number;
	errors?: { code: string; message: string; timestamp: string }[];
	phpVersion?: string;
	shopUrl?: string;
	receivedAt: string;
}

export interface DiagnosticsRecord extends DiagnosticsReport {
	indexId: string;
	organizationId: string;
}

const reports: Map<string, DiagnosticsRecord> = new Map();

function key(organizationId: string, indexId: string) {
	return `${organizationId}:${indexId}`;
}

export function recordDiagnostics(input: {
	organizationId: string;
	indexId: string;
	report: Omit<DiagnosticsReport, "receivedAt">;
}): DiagnosticsRecord {
	const record: DiagnosticsRecord = {
		...input.report,
		indexId: input.indexId,
		organizationId: input.organizationId,
		receivedAt: new Date().toISOString(),
	};
	reports.set(key(input.organizationId, input.indexId), record);
	return record;
}

export function getDiagnostics(organizationId: string, indexId: string): DiagnosticsRecord | null {
	return reports.get(key(organizationId, indexId)) ?? null;
}

export function listDiagnostics(organizationId: string): DiagnosticsRecord[] {
	return Array.from(reports.values()).filter((r) => r.organizationId === organizationId);
}
