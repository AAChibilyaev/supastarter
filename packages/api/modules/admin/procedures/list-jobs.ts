import { db } from "@repo/database";
import { z } from "zod";

import { adminProcedure } from "../../../orpc/procedures";

const JOB_DEFINITIONS = [
	{
		name: "Search flush cron",
		path: "/api/cron/search-flush",
		secretEnv: "SEARCH_CRON_SECRET",
	},
	{
		name: "Expire reservations cron",
		path: "/api/cron/expire-reservations",
		secretEnv: "WALLET_CRON_SECRET",
	},
	{
		name: "Reconcile Tochka topups cron",
		path: "/api/cron/reconcile-tochka-topups",
		secretEnv: "WALLET_CRON_SECRET",
	},
] as const;

export const listJobs = adminProcedure
	.route({
		method: "GET",
		path: "/admin/jobs",
		tags: ["Administration"],
		summary: "List background jobs and their status",
	})
	.input(z.object({}))
	.handler(async () => {
		const jobs = JOB_DEFINITIONS.map((job) => {
			const secret = process.env[job.secretEnv];
			const configured = Boolean(secret);

			return {
				name: job.name,
				path: job.path,
				configured,
				secretPreview: configured ? `${secret!.slice(0, 8)}…${secret!.slice(-4)}` : null,
			};
		});

		// ── Recent job activity from search connector sync jobs ──────────
		const recentSyncJobs = await db.searchConnectorSyncJob.findMany({
			orderBy: { id: "desc" },
			take: 20,
		});

		const recentActivity = recentSyncJobs.map((syncJob) => ({
			id: syncJob.id,
			type: syncJob.type,
			status: syncJob.status,
			itemsCount: syncJob.itemsCount,
			startedAt: syncJob.startedAt,
			finishedAt: syncJob.finishedAt,
		}));

		return {
			jobs,
			recentSyncActivity: recentActivity,
			totalSyncJobs: await db.searchConnectorSyncJob.count(),
		};
	});
