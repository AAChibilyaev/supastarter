import { randomUUID } from "node:crypto";

import { ORPCError } from "@orpc/client";
import { db } from "@repo/database";
import { z } from "zod";

import { localeMiddleware } from "../../../orpc/middleware/locale-middleware";
import { protectedProcedure } from "../../../orpc/procedures";
import { createSubscriptionLink } from "../lib/tochka";

export const setupAutorecharge = protectedProcedure
	.use(localeMiddleware)
	.route({
		method: "POST",
		path: "/billing/ai-wallet/autorecharge",
		tags: ["AI Wallet"],
		summary: "Set up auto-recharge via Tochka subscription",
		description: "Configures threshold-based auto-recharge and creates a subscription link.",
	})
	.input(
		z.object({
			thresholdKopecks: z.coerce.bigint().min(BigInt(0)),
			topupAmountKopecks: z.coerce.bigint().min(BigInt(100)),
		}),
	)
	.output(
		z.object({
			paymentUrl: z.string(),
			operationId: z.string().optional(),
		}),
	)
	.handler(
		async ({ input: { thresholdKopecks, topupAmountKopecks }, context: { user, locale } }) => {
			const wallet = await db.aiWallet.findUnique({
				where: { userId: user.id },
			});

			if (!wallet) {
				throw new ORPCError("NOT_FOUND", { message: "Wallet not found" });
			}

			const idempotencyKey = `autorecharge:${wallet.id}:${randomUUID()}`;
			const purpose = `AI Wallet auto-recharge (threshold: ${Number(thresholdKopecks) / 100} ₽)`;
			const externalRef = `autorecharge:${wallet.id}:${idempotencyKey}`;

			const order = await db.walletTopupOrder.create({
				data: {
					walletId: wallet.id,
					userId: wallet.userId,
					provider: "tochka",
					currency: wallet.currency ?? "RUB",
					amountKopecks: topupAmountKopecks,
					status: "created",
					idempotencyKey: `autorecharge:${wallet.id}:${randomUUID()}`,
				},
			});

			const result = await createSubscriptionLink(topupAmountKopecks, purpose, externalRef);

			return {
				paymentUrl: result.paymentUrl,
				operationId: result.operationId,
			};
		},
	);
