import { z } from "zod";

import { protectedProcedure } from "../../orpc/procedures";
import { isFeatureEnabled, invalidateFlagCache } from "./evaluator";

/**
 * Check whether a feature flag is enabled for the caller's active organization.
 * Derives the organization ID from the session context.
 */
export const checkFeatureFlag = protectedProcedure
	.route({
		method: "GET",
		path: "/feature-flags/check/{flagKey}",
		tags: ["Feature Flags"],
		summary: "Check if a feature flag is enabled for the current organization",
	})
	.input(
		z.object({
			flagKey: z.string().min(1).max(128),
		}),
	)
	.output(
		z.object({
			enabled: z.boolean(),
			flagKey: z.string(),
			organizationId: z.string(),
		}),
	)
	.handler(async ({ input: { flagKey }, context: { session } }) => {
		const organizationId = session.activeOrganizationId;
		if (!organizationId) {
			return { enabled: false, flagKey, organizationId: "" };
		}
		const enabled = await isFeatureEnabled(organizationId, flagKey);
		return { enabled, flagKey, organizationId };
	});

/**
 * Batch check multiple feature flags for the caller's active organization.
 */
export const batchCheckFlags = protectedProcedure
	.route({
		method: "POST",
		path: "/feature-flags/check/batch",
		tags: ["Feature Flags"],
		summary: "Batch check multiple feature flags",
	})
	.input(
		z.object({
			flagKeys: z.array(z.string().min(1).max(128)).min(1).max(50),
		}),
	)
	.output(z.record(z.string(), z.boolean()))
	.handler(async ({ input: { flagKeys }, context: { session } }) => {
		const organizationId = session.activeOrganizationId;
		if (!organizationId) {
			return Object.fromEntries(flagKeys.map((k) => [k, false]));
		}

		const results: Record<string, boolean> = {};
		for (const key of flagKeys) {
			results[key] = await isFeatureEnabled(organizationId, key);
		}
		return results;
	});

/**
 * Invalidate the cache for a specific feature flag.
 * Useful after updating a flag's configuration via the admin.
 */
export const invalidateFlagCacheProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/feature-flags/cache/invalidate",
		tags: ["Feature Flags"],
		summary: "Invalidate cache for a specific feature flag",
	})
	.input(
		z.object({
			flagKey: z.string().min(1).max(128),
		}),
	)
	.output(
		z.object({
			success: z.boolean(),
		}),
	)
	.handler(async ({ input: { flagKey } }) => {
		invalidateFlagCache(flagKey);
		return { success: true };
	});
