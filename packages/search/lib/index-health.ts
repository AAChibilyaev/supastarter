import "server-only";
import { db } from "@repo/database";
import { logger } from "@repo/logs";

import { getTypesenseClient } from "./client";

// ─── Types ──────────────────────────────────────────────────────

export interface DriftResult {
	indexId: string;
	organizationId: string;
	collectionName: string;
	typesenseCount: number;
	expectedCount: number;
	driftPercent: number;
	healthy: boolean;
}

export interface LagResult {
	organizationId: string;
	oldestBufferedAt: string | null;
	lagSeconds: number | null;
	pendingItems: number;
	failedItems: number;
	healthy: boolean;
}

export interface ErrorRateResult {
	organizationId: string;
	periodMinutes: number;
	totalJobs: number;
	failedJobs: number;
	errorPercent: number;
	healthy: boolean;
}

export interface IndexHealthCheck {
	drift: DriftResult[];
	lag: LagResult[];
	errorRates: ErrorRateResult[];
	overallHealthy: boolean;
}

export interface AnomalyEvent {
	organizationId: string;
	type: "drift" | "lag" | "error_rate" | "doc_drop";
	severity: "warning" | "critical";
	message: string;
	details: Record<string, unknown>;
}

// ─── Constants ───────────────────────────────────────────────────

const DRIFT_THRESHOLD_PERCENT = 5; // alert if drift > 5%
const CRITICAL_DRIFT_THRESHOLD = 20; // auto-pause if drift > 20%
const LAG_THRESHOLD_SECONDS = 300; // 5 minutes
const ERROR_RATE_THRESHOLD = 1; // 1%
const DOC_DROP_THRESHOLD_PERCENT = 10; // 10% drop

// ─── Document Drift Detection ────────────────────────────────────

/**
 * Compare Typesense actual document count vs expected count
 * for a specific search index.
 *
 * Expected count is derived from the ingest buffer:
 * - Total documents that have been successfully processed minus deletions.
 */
export async function getDocumentDrift(indexId: string): Promise<DriftResult | null> {
	const index = await db.searchIndex.findUnique({
		where: { id: indexId },
		select: {
			id: true,
			slug: true,
			organizationId: true,
		},
	});

	if (!index) {
		logger.warn("getDocumentDrift: index not found", { indexId });
		return null;
	}

	const client = getTypesenseClient();

	// Get Typesense collection stats
	let typesenseCount = 0;
	try {
		const collection = await (client as any).collections(index.slug).retrieve();
		typesenseCount = collection?.num_documents ?? 0;
	} catch (error) {
		logger.error("getDocumentDrift: Typesense collection fetch failed", {
			indexId,
			slug: index.slug,
			error,
		});
		return null;
	}

	// Get expected count: sum of creates minus deletes from successfully
	// processed buffer items
	const processedInserts = await db.searchIngestBuffer.count({
		where: {
			indexId,
			processedAt: { not: null },
			action: "upsert",
			lastError: null,
		},
	});

	const processedDeletes = await db.searchIngestBuffer.count({
		where: {
			indexId,
			processedAt: { not: null },
			action: "delete",
			lastError: null,
		},
	});

	// Also count documents from reindex operations
	const reindexedDocuments = await db.searchConnectorSyncJob.aggregate({
		where: {
			indexId,
			type: "reindex",
			status: "completed",
		},
		_sum: {
			itemsCount: true,
		},
	});

	const expectedCount =
		processedInserts - processedDeletes + (reindexedDocuments._sum.itemsCount ?? 0);

	// Calculate drift
	const driftPercent =
		expectedCount > 0 ? (Math.abs(typesenseCount - expectedCount) / expectedCount) * 100 : 0;

	return {
		indexId,
		organizationId: index.organizationId,
		collectionName: index.slug,
		typesenseCount,
		expectedCount,
		driftPercent: Math.round(driftPercent * 100) / 100,
		healthy: driftPercent <= DRIFT_THRESHOLD_PERCENT,
	};
}

// ─── Ingest Lag Monitoring ───────────────────────────────────────

/**
 * Check how long the oldest unprocessed ingest buffer item has been waiting.
 */
export async function checkIngestLag(organizationId: string): Promise<LagResult> {
	const [oldest, pendingItems, failedItems] = await Promise.all([
		db.searchIngestBuffer.findFirst({
			where: { organizationId, processedAt: null },
			orderBy: { createdAt: "asc" },
			select: { createdAt: true },
		}),
		db.searchIngestBuffer.count({
			where: { organizationId, processedAt: null, attempts: 0 },
		}),
		db.searchIngestBuffer.count({
			where: { organizationId, processedAt: null, attempts: { gt: 0 } },
		}),
	]);

	const oldestBufferedAt = oldest?.createdAt.toISOString() ?? null;
	const lagSeconds = oldest ? (Date.now() - oldest.createdAt.getTime()) / 1000 : null;

	return {
		organizationId,
		oldestBufferedAt,
		lagSeconds: lagSeconds ? Math.round(lagSeconds) : null,
		pendingItems,
		failedItems,
		healthy: lagSeconds === null || lagSeconds <= LAG_THRESHOLD_SECONDS,
	};
}

