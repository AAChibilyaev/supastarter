import { db } from "@repo/database";
import { logger } from "@repo/logs";
import {
	checkIndexHealth,
	type HealthStatus,
	type IndexHealthResult,
	sendSlackAlert,
} from "@repo/search";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
	const expected = process.env.INDEX_HEALTH_CRON_SECRET ?? process.env.SEARCH_CRON_SECRET;
	if (!expected) {
		logger.warn(
			"INDEX_HEALTH_CRON_SECRET (or SEARCH_CRON_SECRET) is not set — index-health-check cron will always reject requests",
		);
		return false;
	}
	const auth = request.headers.get("authorization");
	if (auth === `Bearer ${expected}`) return true;
	return request.headers.get("x-cron-secret") === expected;
}

function severityFromStatus(status: HealthStatus): "warning" | "critical" {
	return status === "critical" ? "critical" : "warning";
}

function buildAlertMessage(result: IndexHealthResult): string {
	const parts: string[] = [];

	if (result.docCountDrift !== null && Math.abs(result.docCountDrift) > 0.05) {
		const pct = (result.docCountDrift * 100).toFixed(1);
		parts.push(
			`Doc count drift: ${pct}% (expected ${result.expectedDocCount}, actual ${result.actualDocCount ?? "unknown"})`,
		);
	}

	if (result.ingestLagSeconds !== null && result.ingestLagSeconds > 300) {
		const minutes = Math.round(result.ingestLagSeconds / 60);
		parts.push(`Ingest lag: ${minutes}m (queue is stalled)`);
	}

	if (result.errorRate !== null && result.errorRate > 0.01) {
		const pct = (result.errorRate * 100).toFixed(1);
		parts.push(`Error rate: ${pct}% of ingest rows failed in the last 24 h`);
	}

	return parts.join("\n");
}

export async function GET(request: Request) {
	if (!isAuthorized(request)) {
		return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	}

	// Fetch all distinct organizations that have at least one index.
	const orgRows = await db.searchIndex.findMany({
		distinct: ["organizationId"],
		select: { organizationId: true },
	});

	let checkedTotal = 0;
	const anomalies: Array<{
		organizationId: string;
		slug: string;
		status: HealthStatus;
		summary: string;
	}> = [];

	for (const { organizationId } of orgRows) {
		const indexes = await db.searchIndex.findMany({
			where: { organizationId },
			select: { slug: true },
		});

		for (const { slug } of indexes) {
			checkedTotal++;
			try {
				const result = await checkIndexHealth(organizationId, slug);

				if (result.status !== "healthy") {
					const summary = buildAlertMessage(result);
					anomalies.push({ organizationId, slug, status: result.status, summary });

					logger.warn("index-health-check: anomaly detected", {
						organizationId,
						slug,
						status: result.status,
						docCountDrift: result.docCountDrift,
						ingestLagSeconds: result.ingestLagSeconds,
						errorRate: result.errorRate,
					});

					// Fire Slack alert (non-blocking — failures are logged but don't abort the run).
					sendSlackAlert({
						title: `Index Health Alert: ${slug}`,
						message: summary,
						severity: severityFromStatus(result.status),
						fields: [
							{ label: "Organization", value: organizationId },
							{ label: "Index", value: slug },
							{ label: "Status", value: result.status.toUpperCase() },
							...(result.docCountDrift !== null
								? [
										{
											label: "Doc Drift",
											value: `${(result.docCountDrift * 100).toFixed(1)}%`,
										},
									]
								: []),
							...(result.ingestLagSeconds !== null
								? [
										{
											label: "Ingest Lag",
											value: `${Math.round(result.ingestLagSeconds / 60)}m`,
										},
									]
								: []),
							...(result.errorRate !== null
								? [
										{
											label: "Error Rate (24 h)",
											value: `${(result.errorRate * 100).toFixed(1)}%`,
										},
									]
								: []),
						],
					}).catch((err) =>
						logger.error("index-health-check: Slack alert failed", { organizationId, slug, err }),
					);
				}
			} catch (error) {
				logger.error("index-health-check: health check threw for index", {
					organizationId,
					slug,
					error,
				});
			}
		}
	}

	logger.info("index-health-check completed", {
		checked: checkedTotal,
		anomalies: anomalies.length,
	});

	return NextResponse.json({
		checked: checkedTotal,
		anomalies: anomalies.length > 0 ? anomalies : undefined,
	});
}
