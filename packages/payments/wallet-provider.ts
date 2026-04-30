import { manualWalletProvider } from "./provider/manual-wallet";
import { tochkaWalletProvider } from "./provider/tochka-wallet";
import type { WalletProvider } from "./wallet-types";

/**
 * Active wallet provider selection.
 *
 * Set `WALLET_PROVIDER` env to switch:
 *   - `tochka` (default for RUB top-ups)
 *   - `manual` (no live provider — invoice flow only)
 *
 * Mirrors the pattern of `provider/index.ts` (subscription provider) but
 * decoupled, since wallet flow is one-time top-up, not subscriptions.
 */

const selected = (process.env.WALLET_PROVIDER ?? "tochka").toLowerCase();

export const walletProvider: WalletProvider =
	selected === "manual" ? manualWalletProvider : tochkaWalletProvider;
