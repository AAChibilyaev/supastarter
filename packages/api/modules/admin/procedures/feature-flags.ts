import {
	listFeatureFlags,
	getFeatureFlag,
	createFeatureFlag,
	updateFeatureFlag,
	deleteFeatureFlag,
	setFeatureFlagOverride,
	removeFeatureFlagOverride,
	listFeatureFlagOverrides,
	listOrganizationsForFlags,
} from "@repo/database";
import { z } from "zod";

import { invalidateFlagCache } from "../../../modules/feature-flags/evaluator";
import { publishFlagChange } from "../../../modules/feature-flags/sse-publisher";
import { adminProcedure } from "../../../orpc/procedures";

export const listFeatureFlagsProcedure = adminProcedure
	.route({
		method: "GET",
		path: "/admin/feature-flags",
		tags: ["Administration"],
		summary: "List all feature flags",
	})
	.output(
		z.array(
			z.object({
				id: z.string(),
				key: z.string(),
				title: z.string(),
				description: z.string().nullable(),
				type: z.string(),
				enabled: z.boolean(),
				rolloutPercentage: z.number().int().nullable(),
				killSwitch: z.boolean(),
				createdAt: z.date(),
				updatedAt: z.date(),
				createdBy: z.string().nullable(),
				_count: z.object({
					overrides: z.number(),
				}),
			}),
		),
	)
	.handler(async () => {
		return await listFeatureFlags();
	});

export const getFeatureFlagProcedure = adminProcedure
	.route({
		method: "GET",
		path: "/admin/feature-flags/{id}",
		tags: ["Administration"],
		summary: "Get a single feature flag with overrides",
	})
	.input(
		z.object({
			id: z.string(),
		}),
	)
	.handler(async ({ input: { id } }) => {
		return await getFeatureFlag(id);
	});

export const createFeatureFlagProcedure = adminProcedure
	.route({
		method: "POST",
		path: "/admin/feature-flags",
		tags: ["Administration"],
		summary: "Create a new feature flag",
	})
	.input(
		z.object({
			key: z
				.string()
				.min(1)
				.max(64)
				.regex(/^[a-z0-9_-]+$/),
			title: z.string().min(1).max(128),
			description: z.string().optional(),
			type: z.enum(["boolean", "variant"]).default("boolean"),
			enabled: z.boolean().default(false),
			rolloutPercentage: z.number().int().min(0).max(100).optional(),
		}),
	)
	.output(
		z.object({
			id: z.string(),
			key: z.string(),
		}),
	)
	.handler(
		async ({
			input: { key, title, description, type, enabled, rolloutPercentage },
			context: { user },
		}) => {
			const flag = await createFeatureFlag({
				key,
				title,
				description: description ?? null,
				type,
				enabled,
				rolloutPercentage: rolloutPercentage ?? null,
				createdBy: user.id,
			});
			return { id: flag.id, key: flag.key };
		},
	);

export const updateFeatureFlagProcedure = adminProcedure
	.route({
		method: "PUT",
		path: "/admin/feature-flags/{id}",
		tags: ["Administration"],
		summary: "Update a feature flag",
	})
	.input(
		z.object({
			id: z.string(),
			title: z.string().min(1).max(128).optional(),
			description: z.string().optional().nullable(),
			enabled: z.boolean().optional(),
			rolloutPercentage: z.number().int().min(0).max(100).optional().nullable(),
			killSwitch: z.boolean().optional(),
		}),
	)
	.handler(async ({ input: { id, ...data } }) => {
		const cleanedData: Record<string, unknown> = {};
		if (data.title !== undefined) cleanedData.title = data.title;
		if (data.description !== undefined) cleanedData.description = data.description;
		if (data.enabled !== undefined) cleanedData.enabled = data.enabled;
		if (data.rolloutPercentage !== undefined)
			cleanedData.rolloutPercentage = data.rolloutPercentage;
		if (data.killSwitch !== undefined) cleanedData.killSwitch = data.killSwitch;

		return await updateFeatureFlag(id, cleanedData);
	});

export const deleteFeatureFlagProcedure = adminProcedure
	.route({
		method: "DELETE",
		path: "/admin/feature-flags/{id}",
		tags: ["Administration"],
		summary: "Delete a feature flag",
	})
	.input(
		z.object({
			id: z.string(),
		}),
	)
	.output(
		z.object({
			success: z.boolean(),
		}),
	)
	.handler(async ({ input: { id } }) => {
		await deleteFeatureFlag(id);
		return { success: true };
	});

export const listOverridesProcedure = adminProcedure
	.route({
		method: "GET",
		path: "/admin/feature-flags/{flagId}/overrides",
		tags: ["Administration"],
		summary: "List overrides for a feature flag",
	})
	.input(
		z.object({
			flagId: z.string(),
		}),
	)
	.handler(async ({ input: { flagId } }) => {
		return await listFeatureFlagOverrides(flagId);
	});

export const setOverrideProcedure = adminProcedure
	.route({
		method: "PUT",
		path: "/admin/feature-flags/{flagId}/overrides/{organizationId}",
		tags: ["Administration"],
		summary: "Set a per-organization feature flag override",
	})
	.input(
		z.object({
			flagId: z.string(),
			organizationId: z.string(),
			enabled: z.boolean(),
			reason: z.string().optional(),
		}),
	)
	.output(
		z.object({
			success: z.boolean(),
		}),
	)
	.handler(async ({ input: { flagId, organizationId, enabled, reason } }) => {
		await setFeatureFlagOverride(flagId, organizationId, enabled, reason);
		return { success: true };
	});

export const removeOverrideProcedure = adminProcedure
	.route({
		method: "DELETE",
		path: "/admin/feature-flags/{flagId}/overrides/{organizationId}",
		tags: ["Administration"],
		summary: "Remove a per-organization feature flag override",
	})
	.input(
		z.object({
			flagId: z.string(),
			organizationId: z.string(),
		}),
	)
	.output(
		z.object({
			success: z.boolean(),
		}),
	)
	.handler(async ({ input: { flagId, organizationId } }) => {
		await removeFeatureFlagOverride(flagId, organizationId);
		return { success: true };
	});

export const listOrgsForFlagsProcedure = adminProcedure
	.route({
		method: "GET",
		path: "/admin/organizations/search",
		tags: ["Administration"],
		summary: "Search organizations for feature flag override assignment",
	})
	.input(
		z.object({
			query: z.string().optional(),
		}),
	)
	.handler(async ({ input: { query } }) => {
		return await listOrganizationsForFlags(query);
	});
