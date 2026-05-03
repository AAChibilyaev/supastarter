import { getConfig } from "./procedures/config";
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
};