// ─── Error Rate Detection ────────────────────────────────────────

/**
 * Check error rate across connector sync jobs in a given time window.
 */
export async function checkErrorRate(
	organizationId: string,
	periodMinutes: number = 60,
): Promise<ErrorRateResult> {
	const since = new Date(Date.now() - periodMinutes * 60 * 1000);

	const [totalJobs, failedJobs] = await Promise.all([
		db.searchConnectorSyncJob.count({
			where: {
				organizationId,
				startedAt: { gte: since },
			},
		}),
		db.searchConnectorSyncJob.count({
			where: {
				organizationId,
				startedAt: { gte: since },
				status: "failed",
			},
		}),
	]);

	const errorPercent = totalJobs > 0 ? (failedJobs / totalJobs) * 100 : 0;

	return {
		organizationId,
		periodMinutes,
		totalJobs,
		failedJobs,
		errorPercent: Math.round(errorPercent * 100) / 100,
		healthy: errorPercent <= ERROR_RATE_THRESHOLD || totalJobs === 0,
	};
}

// ─── Full Health Check ───────────────────────────────────────────

/**
 * Run a comprehensive health check for an organization.
 * Checks document drift across all indexes, ingest lag, and error rates.
 */
export async function checkIndexHealth(organizationId: string): Promise<IndexHealthCheck> {
	const indexes = await db.searchIndex.findMany({
		where: { organizationId, enabled: true },
		select: { id: true },
	});

	const driftResults: DriftResult[] = [];
	for (const index of indexes) {
		const result = await getDocumentDrift(index.id);
		if (result) {
			driftResults.push(result);
		}
	}

	const [lagResult, errorRateResult] = await Promise.all([
		checkIngestLag(organizationId),
		checkErrorRate(organizationId),
	]);

	const overallHealthy =
		driftResults.every((d) => d.healthy) && lagResult.healthy && errorRateResult.healthy;

	return {
		drift: driftResults,
		lag: [lagResult],
		errorRates: [errorRateResult],
		overallHealthy,
	};
}

// ─── Anomaly Detection ───────────────────────────────────────────

/**
 * Detect anomalies from health check results and generate alert events.
 */
export function detectAnomalies(health: IndexHealthCheck): AnomalyEvent[] {
	const events: AnomalyEvent[] = [];

	for (const drift of health.drift) {
		if (!drift.healthy) {
			const isCritical = drift.driftPercent > CRITICAL_DRIFT_THRESHOLD;
			events.push({
				organizationId: drift.organizationId,
				type: "drift",
				severity: isCritical ? "critical" : "warning",
				message: isCritical
					? `Document count drift CRITICAL: ${drift.collectionName} has ${drift.driftPercent}% drift (Typesense: ${drift.typesenseCount}, expected: ${drift.expectedCount})`
					: `Document count drift detected: ${drift.collectionName} has ${drift.driftPercent}% drift`,
				details: {
					indexId: drift.indexId,
					collectionName: drift.collectionName,
					typesenseCount: drift.typesenseCount,
					expectedCount: drift.expectedCount,
					driftPercent: drift.driftPercent,
				},
			});
		}

		// Check for document count drop
		if (drift.typesenseCount > 0 && drift.expectedCount > 0) {
			const dropPercent =
				((drift.expectedCount - drift.typesenseCount) / drift.expectedCount) * 100;
			if (dropPercent > DOC_DROP_THRESHOLD_PERCENT) {
				events.push({
					organizationId: drift.organizationId,
					type: "doc_drop",
					severity: "critical",
					message: `Document count drop detected: ${drift.collectionName} lost ${Math.round(dropPercent)}% of documents`,
					details: {
						indexId: drift.indexId,
						collectionName: drift.collectionName,
						dropPercent: Math.round(dropPercent * 100) / 100,
						typesenseCount: drift.typesenseCount,
						expectedCount: drift.expectedCount,
					},
				});
			}
		}
	}

	for (const lag of health.lag) {
		if (!lag.healthy && lag.lagSeconds !== null) {
			events.push({
				organizationId: lag.organizationId,
				type: "lag",
				severity: lag.lagSeconds > LAG_THRESHOLD_SECONDS * 3 ? "critical" : "warning",
				message: `Ingest pipeline lag detected: ${lag.pendingItems} items pending for ${Math.round(lag.lagSeconds / 60)} minutes`,
				details: {
					lagSeconds: lag.lagSeconds,
					pendingItems: lag.pendingItems,
					failedItems: lag.failedItems,
				},
			});
		}
	}

	for (const err of health.errorRates) {
		if (!err.healthy && err.totalJobs > 0) {
			events.push({
				organizationId: err.organizationId,
				type: "error_rate",
				severity: err.errorPercent > ERROR_RATE_THRESHOLD * 5 ? "critical" : "warning",
				message: `Error rate spike: ${err.errorPercent}% failure rate in the last ${err.periodMinutes} minutes (${err.failedJobs}/${err.totalJobs} jobs failed)`,
				details: {
					errorPercent: err.errorPercent,
					failedJobs: err.failedJobs,
					totalJobs: err.totalJobs,
					periodMinutes: err.periodMinutes,
				},
			});
		}
	}

	return events;
}

