import { ORPCError } from "@orpc/client";
import { db } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin } from "../lib/access";

// ─── Types ────────────────────────────────────────────────────────────────

const ALERT_RESOURCES = ["search", "ingest"] as const;
const ALERT_CHANNELS = ["email", "webhook", "slack"] as const;

const alertThresholdSchema = z.object({
	threshold: z.number().min(0).max(1),
	enabled: z.boolean(),
});

const alertResourceRulesSchema = z.object({
	thresholds: z.array(alertThresholdSchema).min(1).max(5),
});

const alertRuleSchema = z.object({
	resource: z.enum(ALERT_RESOURCES),
	enabled: z.boolean(),
	thresholds: z.array(alertThresholdSchema).min(1).max(5),
	channels: z.array(z.enum(ALERT_CHANNELS)).min(1),
	cooldownHours: z.number().int().min(1).max(168).default(24),
});

const alertSettingsSchema = z.object({
	slackWebhookUrl: z.string().url().nullable(),
	rules: z.array(alertRuleSchema),
});

export type AlertRule = z.infer<typeof alertRuleSchema>;
export type AlertSettings = z.infer<typeof alertSettingsSchema>;

// ─── Org metadata helpers ─────────────────────────────────────────────────

const DEFAULT_THRESHOLDS = [
	{ threshold: 0.5, enabled: true },
	{ threshold: 0.8, enabled: true },
	{ threshold: 1.0, enabled: true },
];

interface OrgMetadata {
	alertRules?: AlertRule[];
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

function buildDefaultRules(): AlertRule[] {
	return ALERT_RESOURCES.map((resource) => ({
		resource,
		enabled: true,
		thresholds: [...DEFAULT_THRESHOLDS],
		channels: ["email"],
		cooldownHours: 24,
	}));
}

function mergeRules(existing: AlertRule[] | undefined): AlertRule[] {
	if (!existing || existing.length === 0) return buildDefaultRules();

	// Ensure all resources have rules
	const resourceMap = new Map(existing.map((r) => [r.resource, r]));
	for (const resource of ALERT_RESOURCES) {
		if (!resourceMap.has(resource)) {
			resourceMap.set(resource, {
				resource,
				enabled: true,
				thresholds: [...DEFAULT_THRESHOLDS],
				channels: ["email"],
				cooldownHours: 24,
			});
		}
	}

	return ALERT_RESOURCES.map((r) => resourceMap.get(r)!);
}

// ─── Procedures ───────────────────────────────────────────────────────────

export const getAlertRules = protectedProcedure
	.route({
		method: "GET",
		path: "/search/alert-rules",
		tags: ["Search", "Settings"],
		summary: "Get alert rules",
		description: "Returns quota alert configuration for the organization.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(
		alertSettingsSchema.extend({
			rules: z.array(alertRuleSchema),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);

		const org = await db.organization.findUnique({
			where: { id: input.organizationId },
			select: { metadata: true },
		});

		if (!org) {
			throw new ORPCError("NOT_FOUND");
		}

		const meta = parseOrgMetadata(org.metadata);

		return {
			slackWebhookUrl: meta.slackWebhookUrl ?? null,
			rules: mergeRules(meta.alertRules),
		};
	});

export const updateAlertRules = protectedProcedure
	.route({
		method: "PUT",
		path: "/search/alert-rules",
		tags: ["Search", "Settings"],
		summary: "Update alert rules",
		description: "Updates quota alert thresholds, channels, and cooldown settings.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			rules: z.array(alertRuleSchema),
			slackWebhookUrl: z.string().url().nullable().optional(),
		}),
	)
	.output(alertSettingsSchema.extend({ success: z.literal(true) }))
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);

		const org = await db.organization.findUnique({
			where: { id: input.organizationId },
			select: { metadata: true },
		});

		if (!org) {
			throw new ORPCError("NOT_FOUND");
		}

		const meta = parseOrgMetadata(org.metadata);

		const updated: OrgMetadata = {
			...meta,
			alertRules: input.rules,
			slackWebhookUrl: input.slackWebhookUrl ?? undefined,
		};

		await db.organization.update({
			where: { id: input.organizationId },
			data: { metadata: JSON.stringify(updated) },
		});

		return {
			slackWebhookUrl: updated.slackWebhookUrl ?? null,
			rules: input.rules,
			success: true as const,
		};
	});
