import { db } from "@repo/database";
import { logger } from "@repo/logs";

import { notifyLowBalance } from "./notify-low-balance";
import { parsePgRpcError } from "./parse-pg-error";
import type { CommitAiUsageInput, CommitAiUsageResult } from "./types";

export async function commitAiUsage(input: CommitAiUsageInput): Promise<CommitAiUsageResult> {
	try {
		const rows = await db.$queryRaw<
			Array<{ usage_event_id: string; charged_kopecks: bigint; remaining: bigint }>
		>`
			SELECT * FROM commit_ai_usage(
				${input.reservationId}::text,
				${input.idempotencyKey}::text,
				${input.provider}::text,
				${input.model}::text,
				${input.pricingRuleId}::text,
				${input.promptTokens}::int,
				${input.completionTokens}::int,
				${input.inputCostKopecks}::bigint,
				${input.outputCostKopecks}::bigint,
				${input.flatFeeKopecks}::bigint,
				${input.markupBps}::int,
				${input.totalChargeKopecks}::bigint,
				${input.providerCostUsdMicros}::bigint,
				${input.fxRateRubPerUsdMicros}::bigint,
				${input.requestId ?? null}::text,
				${input.status}::text,
				${(input.metadata ?? null) as never}::jsonb
			)
		`;
		const row = rows[0];
		if (!row) throw new Error("commit_ai_usage returned no row");

		// Fire-and-forget: notify if balance is low after charge
		// Use the reservation's walletId — we need to find it first
		if (input.reservationId) {
			const reservation = await db.aiQuotaReservation.findUnique({
				where: { id: input.reservationId },
				select: { walletId: true },
			});
			if (reservation) {
				notifyLowBalance(reservation.walletId).catch((err: unknown) =>
					logger.error("commitAiUsage: notifyLowBalance failed", err),
				);
			}
		}

		return {
			usageEventId: row.usage_event_id,
			chargedKopecks: row.charged_kopecks,
			remaining: row.remaining,
		};
	} catch (err) {
		throw parsePgRpcError(err);
	}
}
