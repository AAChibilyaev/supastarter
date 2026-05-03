import { batchCheckFlags, checkFeatureFlag, invalidateFlagCacheProcedure } from "./procedures";

export const featureFlagsRouter = {
	check: checkFeatureFlag,
	batch: batchCheckFlags,
	invalidateCache: invalidateFlagCacheProcedure,
};
