import {
	getPendingDeletionRequests,
	anonymizeUserReferences,
	completeDeletionRequest,
} from "@repo/database";
import { logger } from "@repo/logs";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
	const expected = process.env.SEARCH_CRON_SECRET;
	if (!expected) {
		logger.warn(
			"SEARCH_CRON_SECRET is not set — process-pending-deletions cron will always reject requests",
		);
		return false;
	}
	const auth = request.headers.get("authorization");
	if (auth === `Bearer ${expected}`) return true;
	return request.headers.get("x-cron-secret") === expected;
}

export async function GET(request: Request) {
	if (!isAuthorized(request)) {
		return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	}

	logger.info("process-pending-deletions: checking for expired deletion requests");

	// Find all deletion requests past their retention period
	const pendingRequests = await getPendingDeletionRequests();

	if (pendingRequests.length === 0) {
		logger.info("process-pending-deletions: no pending deletions to process");
		return NextResponse.json({
			processed: 0,
			message: "No pending deletion requests past retention period.",
		});
	}

	logger.info("process-pending-deletions: processing expired requests", {
		count: pendingRequests.length,
	});

	let completed = 0;
	let errors = 0;

	for (const request of pendingRequests) {
		try {
			// Anonymize remaining references (in case any were missed)
			await anonymizeUserReferences(request.userId);

			// Mark request as completed
			await completeDeletionRequest(request.id);
			completed++;

			logger.info("process-pending-deletions: completed deletion", {
				userId: request.userId,
				deletionRequestId: request.id,
				reason: request.reason,
			});
		} catch (error) {
			errors++;
			logger.error("process-pending-deletions: failed to process request", {
				deletionRequestId: request.id,
				userId: request.userId,
				error,
			});
		}
	}

	logger.info("process-pending-deletions: finished", {
		processed: pendingRequests.length,
		completed,
		errors,
	});

	return NextResponse.json({
		processed: pendingRequests.length,
		completed,
		errors,
	});
}
