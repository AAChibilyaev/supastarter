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
	createFeatureFlagAuditLog,
	listFeatureFlagAuditLogs,
} from "@repo/database";
import { z } from "zod";

import { adminProcedure } from "../../../orpc/procedures";
import { invalidateFlagCache, isGlobalKillSwitchActive } from "../../feature-flags/evaluator";
import { publishFlagChange } from "../../feature-flags/sse-publisher";

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

			// Audit log
			await createFeatureFlagAuditLog({
				flagId: flag.id,
				action: "created",
				field: null,
				oldValue: null,
				newValue: JSON.stringify({ key, title, type, enabled, rolloutPercentage }),
				performedById: user.id,
				performedByType: "user",
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
	.handler(async ({ input: { id, ...data }, context: { user } }) => {
		// Fetch the flag first to get the key and current values for cache invalidation, SSE, and audit
		const existing = await getFeatureFlag(id);
		const flagKey = existing?.key;

		const cleanedData: Record<string, unknown> = {};
		if (data.title !== undefined) cleanedData.title = data.title;
		if (data.description !== undefined) cleanedData.description = data.description;
		if (data.enabled !== undefined) cleanedData.enabled = data.enabled;
		if (data.rolloutPercentage !== undefined)
			cleanedData.rolloutPercentage = data.rolloutPercentage;
		if (data.killSwitch !== undefined) cleanedData.killSwitch = data.killSwitch;

		const result = await updateFeatureFlag(id, cleanedData);

		// Audit log each changed field
		if (existing) {
			const fieldLabels: Record<string, string> = {
				title: "title",
				description: "description",
				enabled: "enabled",
				rolloutPercentage: "rolloutPercentage",
				killSwitch: "killSwitch",
			};

			for (const [field, newValue] of Object.entries(cleanedData)) {
				const fieldLabel = fieldLabels[field] ?? field;
				const oldValue = (existing as Record<string, unknown>)[field];
				const oldStr = oldValue !== undefined ? String(oldValue) : null;
				const newStr = newValue !== undefined ? String(newValue) : null;

				if (oldStr !== newStr) {
					await createFeatureFlagAuditLog({
						flagId: id,
						action: "updated",
						field: fieldLabel,
						oldValue: oldStr,
						newValue: newStr,
						performedById: user.id,
						performedByType: "user",
					});
				}
			}
		}

		// Invalidate server-side cache and notify SSE clients
		if (flagKey) {
			invalidateFlagCache(flagKey);
			publishFlagChange({
				type: "flag_updated",
				flagKey,
				enabled: result.enabled,
			});
		}

		return result;
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
	.handler(async ({ input: { id }, context: { user } }) => {
		// Fetch the flag first to get the key for SSE notification and audit
		const existing = await getFeatureFlag(id);
		const flagKey = existing?.key;

		// Audit log before deletion
		if (existing) {
			await createFeatureFlagAuditLog({
				flagId: id,
				action: "deleted",
				field: null,
				oldValue: JSON.stringify({
					key: existing.key,
					title: existing.title,
					enabled: existing.enabled,
				}),
				newValue: null,
				performedById: user.id,
				performedByType: "user",
			});
		}

		await deleteFeatureFlag(id);

		// Notify SSE clients about deletion
		if (flagKey) {
			publishFlagChange({ type: "flag_deleted", flagKey });
		}

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
	.handler(async ({ input: { flagId, organizationId, enabled, reason }, context: { user } }) => {
		// Fetch the flag to get the key for SSE notification
		const flag = await getFeatureFlag(flagId);
		const flagKey = flag?.key;

		await setFeatureFlagOverride(flagId, organizationId, enabled, reason);

		// Audit log
		await createFeatureFlagAuditLog({
			flagId,
			action: "override_set",
			field: "enabled",
			oldValue: null,
			newValue: String(enabled),
			performedById: user.id,
			performedByType: "user",
			organizationId,
		});

		// Invalidate server-side cache and notify SSE clients
		if (flagKey) {
			invalidateFlagCache(flagKey);
			publishFlagChange({
				type: "override_updated",
				flagKey,
				organizationId,
				enabled,
			});
		}

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
	.handler(async ({ input: { flagId, organizationId }, context: { user } }) => {
		// Fetch the flag to get the key for SSE notification
		const flag = await getFeatureFlag(flagId);
		const flagKey = flag?.key;

		await removeFeatureFlagOverride(flagId, organizationId);

		// Audit log
		await createFeatureFlagAuditLog({
			flagId,
			action: "override_removed",
			field: null,
			oldValue: null,
			newValue: null,
			performedById: user.id,
			performedByType: "user",
			organizationId,
		});

		// Invalidate server-side cache and notify SSE clients
		if (flagKey) {
			invalidateFlagCache(flagKey);
			publishFlagChange({
				type: "override_updated",
				flagKey,
				organizationId,
				enabled: false,
			});
		}

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

// ─── Audit Log Procedures (AAC-880) ─────────────────────────────

export const listAuditLogsProcedure = adminProcedure
	.route({
		method: "GET",
		path: "/admin/feature-flags/{flagId}/audit-logs",
		tags: ["Administration"],
		summary: "List audit log entries for a feature flag",
	})
	.input(
		z.object({
			flagId: z.string(),
			limit: z.number().int().min(1).max(100).optional().default(50),
			offset: z.number().int().min(0).optional().default(0),
		}),
	)
	.handler(async ({ input: { flagId, limit, offset } }) => {
		return await listFeatureFlagAuditLogs(flagId, { limit, offset });
	});

// ─── Global Kill Switch Status (AAC-879) ─────────────────────────

export const getGlobalKillSwitchStatusProcedure = adminProcedure
	.route({
		method: "GET",
		path: "/admin/feature-flags/global-kill-switch",
		tags: ["Administration"],
		summary: "Check if the environment-level master kill switch is active",
	})
	.output(
		z.object({
			active: z.boolean(),
		}),
	)
	.handler(async () => {
		return { active: isGlobalKillSwitchActive() };
	});
