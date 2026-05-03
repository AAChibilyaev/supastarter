import { db } from "../client";
import { Prisma } from "../generated/client";

/**
 * Activation event types that track onboarding funnel progress.
 */
export type ActivationEventKind =
	| "EMAIL_VERIFIED"
	| "FIRST_COLLECTION"
	| "FIRST_DOCUMENT"
	| "FIRST_SEARCH"
	| "WIDGET_EMBEDDED"
	| "FIRST_TEAM_MEMBER"
	| "FIRST_INTEGRATION"
	| "FIRST_PAYMENT";

/** All known activation event types in order. */
export const ALL_ACTIVATION_EVENTS: ActivationEventKind[] = [
	"EMAIL_VERIFIED",
	"FIRST_COLLECTION",
	"FIRST_DOCUMENT",
	"FIRST_SEARCH",
	"WIDGET_EMBEDDED",
	"FIRST_TEAM_MEMBER",
	"FIRST_INTEGRATION",
	"FIRST_PAYMENT",
];

/**
 * Record an activation event for an organization.
 * Uses upsert so it's idempotent — re-recording the same event is a no-op.
 */
export async function recordActivationEvent(
	organizationId: string,
	eventType: ActivationEventKind,
	metadata?: Record<string, unknown>,
) {
	return db.activationEvent.upsert({
		where: {
			organizationId_eventType: { organizationId, eventType },
		},
		create: {
			organizationId,
			eventType,
			metadata: (metadata as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull,
		},
		update: {},
	});
}

/**
 * Get all activation events for an organization.
 */
export async function getActivationEvents(organizationId: string) {
	return db.activationEvent.findMany({
		where: { organizationId },
		orderBy: { completedAt: "asc" },
	});
}

/**
 * Check if a specific activation event has been completed.
 */
export async function hasActivationEvent(
	organizationId: string,
	eventType: ActivationEventKind,
): Promise<boolean> {
	const event = await db.activationEvent.findUnique({
		where: {
			organizationId_eventType: { organizationId, eventType },
		},
		select: { id: true },
	});
	return event !== null;
}

/**
 * Get the completion rate for activation events across all organizations.
 * Returns a map of eventType → { completed, total } counts.
 */
export async function getCompletionRates() {
	const [totalOrgs, allEvents] = await Promise.all([
		db.organization.count(),
		db.activationEvent.groupBy({
			by: ["eventType"],
			_count: { organizationId: true },
		}),
	]);

	const rates: Record<string, { completed: number; total: number }> = {};
	for (const eventType of ALL_ACTIVATION_EVENTS) {
		const found = allEvents.find((e) => e.eventType === eventType);
		rates[eventType] = {
			completed: found?._count.organizationId ?? 0,
			total: totalOrgs,
		};
	}
	return rates;
}

/**
 * Funnel step with completion numbers for visualization.
 */
export interface FunnelStep {
	eventType: string;
	label: string;
	completed: number;
	total: number;
	rate: number; // 0–100
	dropOff: number; // percentage drop from previous step (0 for first)
}

const FUNNEL_LABELS: Record<string, string> = {
	EMAIL_VERIFIED: "Email Verified",
	FIRST_COLLECTION: "First Collection",
	FIRST_DOCUMENT: "First Document",
	FIRST_SEARCH: "First Search",
	WIDGET_EMBEDDED: "Widget Embedded",
	FIRST_TEAM_MEMBER: "Team Member Invited",
	FIRST_INTEGRATION: "Connector Connected",
	FIRST_PAYMENT: "First Payment",
};

/**
 * Get onboarding funnel data — completion at each step with drop-off rates.
 */
export async function getFunnelData(): Promise<FunnelStep[]> {
	const rates = await getCompletionRates();
	const steps: FunnelStep[] = [];

	for (const eventType of ALL_ACTIVATION_EVENTS) {
		const { completed, total } = rates[eventType] ?? { completed: 0, total: 0 };
		const prev = steps.length > 0 ? steps[steps.length - 1] : null;
		const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
		const dropOff = prev ? prev.rate - rate : 0;

		steps.push({
			eventType,
			label: FUNNEL_LABELS[eventType] ?? eventType,
			completed,
			total,
			rate,
			dropOff,
		});
	}

	return steps;
}

/**
 * Time-to-first-value statistics in hours.
 * Returns the median time from org creation to FIRST_SEARCH event.
 */
export interface TimeToFirstValue {
	medianHours: number | null;
	meanHours: number | null;
	minHours: number | null;
	maxHours: number | null;
	count: number; // number of orgs with FIRST_SEARCH
}

export async function getTimeToFirstValue(): Promise<TimeToFirstValue> {
	const orgs = await db.organization.findMany({
		select: { id: true, createdAt: true },
	});

	const searchEvents = await db.activationEvent.findMany({
		where: { eventType: "FIRST_SEARCH" },
		select: { organizationId: true, completedAt: true },
	});

	const searchMap = new Map(searchEvents.map((e) => [e.organizationId, e.completedAt]));
	const diffHours: number[] = [];

	for (const org of orgs) {
		const searchAt = searchMap.get(org.id);
		if (!searchAt) continue;
		const diffMs = searchAt.getTime() - org.createdAt.getTime();
		if (diffMs <= 0) continue;
		diffHours.push(diffMs / (1000 * 60 * 60));
	}

	if (diffHours.length === 0) {
		return { medianHours: null, meanHours: null, minHours: null, maxHours: null, count: 0 };
	}

	diffHours.sort((a, b) => a - b);
	const n = diffHours.length;
	const mid = Math.floor(n / 2);
	const median = n % 2 === 0 ? (diffHours[mid - 1] + diffHours[mid]) / 2 : diffHours[mid];
	const mean = diffHours.reduce((a, b) => a + b, 0) / n;

	return {
		medianHours: Math.round(median * 100) / 100,
		meanHours: Math.round(mean * 100) / 100,
		minHours: Math.round(diffHours[0] * 100) / 100,
		maxHours: Math.round(diffHours[n - 1] * 100) / 100,
		count: n,
	};
}

/**
 * Cohort data — activation rate grouped by signup week.
 */
export interface CohortRow {
	week: string; // ISO week string e.g. "2026-W18"
	orgCount: number;
	emailVerified: number;
	firstCollection: number;
	firstDocument: number;
	firstSearch: number;
	widgetEmbedded: number;
	firstTeamMember: number;
	firstIntegration: number;
	firstPayment: number;
}

/** Helper: format a date as ISO week string. */
function getWeekKey(date: Date): string {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	// Set to nearest Thursday (ISO week rule)
	d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
	const year = d.getFullYear();
	const firstThursday = new Date(year, 0, 4);
	const weekNum = Math.ceil(
		((d.getTime() - firstThursday.getTime()) / 86400000 + firstThursday.getDay() + 1) / 7,
	);
	return `${year}-W${String(weekNum).padStart(2, "0")}`;
}

export async function getCohortData(): Promise<CohortRow[]> {
	const [orgs, allEvents] = await Promise.all([
		db.organization.findMany({ select: { id: true, createdAt: true } }),
		db.activationEvent.findMany({ select: { organizationId: true, eventType: true } }),
	]);

	// Group orgs by week
	const orgsByWeek = new Map<string, typeof orgs>();
	for (const org of orgs) {
		const week = getWeekKey(org.createdAt);
		const list = orgsByWeek.get(week) ?? [];
		list.push(org);
		orgsByWeek.set(week, list);
	}

	// Build event lookup set per org
	const eventSet = new Set<string>();
	for (const evt of allEvents) {
		eventSet.add(`${evt.organizationId}:${evt.eventType}`);
	}

	const cohorts: CohortRow[] = [];
	const sortedWeeks = Array.from(orgsByWeek.keys()).sort();

	for (const week of sortedWeeks) {
		const weekOrgs = orgsByWeek.get(week)!;
		const count = weekOrgs.length;

		const counts = {
			orgCount: count,
			emailVerified: 0,
			firstCollection: 0,
			firstDocument: 0,
			firstSearch: 0,
			widgetEmbedded: 0,
			firstTeamMember: 0,
			firstIntegration: 0,
			firstPayment: 0,
		};

		for (const org of weekOrgs) {
			if (eventSet.has(`${org.id}:EMAIL_VERIFIED`)) counts.emailVerified++;
			if (eventSet.has(`${org.id}:FIRST_COLLECTION`)) counts.firstCollection++;
			if (eventSet.has(`${org.id}:FIRST_DOCUMENT`)) counts.firstDocument++;
			if (eventSet.has(`${org.id}:FIRST_SEARCH`)) counts.firstSearch++;
			if (eventSet.has(`${org.id}:WIDGET_EMBEDDED`)) counts.widgetEmbedded++;
			if (eventSet.has(`${org.id}:FIRST_TEAM_MEMBER`)) counts.firstTeamMember++;
			if (eventSet.has(`${org.id}:FIRST_INTEGRATION`)) counts.firstIntegration++;
			if (eventSet.has(`${org.id}:FIRST_PAYMENT`)) counts.firstPayment++;
		}

		cohorts.push({
			week,
			...counts,
		});
	}

	return cohorts;
}

/**
 * Monthly cohort data — activation rate grouped by signup month.
 */
export interface MonthlyCohortRow {
	month: string; // ISO month string e.g. "2026-05"
	orgCount: number;
	emailVerified: number;
	firstCollection: number;
	firstDocument: number;
	firstSearch: number;
	widgetEmbedded: number;
	firstTeamMember: number;
	firstIntegration: number;
	firstPayment: number;
}

/** Helper: format a date as ISO month string (YYYY-MM). */
function getMonthKey(date: Date): string {
	const d = new Date(date);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function getMonthlyCohortData(): Promise<MonthlyCohortRow[]> {
	const [orgs, allEvents] = await Promise.all([
		db.organization.findMany({ select: { id: true, createdAt: true } }),
		db.activationEvent.findMany({ select: { organizationId: true, eventType: true } }),
	]);

	// Group orgs by month
	const orgsByMonth = new Map<string, typeof orgs>();
	for (const org of orgs) {
		const month = getMonthKey(org.createdAt);
		const list = orgsByMonth.get(month) ?? [];
		list.push(org);
		orgsByMonth.set(month, list);
	}

	// Build event lookup set per org
	const eventSet = new Set<string>();
	for (const evt of allEvents) {
		eventSet.add(`${evt.organizationId}:${evt.eventType}`);
	}

	const cohorts: MonthlyCohortRow[] = [];
	const sortedMonths = Array.from(orgsByMonth.keys()).sort();

	for (const month of sortedMonths) {
		const monthOrgs = orgsByMonth.get(month)!;
		const count = monthOrgs.length;

		const counts = {
			orgCount: count,
			emailVerified: 0,
			firstCollection: 0,
			firstDocument: 0,
			firstSearch: 0,
			widgetEmbedded: 0,
			firstTeamMember: 0,
			firstIntegration: 0,
			firstPayment: 0,
		};

		for (const org of monthOrgs) {
			if (eventSet.has(`${org.id}:EMAIL_VERIFIED`)) counts.emailVerified++;
			if (eventSet.has(`${org.id}:FIRST_COLLECTION`)) counts.firstCollection++;
			if (eventSet.has(`${org.id}:FIRST_DOCUMENT`)) counts.firstDocument++;
			if (eventSet.has(`${org.id}:FIRST_SEARCH`)) counts.firstSearch++;
			if (eventSet.has(`${org.id}:WIDGET_EMBEDDED`)) counts.widgetEmbedded++;
			if (eventSet.has(`${org.id}:FIRST_TEAM_MEMBER`)) counts.firstTeamMember++;
			if (eventSet.has(`${org.id}:FIRST_INTEGRATION`)) counts.firstIntegration++;
			if (eventSet.has(`${org.id}:FIRST_PAYMENT`)) counts.firstPayment++;
		}

		cohorts.push({
			month,
			...counts,
		});
	}

	return cohorts;
}

// ─── Health Score Distribution ─────────────────────────────────────

/** Bucket ranges for health score distribution. */
export interface HealthScoreBucket {
	label: string; // e.g. "0-20", "21-40", etc.
	minScore: number;
	maxScore: number;
	count: number;
}

/** Health score distribution across all organizations. */
export interface HealthScoreDistribution {
	totalOrgs: number;
	activeOrgs: number; // orgs with at least one activation event
	buckets: HealthScoreBucket[];
}

const DISTRIBUTION_WEIGHTS: Record<string, number> = {
	EMAIL_VERIFIED: 10,
	FIRST_COLLECTION: 15,
	FIRST_DOCUMENT: 20,
	FIRST_SEARCH: 20,
	WIDGET_EMBEDDED: 15,
	FIRST_TEAM_MEMBER: 10,
	FIRST_INTEGRATION: 5,
	FIRST_PAYMENT: 5,
};

const TOTAL_WEIGHT = Object.values(DISTRIBUTION_WEIGHTS).reduce((sum, w) => sum + w, 0);

function computeHealthScore(eventTypes: string[]): number {
	let score = 0;
	const completedSet = new Set(eventTypes);
	for (const [eventType, weight] of Object.entries(DISTRIBUTION_WEIGHTS)) {
		if (completedSet.has(eventType)) {
			score += Math.round((weight / TOTAL_WEIGHT) * 100);
		}
	}
	return Math.min(score, 100);
}

const BUCKET_DEFS: Array<{ label: string; min: number; max: number }> = [
	{ label: "0-20", min: 0, max: 20 },
	{ label: "21-40", min: 21, max: 40 },
	{ label: "41-60", min: 41, max: 60 },
	{ label: "61-80", min: 61, max: 80 },
	{ label: "81-100", min: 81, max: 100 },
];

export async function getHealthScoreDistribution(): Promise<HealthScoreDistribution> {
	const [allEvents, totalOrgs] = await Promise.all([
		db.activationEvent.findMany({
			select: { organizationId: true, eventType: true },
		}),
		db.organization.count(),
	]);

	const uniqueOrgIds = new Set(allEvents.map((e) => e.organizationId));

	// Initialize buckets
	const buckets: HealthScoreBucket[] = BUCKET_DEFS.map((def) => ({
		label: def.label,
		minScore: def.min,
		maxScore: def.max,
		count: 0,
	}));

	// Group events by org for scoring
	const orgEventMap = new Map<string, string[]>();
	for (const evt of allEvents) {
		const list = orgEventMap.get(evt.organizationId) ?? [];
		list.push(evt.eventType);
		orgEventMap.set(evt.organizationId, list);
	}

	for (const orgId of uniqueOrgIds) {
		const eventTypes = orgEventMap.get(orgId) ?? [];
		const score = computeHealthScore(eventTypes);
		for (const bucket of buckets) {
			if (score >= bucket.minScore && score <= bucket.maxScore) {
				bucket.count++;
				break;
			}
		}
	}

	return {
		totalOrgs,
		activeOrgs: uniqueOrgIds.size,
		buckets,
	};
}
