import { db } from "@repo/database";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface InvoiceLineItem {
	description: string;
	quantity: number;
	unitPrice: number;
	currency: string;
	amount: number;
}

export interface InvoiceData {
	id: string;
	invoiceNumber: string;
	organizationId: string;
	organizationName: string;
	customerEmail: string;
	createdAt: Date;
	periodStart: Date;
	periodEnd: Date;
	currency: string;
	subtotal: number;
	taxPercent: number;
	taxAmount: number;
	total: number;
	status: "paid" | "pending" | "failed";
	lines: InvoiceLineItem[];
}

/**
 * Generate an invoice from purchase/subscription data.
 * Returns InvoiceData computed from the Purchase record.
 */
export async function generateInvoiceData(purchaseId: string): Promise<InvoiceData | null> {
	const purchase = await db.purchase.findUnique({
		where: { id: purchaseId },
		include: { organization: true, user: true },
	});

	if (!purchase) return null;

	const orgName = purchase.organization?.name ?? purchase.user?.email ?? "Unknown";
	const customerEmail = purchase.user?.email ?? "";
	const currency = "USD";
	const amount = 0; // Would come from Stripe invoice API

	// Build invoice number from purchase
	const datePart = purchase.createdAt.toISOString().slice(0, 10).replace(/-/g, "");
	const shortId = purchase.id.slice(-8);
	const invoiceNumber = `INV-${datePart}-${shortId}`;

	return {
		id: purchase.id,
		invoiceNumber,
		organizationId: purchase.organizationId ?? purchase.userId ?? "",
		organizationName: orgName,
		customerEmail,
		createdAt: purchase.createdAt,
		periodStart: purchase.createdAt,
		periodEnd: purchase.updatedAt,
		currency,
		subtotal: amount,
		taxPercent: 0,
		taxAmount: 0,
		total: amount,
		status:
			purchase.status === "active"
				? "paid"
				: purchase.status === "past_due"
					? "pending"
					: "failed",
		lines: [
			{
				description: `Subscription — ${purchase.priceId}`,
				quantity: 1,
				unitPrice: amount,
				currency,
				amount,
			},
		],
	};
}

/**
 * Generate a PDF invoice from purchase data.
 * Returns the PDF as a Buffer ready for download.
 */
export async function generateInvoicePdf(purchaseId: string): Promise<Buffer | null> {
	const invoice = await generateInvoiceData(purchaseId);
	if (!invoice) return null;

	const pdfDoc = await PDFDocument.create();
	const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
	const page = pdfDoc.addPage([595, 842]); // A4
	const { width, height } = page.getSize();

	const margin = 50;
	let y = height - margin;

	// ── Header ──
	page.drawText("INVOICE", {
		x: margin,
		y,
		size: 28,
		font: fontBold,
		color: rgb(0.2, 0.2, 0.2),
	});
	y -= 12;

	page.drawText(invoice.invoiceNumber, {
		x: margin,
		y,
		size: 12,
		font,
		color: rgb(0.5, 0.5, 0.5),
	});
	y -= 30;

	// ── Bill To ──
	page.drawText("Bill To:", {
		x: margin,
		y,
		size: 12,
		font: fontBold,
		color: rgb(0.2, 0.2, 0.2),
	});
	y -= 16;
	page.drawText(invoice.organizationName, {
		x: margin,
		y,
		size: 10,
		font,
		color: rgb(0.3, 0.3, 0.3),
	});
	y -= 14;
	page.drawText(invoice.customerEmail, {
		x: margin,
		y,
		size: 10,
		font,
		color: rgb(0.3, 0.3, 0.3),
	});
	y -= 30;

	// ── Invoice Details ──
	page.drawText(`Date: ${invoice.createdAt.toISOString().slice(0, 10)}`, {
		x: margin,
		y,
		size: 10,
		font,
		color: rgb(0.3, 0.3, 0.3),
	});
	y -= 14;
	page.drawText(`Status: ${invoice.status.toUpperCase()}`, {
		x: margin,
		y,
		size: 10,
		font,
		color: invoice.status === "paid" ? rgb(0, 0.5, 0) : rgb(0.8, 0.3, 0),
	});
	y -= 30;

	// ── Table Header ──
	const colX = [margin, 300, 400, 470];
	const colW = [250, 100, 70, 75];
	const headers = ["Description", "Qty", "Price", "Amount"];

	page.drawLine({
		start: { x: margin, y },
		end: { x: width - margin, y },
		thickness: 1,
		color: rgb(0.7, 0.7, 0.7),
	});
	y -= 8;

	headers.forEach((header, i) => {
		page.drawText(header, {
			x: colX[i],
			y,
			size: 10,
			font: fontBold,
			color: rgb(0.3, 0.3, 0.3),
		});
	});
	y -= 8;

	page.drawLine({
		start: { x: margin, y },
		end: { x: width - margin, y },
		thickness: 1,
		color: rgb(0.7, 0.7, 0.7),
	});
	y -= 16;

	// ── Table Rows ──
	for (const line of invoice.lines) {
		const cells = [
			line.description,
			String(line.quantity),
			`${line.currency} ${line.unitPrice.toFixed(2)}`,
			`${line.currency} ${line.amount.toFixed(2)}`,
		];

		cells.forEach((cell, i) => {
			page.drawText(cell, {
				x: colX[i],
				y,
				size: 10,
				font,
				color: rgb(0.3, 0.3, 0.3),
				maxWidth: colW[i],
			});
		});
		y -= 20;
	}

	// ── Totals ──
	y -= 10;
	page.drawLine({
		start: { x: 350, y },
		end: { x: width - margin, y },
		thickness: 1,
		color: rgb(0.7, 0.7, 0.7),
	});
	y -= 16;

	const totalLabel = "Total:";
	const totalValue = `${invoice.currency} ${invoice.total.toFixed(2)}`;

	page.drawText(totalLabel, {
		x: 350,
		y,
		size: 12,
		font: fontBold,
		color: rgb(0.2, 0.2, 0.2),
	});
	page.drawText(totalValue, {
		x: 430,
		y,
		size: 12,
		font: fontBold,
		color: rgb(0.2, 0.2, 0.2),
	});

	const pdfBytes = await pdfDoc.save();
	return Buffer.from(pdfBytes);
}
