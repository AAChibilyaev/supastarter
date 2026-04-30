export type AiWalletOwner = { organizationId: string } | { userId: string };

export interface ReserveAiCreditsInput {
	walletId: string;
	userId: string | null;
	organizationId: string | null;
	projectId?: string | null;
	apiKeyId?: string | null;
	operation: string;
	estimatedKopecks: bigint;
	idempotencyKey: string;
	metadata?: Record<string, unknown>;
}

export interface ReserveAiCreditsResult {
	reservationId: string;
	availableKopecks: bigint;
}

export interface CommitAiUsageInput {
	reservationId: string;
	idempotencyKey: string;
	provider: string;
	model: string;
	pricingRuleId: string | null;
	promptTokens: number;
	completionTokens: number;
	inputCostKopecks: bigint;
	outputCostKopecks: bigint;
	flatFeeKopecks: bigint;
	markupBps: number;
	totalChargeKopecks: bigint;
	providerCostUsdMicros: bigint;
	fxRateRubPerUsdMicros: bigint;
	requestId?: string | null;
	status: "success" | "error" | "partial";
	metadata?: Record<string, unknown>;
}

export interface CommitAiUsageResult {
	usageEventId: string;
	chargedKopecks: bigint;
	remaining: bigint;
}

export interface ReleaseAiReservationInput {
	reservationId: string;
	idempotencyKey: string;
	reason: "error" | "timeout" | "cancelled" | "stream_aborted";
}

export interface ApplyTopupCreditInput {
	providerOperationId: string;
	providerPaymentId: string;
	amountKopecks: bigint;
	eventId: string;
}

export interface ApplyTopupCreditResult {
	orderId: string;
	applied: boolean;
	newBalanceKopecks: bigint;
}

export interface AdminAdjustWalletInput {
	walletId: string;
	amountKopecks: bigint;
	direction: "credit" | "debit";
	reason: string;
	adminUserId: string;
}

export class AiWalletInsufficientFundsError extends Error {
	readonly code = "AI_WALLET_INSUFFICIENT_FUNDS" as const;
	constructor(
		readonly requiredKopecks: bigint,
		readonly availableKopecks: bigint,
	) {
		super(
			`AI wallet insufficient funds: required=${requiredKopecks}, available=${availableKopecks}`,
		);
		this.name = "AiWalletInsufficientFundsError";
	}
}

export class AiWalletFrozenError extends Error {
	readonly code = "AI_WALLET_FROZEN" as const;
	constructor(readonly status: string) {
		super(`AI wallet is not active: ${status}`);
		this.name = "AiWalletFrozenError";
	}
}

export class WalletNotFoundError extends Error {
	readonly code = "WALLET_NOT_FOUND" as const;
	constructor() {
		super("AI wallet not found for owner");
		this.name = "WalletNotFoundError";
	}
}
