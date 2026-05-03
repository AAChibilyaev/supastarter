import { db } from "@repo/database";
import { logger } from "@repo/logs";
import { createNotification } from "@repo/notifications";

const LOW_BALANCE_THRESHOLD_KOPECKS = BigInt(20000);

/**
 * Sends an AI_LOW_BALANCE notification to wallet owner(s).
 * For org-scoped wallets — fans out to every owner/admin member.
 */
export async function notifyLowBalance(walletId: string): Promise<void> {
	const wallet = await db.aiWallet.findUnique({ where: { id: walletId } });
	if (!wallet) return;

	if (wallet.availableBalanceKopecks > LOW_BALANCE_THRESHOLD_KOPECKS) return;

	const recipients: string[] = [];
	if (wallet.userId) {
		recipients.push(wallet.userId);
	} else if (wallet.organizationId) {
		const members = await db.member.findMany({
			where: {
				organizationId: wallet.organizationId,
				role: { in: ["owner", "admin"] },
			},
			select: { userId: true },
		});
		recipients.push(...members.map((m) => m.userId));
	}

	const balanceRub = (Number(wallet.availableBalanceKopecks) / 100).toFixed(2);
	const link = wallet.organizationId
		? `/settings/billing/ai-credits?org=${wallet.organizationId}`
		: `/settings/billing/ai-credits`;

	await Promise.all(
		recipients.map((userId: string) =>
			createNotification({
				userId,
				type: "AI_LOW_BALANCE",
				data: {
					headline: "AI wallet balance is low",
					title: "Top up your AI credits",
					message: `Available: ${balanceRub} ₽`,
				},
				link,
			}).catch((err: unknown) => logger.error("notifyLowBalance: createNotification failed", err)),
		),
	);
}
