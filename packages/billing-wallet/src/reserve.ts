import { db } from "@repo/database";

import { parsePgRpcError } from "./parse-pg-error";
import type { ReserveAiCreditsInput, ReserveAiCreditsResult } from "./types";

export async function reserveAiCredits(
	input: ReserveAiCreditsInput,
): Promise<ReserveAiCreditsResult> {
	try {
		const rows = await db.$queryRaw<Array<{ reservation_id: string; available_kopecks: bigint }>>`
			SELECT * FROM reserve_ai_credits(
				${input.walletId}::text,
				${input.userId}::text,
				${input.organizationId}::text,
				${input.projectId ?? null}::text,
				${input.apiKeyId ?? null}::text,
				${input.operation}::text,
				${input.estimatedKopecks}::bigint,
				${input.idempotencyKey}::text,
				${(input.metadata ?? null) as never}::jsonb,
				interval '5 minutes'
			)
		`;
		const row = rows[0];
		if (!row) throw new Error("reserve_ai_credits returned no row");
		return {
			reservationId: row.reservation_id,
			availableKopecks: row.available_kopecks,
		};
	} catch (err) {
		throw parsePgRpcError(err);
	}
}
