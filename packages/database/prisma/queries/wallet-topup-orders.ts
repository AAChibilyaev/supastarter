import { db } from "../client";

export async function createTopupOrder(input: {
	walletId: string;
	userId?: string | null;
	organizationId?: string | null;
	provider: string;
	amountKopecks: bigint;
	idempotencyKey: string;
	initiatedByUserId: string;
}) {
	return db.walletTopupOrder.create({
		data: {
			walletId: input.walletId,
			userId: input.userId ?? null,
			organizationId: input.organizationId ?? null,
			provider: input.provider,
			amountKopecks: input.amountKopecks,
			currency: "RUB",
			status: "created",
			idempotencyKey: input.idempotencyKey,
			initiatedByUserId: input.initiatedByUserId,
		},
	});
}

export async function getTopupOrderById(id: string) {
	return db.walletTopupOrder.findUnique({ where: { id } });
}

export async function listTopupOrdersByWallet(walletId: string, limit = 50) {
	return db.walletTopupOrder.findMany({
		where: { walletId },
		orderBy: { createdAt: "desc" },
		take: limit,
	});
}

export async function markTopupOrderPending(
	id: string,
	data: {
		paymentLinkUrl: string;
		providerPaymentId: string;
		providerCustomerId?: string;
		expiresAt?: Date;
	},
) {
	return db.walletTopupOrder.update({
		where: { id },
		data: {
			paymentLinkUrl: data.paymentLinkUrl,
			providerPaymentId: data.providerPaymentId,
			providerCustomerId: data.providerCustomerId ?? null,
			expiresAt: data.expiresAt ?? null,
			status: "pending",
		},
	});
}

export async function markTopupOrderFailed(id: string, error?: string) {
	return db.walletTopupOrder.update({
		where: { id },
		data: {
			status: "failed",
			metadata: error ? { error } : undefined,
		},
	});
}
