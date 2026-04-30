import { db } from "../client";

export type AiWalletOwner = { organizationId: string } | { userId: string };

export async function getAiWalletByOrganizationId(organizationId: string) {
	return db.aiWallet.findUnique({ where: { organizationId } });
}

export async function getAiWalletByUserId(userId: string) {
	return db.aiWallet.findUnique({ where: { userId } });
}

export async function getAiWalletByEntity(owner: AiWalletOwner) {
	if ("organizationId" in owner) {
		return getAiWalletByOrganizationId(owner.organizationId);
	}
	return getAiWalletByUserId(owner.userId);
}

export async function listAiWalletTransactions(
	walletId: string,
	opts: { limit?: number; cursor?: string } = {},
) {
	return db.aiWalletTransaction.findMany({
		where: { walletId },
		orderBy: { createdAt: "desc" },
		take: opts.limit ?? 50,
		cursor: opts.cursor ? { id: opts.cursor } : undefined,
		skip: opts.cursor ? 1 : 0,
	});
}
