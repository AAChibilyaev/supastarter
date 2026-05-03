import {
	getDataRetentionConfig,
	updateDataRetentionConfig,
} from "./procedures/data-retention-config";
import { migrateOrgData } from "./procedures/migrate-org-data";
import {
	checkRegionsHealth,
	getOrgRegion,
	listRegions,
	setOrgRegion,
} from "./procedures/regions";

export const complianceRouter = {
	getDataRetentionConfig,
	updateDataRetentionConfig,
	listRegions,
	getOrgRegion,
	setOrgRegion,
	checkRegionsHealth,
	migrateOrgData,
};
