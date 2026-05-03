import { db } from "@repo/database";
import { logger } from "@repo/logs";
import { createNotification } from "@repo/notifications";

/**
 * Sends an AI_TOPUP_PAID notification to wallet owner(s).
 * Mirrors `notifyLowBalance` recipient resolution.
 */
export async function notifyTopupPaid(input: {
	walletId: string;
	amountKopecks: bigint;
	orderId: string;
}): Promise<void> {
	const wallet = await db.aiWallet.findUnique({ where: { id: input.walletId } });
	if (!wallet) return;

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

	const amountRub = (Number(input.amountKopecks) / 100).toFixed(2);
	const link = wallet.organizationId
		? `/settings/billing/ai-credits?org=${wallet.organizationId}`
		: `/settings/billing/ai-credits`;

	await Promise.all(
		recipients.map((userId: string) =>
			createNotification({
				userId,
				type: "AI_TOPUP_PAID",
				data: {
					headline: "AI wallet topped up",
					title: "Your top-up is complete",
					message: `${amountRub} ₽ credited`,
				},
				link,
			}).catch((err: unknown) => logger.error("notifyTopupPaid: createNotification failed", err)),
		),
	);
}

/**
 * Sends an AI_TOPUP_FAILED notification.
 */
export async function notifyTopupFailed(input: {
	walletId: string;
	orderId: string;
	reason?: string;
}): Promise<void> {
	const wallet = await db.aiWallet.findUnique({ where: { id: input.walletId } });
	if (!wallet) return;

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

	const link = wallet.organizationId
		? `/settings/billing/ai-credits?org=${wallet.organizationId}`
		: `/settings/billing/ai-credits`;

	await Promise.all(
		recipients.map((userId: string) =>
			createNotification({
				userId,
				type: "AI_TOPUP_FAILED",
				data: {
					headline: "AI wallet top-up failed",
					title: "Top-up could not be processed",
					message: input.reason ?? "Please try again or contact support.",
				},
				link,
			}).catch((err: unknown) => logger.error("notifyTopupFailed: createNotification failed", err)),
		),
	);
}
