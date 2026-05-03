import { db } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin } from "../lib/access";

const personalizationConfigSchema = z.object({
	sourceEvents: z
		.array(z.enum(["click", "purchase", "view"]))
		.min(1, "At least one source event required")
		.default(["click", "purchase"]),
	decayFactor: z.number().min(0.1).max(1.0).default(0.7),
	minEventsPerUser: z.number().int().min(0).max(100).default(5),
	timeWindowDays: z.number().int().min(1).max(365).default(30),
});

export type PersonalizationConfig = z.infer<typeof personalizationConfigSchema>;

export const DEFAULT_PERSONALIZATION_CONFIG: PersonalizationConfig = {
	sourceEvents: ["click", "purchase"],
	decayFactor: 0.7,
	minEventsPerUser: 5,
	timeWindowDays: 30,
};

export const PERSONALIZATION_CONFIG_KEY = "personalizationConfig";

export const getPersonalizationConfig = protectedProcedure
	.route({
		method: "GET",
		path: "/recommendations/personalization-config",
		tags: ["Recommendations"],
		summary: "Get personalization model configuration",
		description:
			"Returns the current personalization model configuration: source events, decay factor, min events per user, time window.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(personalizationConfigSchema)
	.handler(async ({ input: { organizationId }, context: { user } }) => {
		await requireOrganizationAdmin(organizationId, user);

		const org = await db.organization.findUniqueOrThrow({
			where: { id: organizationId },
			select: { metadata: true },
		});

		return readPersonalizationConfig(org.metadata);
	});

export const updatePersonalizationConfig = protectedProcedure
	.route({
		method: "PUT",
		path: "/recommendations/personalization-config",
		tags: ["Recommendations"],
		summary: "Update personalization model configuration",
		description: "Updates the personalization model settings and persists to the organization.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			config: personalizationConfigSchema,
		}),
	)
	.output(
		z.object({
			success: z.boolean(),
			config: personalizationConfigSchema,
		}),
	)
	.handler(async ({ input: { organizationId, config }, context: { user } }) => {
		await requireOrganizationAdmin(organizationId, user);

		const org = await db.organization.findUniqueOrThrow({
			where: { id: organizationId },
			select: { metadata: true },
		});

		const metadata = parseOrgMetadata(org.metadata);
		metadata[PERSONALIZATION_CONFIG_KEY] = config;

		await db.organization.update({
			where: { id: organizationId },
			data: { metadata: JSON.stringify(metadata) },
		});

		return { success: true, config };
	});

export function readPersonalizationConfig(rawMetadata: string | null): PersonalizationConfig {
	const metadata = parseOrgMetadata(rawMetadata);
	const stored = metadata[PERSONALIZATION_CONFIG_KEY];
	if (!stored || typeof stored !== "object") {
		return DEFAULT_PERSONALIZATION_CONFIG;
	}
	const parsed = personalizationConfigSchema.safeParse(stored);
	if (!parsed.success) {
		return DEFAULT_PERSONALIZATION_CONFIG;
	}
	return parsed.data;
}

interface OrgMetadata {
	quotaAlerts?: unknown;
	slackWebhookUrl?: string;
	quotaAlertThresholds?: number[];
	personalizationConfig?: unknown;
	[key: string]: unknown;
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
