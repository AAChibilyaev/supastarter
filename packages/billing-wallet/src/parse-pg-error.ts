import {
	AiWalletFrozenError,
	AiWalletInsufficientFundsError,
	WalletNotFoundError,
} from "./types";

/**
 * Parse a Postgres `RAISE EXCEPTION` thrown from RPC functions and convert it
 * to a typed domain error. The RPCs use `ERRCODE = 'PXXXX'` plus a structured
 * message body like `AI_WALLET_INSUFFICIENT_FUNDS:1200:300`.
 */
export function parsePgRpcError(err: unknown): Error {
	const e = err as { code?: string; message?: string; meta?: { message?: string } };
	const message = e?.meta?.message ?? e?.message ?? "";

	if (message.includes("AI_WALLET_INSUFFICIENT_FUNDS")) {
		const m = message.match(/AI_WALLET_INSUFFICIENT_FUNDS:(\d+):(\d+)/);
		if (m) {
			return new AiWalletInsufficientFundsError(BigInt(m[1]), BigInt(m[2]));
		}
		return new AiWalletInsufficientFundsError(BigInt(0), BigInt(0));
	}
	if (message.includes("WALLET_FROZEN")) {
		const m = message.match(/WALLET_FROZEN:([^\s]+)/);
		return new AiWalletFrozenError(m?.[1] ?? "frozen");
	}
	if (message.includes("WALLET_NOT_FOUND")) {
		return new WalletNotFoundError();
	}
	return err as Error;
}
