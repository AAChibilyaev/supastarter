import { getConfig } from "./procedures/config";
import {
	createFeatureFlagProcedure,
	deleteFeatureFlagProcedure,
	getFeatureFlagProcedure,
	getGlobalKillSwitchStatusProcedure,
	listAuditLogsProcedure,
	listFeatureFlagsProcedure,
	listOrgsForFlagsProcedure,
	listOverridesProcedure,
	removeOverrideProcedure,
	setOverrideProcedure,
	updateFeatureFlagProcedure,
} from "./procedures/feature-flags";
import { findOrganization } from "./procedures/find-organization";
import {
	getFxRateProcedure,
	listFxRates,
	syncFxRates,
	upsertFxRateProcedure,
} from "./procedures/fx-rates";
import { integrationChecks } from "./procedures/integration-checks";
import { listJobs } from "./procedures/list-jobs";
import { listOrganizations } from "./procedures/list-organizations";
import { listUsers } from "./procedures/list-users";
import {
	createRoadmapItemProcedure,
	deleteRoadmapItemProcedure,
	listRoadmapItemsProcedure,
	reorderRoadmapItemsProcedure,
	updateRoadmapItemProcedure,
} from "./procedures/roadmap";

export const adminRouter = {
	users: {
		list: listUsers,
	},
	organizations: {
		list: listOrganizations,
		find: findOrganization,
		search: listOrgsForFlagsProcedure,
	},
	config: getConfig,
	integrations: integrationChecks,
	jobs: listJobs,
	fxRates: {
		list: listFxRates,
		get: getFxRateProcedure,
		upsert: upsertFxRateProcedure,
		sync: syncFxRates,
	},
	roadmap: {
		list: listRoadmapItemsProcedure,
		create: createRoadmapItemProcedure,
		update: updateRoadmapItemProcedure,
		delete: deleteRoadmapItemProcedure,
		reorder: reorderRoadmapItemsProcedure,
	},
	featureFlags: {
		list: listFeatureFlagsProcedure,
		get: getFeatureFlagProcedure,
		create: createFeatureFlagProcedure,
		update: updateFeatureFlagProcedure,
		delete: deleteFeatureFlagProcedure,
		globalKillSwitch: getGlobalKillSwitchStatusProcedure,
		overrides: {
			list: listOverridesProcedure,
			set: setOverrideProcedure,
			remove: removeOverrideProcedure,
		},
		auditLogs: {
			list: listAuditLogsProcedure,
		},
	},
};
