import {
	claimPendingReindexJob,
	completeReindexJob,
	failReindexJob,
	getReindexJobParams,
	getSearchIndexById,
	listPendingReindexJobs,
	updateReindexJobProgress,
	updateSearchIndexVersion,
} from "@repo/database";
import { logger } from "@repo/logs";
import * as Sentry from "@sentry/nextjs";
import {
	aliasName,
	reindexCollection,
	syncCurationsToTypesense,
	syncSynonymsToTypesense,
	type CurationRule,
	type SynonymPair,
} from "@repo/search";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
	const expected = process.env.SEARCH_CRON_SECRET;
	if (!expected) {
		logger.warn(
			"SEARCH_CRON_SECRET is not set — reindex-runner cron will always reject requests",
		);
		return false;
	}
	const auth = request.headers.get("authorization");
	if (auth === `Bearer ${expected}`) return true;
	return request.headers.get("x-cron-secret") === expected;
}

export async function POST(request: Request) {
	if (!isAuthorized(request)) {
		return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	}

	const pending = await listPendingReindexJobs();
	if (pending.length === 0) {
		return NextResponse.json({ processed: 0 });
	}

	let processed = 0;
	const errors: string[] = [];

	for (const pendingJob of pending) {
		const claimed = await claimPendingReindexJob(pendingJob.id);
		if (!claimed) continue;

		const params = await getReindexJobParams(pendingJob.id);
		if (!params || params.fields.length === 0) {
			await failReindexJob(pendingJob.id, "Missing reindex params");
			errors.push(`${pendingJob.id}: missing params`);
			continue;
		}

		const index = await getSearchIndexById(pendingJob.indexId);
		if (!index) {
			await failReindexJob(pendingJob.id, "Index not found");
			errors.push(`${pendingJob.id}: index not found`);
			continue;
		}

		try {
			const result = await reindexCollection({
				organizationId: pendingJob.organizationId,
				slug: pendingJob.slug,
				currentVersion: index.version,
				fields: params.fields as never,
				defaultSortingField: params.defaultSortingField,
				onProgress: (done, total) =>
					updateReindexJobProgress(pendingJob.id, done, total).catch(() => undefined),
			});

			await updateSearchIndexVersion(index.id, result.newVersion);
			await completeReindexJob(pendingJob.id, {
				processed: result.copiedDocuments,
				failed: result.failedDocuments,
			});

			// Re-apply synonyms and curations to the newly indexed collection.
			// The alias now points to the new physical collection, so syncing via
			// the alias propagates settings to it.
			const collection = aliasName(pendingJob.organizationId, pendingJob.slug);
			const schema =
				typeof index.schema === "object" && index.schema !== null
					? (index.schema as Record<string, unknown>)
					: {};
			const synonyms = Array.isArray(schema._synonyms)
				? (schema._synonyms as SynonymPair[])
				: [];
			const curations = Array.isArray(schema._curations)
				? (schema._curations as CurationRule[])
				: [];

			await Promise.all([
				syncSynonymsToTypesense(collection, synonyms).catch((err) =>
					logger.error("reindex-runner: synonym re-sync failed", {
						jobId: pendingJob.id,
						slug: pendingJob.slug,
						err,
					}),
				),
				syncCurationsToTypesense(collection, curations).catch((err) =>
					logger.error("reindex-runner: curation re-sync failed", {
						jobId: pendingJob.id,
						slug: pendingJob.slug,
						err,
					}),
				),
			]);

			logger.info("Reindex job completed", {
				jobId: pendingJob.id,
				organizationId: pendingJob.organizationId,
				slug: pendingJob.slug,
				newVersion: result.newVersion,
				copied: result.copiedDocuments,
				failed: result.failedDocuments,
				synonymsRestored: synonyms.length,
				curationsRestored: curations.length,
			});
			processed++;
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			await failReindexJob(pendingJob.id, msg);
			logger.error("Reindex job failed", {
				jobId: pendingJob.id,
				slug: pendingJob.slug,
				error,
			});
			Sentry.captureException(error, {
				tags: {
					"cron.job": "reindex-runner",
					"reindex.jobId": pendingJob.id,
					"reindex.slug": pendingJob.slug,
					"reindex.organizationId": pendingJob.organizationId,
				},
			});
			errors.push(`${pendingJob.id}: ${msg}`);
		}
	}

	return NextResponse.json({ processed, errors: errors.length > 0 ? errors : undefined });
}
