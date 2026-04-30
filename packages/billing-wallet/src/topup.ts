import { db } from "@repo/database";

import { parsePgRpcError } from "./parse-pg-error";
import type {
	AdminAdjustWalletInput,
	ApplyTopupCreditInput,
	ApplyTopupCreditResult,
} from "./types";

export async function applyTopupCredit(
	input: ApplyTopupCreditInput,
): Promise<ApplyTopupCreditResult> {
	try {
		const rows = await db.$queryRaw<
			Array<{ order_id: string; applied: boolean; new_balance: bigint }>
		>`
			SELECT * FROM apply_topup_credit(
				${input.providerOperationId}::text,
				${input.providerPaymentId}::text,
				${input.amountKopecks}::bigint,
				${input.eventId}::text
			)
		`;
		const row = rows[0];
		if (!row) throw new Error("apply_topup_credit returned no row");
		return {
			orderId: row.order_id,
			applied: row.applied,
			newBalanceKopecks: row.new_balance,
		};
	} catch (err) {
		throw parsePgRpcError(err);
	}
}

export async function adminAdjustWallet(input: AdminAdjustWalletInput): Promise<bigint> {
	try {
		const rows = await db.$queryRaw<Array<{ admin_adjust_wallet: bigint }>>`
			SELECT admin_adjust_wallet(
				${input.walletId}::text,
				${input.amountKopecks}::bigint,
				${input.direction}::text,
				${input.reason}::text,
				${input.adminUserId}::text
			)
		`;
		return rows[0]?.admin_adjust_wallet ?? BigInt(0);
	} catch (err) {
		throw parsePgRpcError(err);
	}
}
