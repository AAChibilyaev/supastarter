import { getOrganizationById } from "@repo/database";
import { db } from "@repo/database";
import { logger } from "@repo/logs";
import { generateReceiptHtml } from "@repo/payments";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/receipts/:id
 *
 * Renders an HTML receipt page for a wallet topup order.
 * Print to save as PDF.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	try {
		const order = await db.walletTopupOrder.findUnique({
			where: { id },
			include: {
				organization: {
					select: { id: true, name: true, metadata: true },
				},
			},
		});

		if (!order) {
			return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
		}

		// Parse tax info from org metadata
		let taxInfo: {
			taxIdType?: string | null;
			taxId?: string | null;
			legalName?: string | null;
			address?: string | null;
		} = {};

		if (order.organization.metadata) {
			try {
				const metadata = JSON.parse(order.organization.metadata);
				if (metadata.invoice) {
					taxInfo = metadata.invoice;
				}
			} catch {
				// Malformed metadata — ignore
			}
		}

		const html = generateReceiptHtml(
			{
				id: order.id,
				amount: order.amount,
				currency: order.currency,
				status: order.status,
				createdAt: order.createdAt,
			},
			order.organization.name,
			taxInfo,
		);

		return new NextResponse(html, {
			headers: {
				"Content-Type": "text/html; charset=utf-8",
			},
		});
	} catch (error) {
		logger.error("Failed to generate receipt", error);
		return NextResponse.json({ error: "Failed to generate receipt" }, { status: 500 });
	}
}
