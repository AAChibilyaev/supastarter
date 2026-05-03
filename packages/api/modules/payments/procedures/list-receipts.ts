import { ORPCError } from "@orpc/client";
import { db, getOrganizationById } from "@repo/database";
import { logger } from "@repo/logs";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

const ReceiptSchema = z.object({
	id: z.string(),
	amount: z.number(),
	currency: z.string(),
	status: z.string(),
	createdAt: z.date(),
	receiptPdf: z.string().nullable(),
});

export const listReceipts = protectedProcedure
	.route({
		method: "GET",
		path: "/payments/receipts",
		tags: ["Payments"],
		summary: "List wallet topup receipts",
		description: "List wallet topup receipts for an organization",
	})
	.input(
		z.object({
			organizationId: z.string(),
			limit: z.number().min(1).max(100).optional().default(10),
			startingAfter: z.string().optional(),
		}),
	)
	.output(
		z.object({
			receipts: z.array(ReceiptSchema),
			hasMore: z.boolean(),
		}),
	)
	.handler(async ({ input: { organizationId, limit, startingAfter }, context: { user } }) => {
		const organization = await getOrganizationById(organizationId);

		if (!organization) {
			throw new ORPCError("NOT_FOUND");
		}

		const isMember = organization.members.some((m) => m.userId === user.id);
		if (!isMember) {
			throw new ORPCError("FORBIDDEN");
		}

		try {
			const cursor = startingAfter ? { id: startingAfter } : undefined;

			// Fetch one extra record to determine if there are more results
			const records = await db.walletTopupOrder.findMany({
				where: { organizationId },
				orderBy: { createdAt: "desc" },
				take: limit + 1,
				...(cursor ? { cursor, skip: 1 } : {}),
			});

			const hasMore = records.length > limit;
			const items = hasMore ? records.slice(0, limit) : records;

			const receipts = items.map((record) => ({
				id: record.id,
				amount: Number(record.amountKopecks),
				currency: record.currency,
				status: record.status,
				createdAt: record.createdAt,
				receiptPdf: `/api/receipts/${record.id}`,
			}));

			return { receipts, hasMore };
		} catch (e) {
			logger.error("Failed to list wallet topup receipts", e);
			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}
	});
