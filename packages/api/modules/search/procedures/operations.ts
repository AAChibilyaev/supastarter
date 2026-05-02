import { getTypesenseClient } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import {
	requireSearchIndex,
	requireOrganizationAdmin,
	requireOrganizationMember,
} from "../lib/access";
import { searchIndexSlugSchema } from "../types";

// ── Presets ────────────────────────────────────────────────────

const presetSchema = z.object({
	name: z.string().min(1).max(200),
	value: z.record(z.string(), z.unknown()),
});

export const listPresets = protectedProcedure
	.route({
		method: "GET",
		path: "/search/indexes/{slug}/presets",
		tags: ["Search"],
		summary: "List search presets for an index",
	})
	.input(z.object({ organizationId: z.string(), slug: searchIndexSlugSchema }))
	.output(z.array(presetSchema))
	.handler(async ({ input, context }) => {
		await requireOrganizationMember(input.organizationId, context.user.id);
		await requireSearchIndex(input.organizationId, input.slug);
		const client = getTypesenseClient();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const presets = (await (client as any).presets().retrieve()) as any;
		return (presets?.presets ?? []).map((p: any) => ({
			name: p.name,
			value: p.value ?? {},
		}));
	});

export const upsertPreset = protectedProcedure
	.route({
		method: "PUT",
		path: "/search/indexes/{slug}/presets",
		tags: ["Search"],
		summary: "Create or update a search preset",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			name: z.string().min(1).max(200),
			value: z.record(z.string(), z.unknown()),
		}),
	)
	.output(presetSchema)
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);
		await requireSearchIndex(input.organizationId, input.slug);
		const client = getTypesenseClient();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		await (client as any).presets().upsert(input.name, { value: input.value });
		return { name: input.name, value: input.value };
	});

// ── Aliases ────────────────────────────────────────────────────

export const listAliases = protectedProcedure
	.route({
		method: "GET",
		path: "/search/aliases",
		tags: ["Search"],
		summary: "List collection aliases",
	})
	.input(z.object({ organizationId: z.string() }))
	.output(z.array(z.object({ name: z.string(), collection: z.string() })))
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);
		const client = getTypesenseClient();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const aliases = (await (client as any).aliases().retrieve()) as any;
		return (aliases?.aliases ?? []).map((a: any) => ({
			name: a.name,
			collection: a.collection_name,
		}));
	});

export const upsertAlias = protectedProcedure
	.route({
		method: "PUT",
		path: "/search/aliases",
		tags: ["Search"],
		summary: "Create or update a collection alias",
	})
	.input(
		z.object({
			organizationId: z.string(),
			name: z.string().min(1).max(200),
			collection: z.string().min(1).max(200),
		}),
	)
	.output(z.object({ name: z.string(), collection: z.string() }))
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);
		const client = getTypesenseClient();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		await (client as any).aliases().upsert(input.name, {
			collection_name: input.collection,
		});
		return { name: input.name, collection: input.collection };
	});

// ── Snapshots ──────────────────────────────────────────────────

export const createSnapshot = protectedProcedure
	.route({
		method: "POST",
		path: "/search/snapshot",
		tags: ["Search"],
		summary: "Create a database snapshot for backup",
	})
	.input(z.object({ organizationId: z.string(), snapshotPath: z.string().optional() }))
	.output(z.object({ success: z.boolean(), path: z.string().optional() }))
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);
		const client = getTypesenseClient();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const result = (await (client as any).operations().perform("snapshot", {
			snapshot_path: input.snapshotPath,
		})) as any;
		return { success: result?.success ?? false, path: result?.snapshot_path as string };
	});

// ── Health ─────────────────────────────────────────────────────

export const healthCheck = protectedProcedure
	.route({
		method: "GET",
		path: "/search/health",
		tags: ["Search"],
		summary: "Typesense cluster health check",
	})
	.output(
		z.object({
			ok: z.boolean(),
			version: z.string().optional(),
			uptimeSeconds: z.number().optional(),
			memoryUsage: z.string().optional(),
		}),
	)
	.handler(async () => {
		const client = getTypesenseClient();
		try {
			const health = (await (client as any).health.retrieve()) as any;
			const metrics = (await (client as any).metrics.retrieve()) as any;
			return {
				ok: health?.ok ?? false,
				version: metrics?.version as string,
				uptimeSeconds: metrics?.system_cpu1_active_percentage as number,
				memoryUsage: metrics?.system_memory_total_bytes
					? `${Math.round((metrics.system_memory_used_bytes / metrics.system_memory_total_bytes) * 100)}%`
					: undefined,
			};
		} catch {
			return { ok: false };
		}
	});
