import { cancelReindex } from "./procedures/cancel-reindex";
import { deltaSync } from "./procedures/delta-sync";
import { healthStats } from "./procedures/health";
import { reindex } from "./procedures/reindex";
import { reindexHistory } from "./procedures/reindex-history";
import { reindexStatus } from "./procedures/reindex-status";
import {
	createSchedule,
	deleteSchedule,
	listSchedules,
	updateSchedule,
} from "./procedures/schedule";

export const indexingRouter = {
	reindex,
	deltaSync,
	cancelReindex,
	reindexStatus,
	reindexHistory,
	schedules: {
		list: listSchedules,
		create: createSchedule,
		update: updateSchedule,
		delete: deleteSchedule,
	},
	health: healthStats,
};
