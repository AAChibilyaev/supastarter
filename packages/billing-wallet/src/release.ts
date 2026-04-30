import { db } from "@repo/database";

import { parsePgRpcError } from "./parse-pg-error";
import type { ReleaseAiReservationInput } from "./types";

export async function releaseAiReservation(input: ReleaseAiReservationInput): Promise<void> {
	try {
		await db.$queryRaw`
			SELECT release_ai_reservation(
				${input.reservationId}::text,
				${input.idempotencyKey}::text,
				${input.reason}::text
			)
		`;
	} catch (err) {
		throw parsePgRpcError(err);
	}
}

export async function expireStaleReservations(): Promise<number> {
	const rows = await db.$queryRaw<Array<{ expire_stale_reservations: number }>>`
		SELECT expire_stale_reservations()
	`;
	return rows[0]?.expire_stale_reservations ?? 0;
}
