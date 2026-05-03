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
		});

		if (!order) {
			return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
		}

		// Fetch organization for tax info
		let orgName = "";
		let taxInfo: {
			taxIdType?: string | null;
			taxId?: string | null;
			legalName?: string | null;
			address?: string | null;
		} = {};

		if (order.organizationId) {
			const org = await getOrganizationById(order.organizationId);
			if (org) {
				orgName = org.name;
				if (org.metadata) {
					try {
						const metadata =
							typeof org.metadata === "string"
								? JSON.parse(org.metadata)
								: org.metadata;
						if (metadata.invoice) {
							taxInfo = metadata.invoice;
						}
					} catch {
						// Malformed metadata — ignore
					}
				}
			}
		}

		const html = generateReceiptHtml(
			{
				id: order.id,
				amount: Number(order.amountKopecks),
				currency: order.currency,
				status: order.status,
				createdAt: order.createdAt,
			},
			orgName,
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
