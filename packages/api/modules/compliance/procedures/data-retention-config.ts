import { db } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin } from "../../search/lib/access";

export const DATA_RETENTION_CONFIG_KEY = "dataRetention";

export const dataRetentionConfigSchema = z.object({
	searchUsageRetentionDays: z.number().int().min(0).max(3650).default(365),
	auditLogRetentionDays: z.number().int().min(0).max(3650).default(365),
	ingestBufferRetentionDays: z.number().int().min(0).max(3650).default(90),
	autoDeleteEnabled: z.boolean().default(true),
	deletionSchedule: z.enum(["daily", "weekly", "monthly"]).default("daily"),
});

export type DataRetentionConfig = z.infer<typeof dataRetentionConfigSchema>;

export const DEFAULT_DATA_RETENTION_CONFIG: DataRetentionConfig = {
	searchUsageRetentionDays: 365,
	auditLogRetentionDays: 365,
	ingestBufferRetentionDays: 90,
	autoDeleteEnabled: true,
	deletionSchedule: "daily",
};

export const getDataRetentionConfig = protectedProcedure
	.route({
		method: "GET",
		path: "/compliance/data-retention-config",
		tags: ["Compliance"],
		summary: "Get data retention policy configuration",
		description:
			"Returns the current data retention policy: retention periods for search usage events, audit logs, and ingest buffer data.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(dataRetentionConfigSchema)
	.handler(async ({ input: { organizationId }, context: { user } }) => {
		await requireOrganizationAdmin(organizationId, user);

		const org = await db.organization.findUniqueOrThrow({
			where: { id: organizationId },
			select: { metadata: true },
		});

		return readDataRetentionConfig(org.metadata);
	});

export const updateDataRetentionConfig = protectedProcedure
	.route({
		method: "PUT",
		path: "/compliance/data-retention-config",
		tags: ["Compliance"],
		summary: "Update data retention policy configuration",
		description:
			"Updates the data retention policy settings and persists to the organization metadata.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			config: dataRetentionConfigSchema,
		}),
	)
	.output(
		z.object({
			success: z.boolean(),
			config: dataRetentionConfigSchema,
		}),
	)
	.handler(async ({ input: { organizationId, config }, context: { user } }) => {
		await requireOrganizationAdmin(organizationId, user);

		const org = await db.organization.findUniqueOrThrow({
			where: { id: organizationId },
			select: { metadata: true },
		});

		const metadata = parseOrgMetadata(org.metadata);
		metadata[DATA_RETENTION_CONFIG_KEY] = config;

		await db.organization.update({
			where: { id: organizationId },
			data: { metadata: JSON.stringify(metadata) },
		});

		return { success: true, config };
	});

export function readDataRetentionConfig(rawMetadata: string | null): DataRetentionConfig {
	const metadata = parseOrgMetadata(rawMetadata);
	const stored = metadata[DATA_RETENTION_CONFIG_KEY];
	if (!stored || typeof stored !== "object") {
		return DEFAULT_DATA_RETENTION_CONFIG;
	}
	const parsed = dataRetentionConfigSchema.safeParse(stored);
	if (!parsed.success) {
		return DEFAULT_DATA_RETENTION_CONFIG;
	}
	return parsed.data;
}

interface OrgMetadata {
	dataRetention?: unknown;
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
