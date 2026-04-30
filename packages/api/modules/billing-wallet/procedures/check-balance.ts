import { db } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

const bigintAsString = z.bigint().transform((v) => v.toString());

export const checkBalance = protectedProcedure
	.route({
		method: "GET",
		path: "/wallet/balance",
		tags: ["AI Wallet"],
		summary: "Get AI wallet balance",
		description:
			"Returns the current AI wallet balance, currency, and status. Creates the wallet if it does not exist.",
	})
	.output(
		z.object({
			id: z.string(),
			currency: z.string(),
			status: z.string(),
			availableBalanceKopecks: bigintAsString,
			includedMonthlyLimitKopecks: bigintAsString,
			periodStart: z.date(),
			periodEnd: z.date(),
			createdAt: z.date(),
		}),
	)
	.handler(async ({ context: { user } }) => {
		let wallet = await db.aiWallet.findUnique({
			where: { userId: user.id },
			select: {
				id: true,
				currency: true,
				status: true,
				availableBalanceKopecks: true,
				includedMonthlyLimitKopecks: true,
				periodStart: true,
				periodEnd: true,
				createdAt: true,
			},
		});

		if (!wallet) {
			const now = new Date();
			const periodEnd = new Date(now);
			periodEnd.setFullYear(periodEnd.getFullYear() + 1);

			wallet = await db.aiWallet.create({
				select: {
					id: true,
					currency: true,
					status: true,
					availableBalanceKopecks: true,
					includedMonthlyLimitKopecks: true,
					periodStart: true,
					periodEnd: true,
					createdAt: true,
				},
				data: {
					userId: user.id,
					currency: "RUB",
					availableBalanceKopecks: BigInt(0),
					reservedBalanceKopecks: BigInt(0),
					includedMonthlyLimitKopecks: BigInt(0),
					includedUsedPeriodKopecks: BigInt(0),
					promoBalanceKopecks: BigInt(0),
					overageLimitKopecks: BigInt(0),
					overageUsedKopecks: BigInt(0),
					status: "active",
					periodStart: now,
					periodEnd,
				},
			});
		}

		return wallet;
	});
