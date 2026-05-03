import { ORPCError } from "@orpc/client";
import { getAiWalletByEntity, listAiWalletTransactions } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../../search/lib/access";
import { exportTransactionsInputSchema } from "../types";

export const exportTransactions = protectedProcedure
	.route({
		method: "POST",
		path: "/billing/wallet/transactions/export",
		tags: ["AI Wallet"],
		summary: "Export wallet transactions",
		description:
			"Exports wallet ledger transactions as CSV or JSON. Filters by date range. Max 10,000 rows per export.",
	})
	.input(exportTransactionsInputSchema)
	.output(
		z.object({
			content: z.string(),
			mimeType: z.string(),
			filename: z.string(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationMember(input.organizationId, user.id);

		const wallet = await getAiWalletByEntity({ organizationId: input.organizationId });
		if (!wallet) throw new ORPCError("NOT_FOUND", { message: "Wallet not initialized" });

		// Fetch up to 10,000 transactions
		const transactions = await listAiWalletTransactions(wallet.id, { limit: 10_000 });

		let filtered = transactions;
		if (input.from || input.to) {
			filtered = transactions.filter((t) => {
				const d = t.createdAt.getTime();
				if (input.from && d < input.from.getTime()) return false;
				if (input.to && d > input.to.getTime()) return false;
				return true;
			});
		}

		const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
		const baseFilename = `wallet-transactions-${timestamp}`;

		if (input.format === "json") {
			const json = JSON.stringify(
				filtered.map((t) => ({
					id: t.id,
					date: t.createdAt.toISOString(),
					type: t.type,
					direction: t.direction,
					amountKopecks: t.amountKopecks.toString(),
					currency: t.currency,
					source: t.source,
					projectId: t.projectId,
					userId: t.userId,
					idempotencyKey: t.idempotencyKey,
				})),
				null,
				2,
			);
			return {
				content: json,
				mimeType: "application/json",
				filename: `${baseFilename}.json`,
			};
		}

		// CSV format
		const header =
			"id,date,type,direction,amountKopecks,currency,source,projectId,userId,idempotencyKey";
		const rows = filtered.map(
			(t) =>
				`${escapeCsv(t.id)},${escapeCsv(t.createdAt.toISOString())},${escapeCsv(t.type)},${escapeCsv(t.direction)},${t.amountKopecks.toString()},${escapeCsv(t.currency)},${escapeCsv(t.source)},${escapeCsv(t.projectId ?? "")},${escapeCsv(t.userId ?? "")},${escapeCsv(t.idempotencyKey)}`,
		);

		return {
			content: [header, ...rows].join("\n"),
			mimeType: "text/csv",
			filename: `${baseFilename}.csv`,
		};
	});

function escapeCsv(value: string): string {
	if (value.includes(",") || value.includes('"') || value.includes("\n")) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}
