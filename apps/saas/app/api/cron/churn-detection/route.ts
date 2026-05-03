import { db } from "@repo/database";
import { logger } from "@repo/logs";
import { createNotification } from "@repo/notifications";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const COMPUTE_WEIGHTS: Record<string, number> = {
	EMAIL_VERIFIED: 10,
	FIRST_COLLECTION: 15,
	FIRST_DOCUMENT: 20,
	FIRST_SEARCH: 20,
	WIDGET_EMBEDDED: 15,
	FIRST_TEAM_MEMBER: 10,
	FIRST_INTEGRATION: 5,
	FIRST_PAYMENT: 5,
};

const TOTAL_WEIGHT = Object.values(COMPUTE_WEIGHTS).reduce((sum, w) => sum + w, 0);
const CHURN_THRESHOLD = 20; // health score below this triggers alert
const MIN_ORG_AGE_DAYS = 7;

function computeHealthScore(eventTypes: string[]): number {
	let score = 0;
	const completedSet = new Set(eventTypes);
	for (const [eventType, weight] of Object.entries(COMPUTE_WEIGHTS)) {
		if (completedSet.has(eventType)) {
			score += Math.round((weight / TOTAL_WEIGHT) * 100);
		}
	}
	return Math.min(score, 100);
}

function isAuthorized(request: Request): boolean {
	const expected = process.env.SEARCH_CRON_SECRET;
	if (!expected) {
		logger.warn(
			"SEARCH_CRON_SECRET is not set — churn-detection cron will always reject requests",
		);
		return false;
	}
	const auth = request.headers.get("authorization");
	if (auth === `Bearer ${expected}`) return true;
	return request.headers.get("x-cron-secret") === expected;
}

export async function GET(request: Request) {
	if (!isAuthorized(request)) {
		return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	}

	const minAge = new Date(Date.now() - MIN_ORG_AGE_DAYS * 24 * 60 * 60 * 1000);

	// Find all organizations older than the threshold
	const orgs = await db.organization.findMany({
		where: {
			createdAt: { lt: minAge },
		},
		select: { id: true, name: true, createdAt: true },
	});

	logger.info("churn-detection: checking organizations", {
		totalOrgs: orgs.length,
		minAgeDays: MIN_ORG_AGE_DAYS,
	});

	// Fetch all activation events for these orgs in one query
	const allEvents = await db.activationEvent.findMany({
		where: {
			organizationId: { in: orgs.map((o) => o.id) },
		},
		select: { organizationId: true, eventType: true },
	});

	// Build event lookup per org
	const orgEventMap = new Map<string, Set<string>>();
	for (const evt of allEvents) {
		const set = orgEventMap.get(evt.organizationId) ?? new Set();
		set.add(evt.eventType);
		orgEventMap.set(evt.organizationId, set);
	}

	const churned: Array<{
		organizationId: string;
		orgName: string;
		healthScore: number;
		ageDays: number;
	}> = [];

	for (const org of orgs) {
		const eventTypes = orgEventMap.get(org.id) ?? new Set();
		const score = computeHealthScore(Array.from(eventTypes));

		if (score < CHURN_THRESHOLD) {
			const ageMs = Date.now() - org.createdAt.getTime();
			const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

			churned.push({
				organizationId: org.id,
				orgName: org.name,
				healthScore: score,
				ageDays,
			});
		}
	}

	if (churned.length === 0) {
		logger.info("churn-detection: no churn signals detected");
		return NextResponse.json({
			checked: orgs.length,
			churnSignals: 0,
		});
	}

	logger.warn("churn-detection: churn signals detected", {
		count: churned.length,
		organizations: churned.map((c) => ({
			id: c.organizationId,
			name: c.orgName,
			score: c.healthScore,
			ageDays: c.ageDays,
		})),
	});

	// Create notifications for org admin members
	let notificationsCreated = 0;
	for (const entry of churned) {
		const admins = await db.member.findMany({
			where: {
				organizationId: entry.organizationId,
				role: { in: ["owner", "admin"] },
			},
			select: { userId: true },
		});

		for (const admin of admins) {
			try {
				await createNotification({
					userId: admin.userId,
					type: "APP_UPDATE",
					data: {
						headline: `Churn risk: ${entry.orgName}`,
						message: `Health score is ${entry.healthScore}/100 after ${entry.ageDays} days — below the ${CHURN_THRESHOLD} threshold. Review onboarding and suggest next steps.`,
						churnSignal: true,
						organizationId: entry.organizationId,
						healthScore: entry.healthScore,
						ageDays: entry.ageDays,
					},
					link: `/admin/organizations/${entry.organizationId}`,
				});
				notificationsCreated++;
			} catch (error) {
				logger.error("churn-detection: failed to create notification", {
					organizationId: entry.organizationId,
					userId: admin.userId,
					error,
				});
			}
		}
	}

	logger.info("churn-detection: completed", {
		checked: orgs.length,
		churnSignals: churned.length,
		notificationsCreated,
	});

	return NextResponse.json({
		checked: orgs.length,
		churnSignals: churned.length,
		notificationsCreated,
		signals: churned.map((c) => ({
			organizationId: c.organizationId,
			orgName: c.orgName,
			healthScore: c.healthScore,
			ageDays: c.ageDays,
		})),
	});
}
