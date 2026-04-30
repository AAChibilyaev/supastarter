import { ORPCError } from "@orpc/client";
import {
	createTopupOrder,
	getAiWalletByEntity,
	markTopupOrderFailed,
	markTopupOrderPending,
} from "@repo/database";
import { logger } from "@repo/logs";
import { walletProvider } from "@repo/payments";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { localeMiddleware } from "../../../orpc/middleware/locale-middleware";
import { protectedProcedure } from "../../../orpc/procedures";
import { createTopupInputSchema } from "../types";

export const createTopup = protectedProcedure
	.use(localeMiddleware)
	.route({
		method: "POST",
		path: "/billing/ai-wallet/topups",
		tags: ["AI Wallet"],
		summary: "Create AI wallet top-up order",
		description:
			"Creates a wallet top-up payment link via the active wallet provider (Tochka by default).",
	})
	.input(createTopupInputSchema)
	.output(
		z.object({
			orderId: z.string(),
			paymentLinkUrl: z.string().url(),
		}),
	)
	.handler(async ({ input: { amountKopecks, organizationId }, context: { user, locale } }) => {
		const wallet = await getAiWalletByEntity(
			organizationId ? { organizationId } : { userId: user.id },
		);
		if (!wallet) throw new ORPCError("NOT_FOUND", { message: "Wallet not initialized" });

		const idempotencyKey = `topup:${user.id}:${randomUUID()}`;

		const order = await createTopupOrder({
			walletId: wallet.id,
			userId: organizationId ? null : user.id,
			organizationId: organizationId ?? null,
			provider: walletProvider.id,
			amountKopecks,
			idempotencyKey,
			initiatedByUserId: user.id,
		});

		const baseUrl = process.env.NEXT_PUBLIC_SAAS_URL ?? "http://localhost:3000";
		const successUrl = `${baseUrl}/${locale}/settings/billing/ai-credits?topup=${order.id}`;
		const failureUrl = `${baseUrl}/${locale}/settings/billing/ai-credits?topup=${order.id}&failed=1`;

		try {
			const link = await walletProvider.createPaymentLink({
				orderId: order.id,
				amountKopecks,
				currency: "RUB",
				successUrl,
				failureUrl,
				customerEmail: user.email,
				description: `AI Wallet top-up — ${(Number(amountKopecks) / 100).toFixed(2)} ₽`,
			});

			await markTopupOrderPending(order.id, {
				paymentLinkUrl: link.paymentLinkUrl,
				providerPaymentId: link.providerPaymentId,
				providerCustomerId: link.providerCustomerId,
				expiresAt: link.expiresAt,
			});

			return { orderId: order.id, paymentLinkUrl: link.paymentLinkUrl };
		} catch (e) {
			logger.error("createTopup: provider failed", e);
			await markTopupOrderFailed(order.id, (e as Error)?.message);
			throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to create payment link" });
		}
	});
