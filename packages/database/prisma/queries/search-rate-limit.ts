import { db } from "../client";

/**
 * Atomic fixed-window rate limit using Postgres upsert.
 * Returns the post-increment count for the current 60-second window.
 *
 * Calls are atomic: `INSERT ... ON CONFLICT DO UPDATE count = count + 1 RETURNING count`.
 */
export async function incrementRateLimitBucket(
	keyId: string,
	now: Date = new Date(),
): Promise<number> {
	const windowMs = 60_000;
	const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);

	const rows = await db.$queryRaw<Array<{ count: number }>>`
		INSERT INTO "search_rate_limit_bucket"("keyId", "windowStart", "count")
		VALUES (${keyId}, ${windowStart}, 1)
		ON CONFLICT ("keyId", "windowStart")
		DO UPDATE SET "count" = "search_rate_limit_bucket"."count" + 1
		RETURNING "count"
	`;
	return rows[0]?.count ?? 1;
}

/**
 * Cron-callable cleanup of buckets older than 1 hour.
 */
export async function cleanupRateLimitBuckets(): Promise<number> {
	const cutoff = new Date(Date.now() - 60 * 60_000);
	const result = await db.searchRateLimitBucket.deleteMany({
		where: { windowStart: { lt: cutoff } },
	});
	return result.count;
}
