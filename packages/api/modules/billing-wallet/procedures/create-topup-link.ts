import { randomUUID } from "node:crypto";

import { ORPCError } from "@orpc/client";
import { db } from "@repo/database";
import { z } from "zod";

import { localeMiddleware } from "../../../orpc/middleware/locale-middleware";
import { protectedProcedure } from "../../../orpc/procedures";
import { createPaymentLink } from "../lib/tochka";

export const createTopupLink = protectedProcedure
	.use(localeMiddleware)
	.route({
		method: "POST",
		path: "/billing/ai-wallet/topup",
		tags: ["AI Wallet"],
		summary: "Create one-time wallet top-up link",
		description: "Creates a Tochka payment link to top up the AI wallet balance.",
	})
	.input(
		z.object({
			amountMinor: z.coerce.bigint().min(BigInt(100)),
		}),
	)
	.output(
		z.object({
			intentId: z.string(),
			paymentUrl: z.string(),
			operationId: z.string().optional(),
		}),
	)
	.handler(async ({ input: { amountMinor }, context: { user } }) => {
		const wallet = await db.aiWallet.findUnique({
			where: { userId: user.id },
		});

		if (!wallet) {
			throw new ORPCError("NOT_FOUND", { message: "Wallet not found" });
		}

		const idempotencyKey = `topup:${wallet.id}:${randomUUID()}`;
		const purpose = `AI Wallet topup ${(Number(amountMinor) / 100).toFixed(2)} RUB`;
		const externalRef = `topup:${wallet.id}:${idempotencyKey}`;

		const order = await db.walletTopupOrder.create({
			data: {
				walletId: wallet.id,
				userId: wallet.userId,
				provider: "tochka",
				currency: wallet.currency ?? "RUB",
				amountKopecks: amountMinor,
				status: "created",
				idempotencyKey,
			},
		});

		const result = await createPaymentLink(amountMinor, purpose, externalRef);

		return {
			intentId: order.id,
			paymentUrl: result.paymentUrl,
			operationId: result.operationId,
		};
	});