// ─── Auto-Pause ──────────────────────────────────────────────────

/**
 * Auto-pause indexing for an index when a critical anomaly is detected.
 * Returns true if the index was paused.
 */
export async function autoPauseIndexing(indexId: string, reason: string): Promise<boolean> {
	try {
		const index = await db.searchIndex.findUnique({
			where: { id: indexId },
			select: { enabled: true },
		});

		if (!index || !index.enabled) {
			return false; // Already paused or not found
		}

		await db.searchIndex.update({
			where: { id: indexId },
			data: { enabled: false },
		});

		logger.warn("autoPauseIndexing: index auto-paused due to anomaly", {
			indexId,
			reason,
		});

		return true;
	} catch (error) {
		logger.error("autoPauseIndexing: failed to pause index", {
			indexId,
			reason,
			error,
		});
		return false;
	}
}

// ─── Alert State Management ──────────────────────────────────────

/**
 * Alert state is stored in organization.metadata as:
 *   { indexHealthAlerts: { drift_<indexId>: number (timestamp), ... } }
 */

interface IndexHealthAlertState {
	[key: string]: number; // alert_type_identifier: last_sent_timestamp
}

interface OrgMetadata {
	indexHealthAlerts?: IndexHealthAlertState;
	slackWebhookUrl?: string;
}

function parseOrgMetadata(raw: string | null): OrgMetadata {
	if (!raw) return {};
	try {
		const parsed = JSON.parse(raw);
		if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
			return parsed as OrgMetadata;
		}
		return {};
	} catch {
		return {};
	}
}

/**
 * Check if an alert should be sent (not sent in the last cooldown period).
 * Cooldown: 30 minutes.
 */
export function shouldSendAlert(
	metadataStr: string | null,
	alertKey: string,
	cooldownMinutes: number = 30,
): boolean {
	const metadata = parseOrgMetadata(metadataStr);
	const alerts = metadata.indexHealthAlerts ?? {};
	const lastSent = alerts[alertKey];
	if (!lastSent) return true;
	return Date.now() - lastSent > cooldownMinutes * 60 * 1000;
}

/**
 * Mark an alert as sent by updating the org metadata.
 */
export async function markAlertSent(organizationId: string, alertKey: string): Promise<void> {
	try {
		const org = await db.organization.findUnique({
			where: { id: organizationId },
			select: { metadata: true },
		});

		if (!org) return;

		const metadata = parseOrgMetadata(org.metadata);
		const currentAlerts = metadata.indexHealthAlerts ?? {};

		const newMetadata: OrgMetadata = {
			...metadata,
			indexHealthAlerts: {
				...currentAlerts,
				[alertKey]: Date.now(),
			},
		};

		await db.organization.update({
			where: { id: organizationId },
			data: { metadata: JSON.stringify(newMetadata) },
		});
	} catch (error) {
		logger.error("markAlertSent: failed to update org metadata", {
			organizationId,
			alertKey,
			error,
		});
	}
}

/**
 * Build a Slack-formatted anomaly alert message.
 */
export function buildAnomalyAlertSlackMessage(
	events: AnomalyEvent[],
	orgName: string,
	dashboardUrl: string,
): Record<string, unknown> {
	if (events.length === 0) {
		return { text: `✅ *Index Health OK — ${orgName}* — No anomalies detected.` };
	}

	const criticalEvents = events.filter((e) => e.severity === "critical");
	const warningEvents = events.filter((e) => e.severity === "warning");

	const emoji = criticalEvents.length > 0 ? ":rotating_light:" : ":warning:";
	const color = criticalEvents.length > 0 ? "danger" : "warning";

	const title =
		criticalEvents.length > 0
			? `CRITICAL: ${criticalEvents.length} critical, ${warningEvents.length} warning anomalies`
			: `${warningEvents.length} anomaly warning(s) detected`;

	const fields = events.map((event) => ({
		title: `${event.severity === "critical" ? "🔴" : "🟡"} ${event.type}`,
		value: event.message,
		short: false,
	}));

	return {
		text: `${emoji} *Index Health Alert — ${orgName}*`,
		attachments: [
			{
				fallback: title,
				color,
				title,
				fields,
				footer: `<${dashboardUrl}|View Dashboard> | AACsearch Index Health`,
				ts: Math.floor(Date.now() / 1000),
			},
		],
	};
}
