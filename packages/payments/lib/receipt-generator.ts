/**
 * Generate an HTML receipt for a wallet topup order.
 * Can be printed as PDF from the browser.
 *
 * @remarks Uses inline type instead of Prisma-generated type for cross-package compatibility
 */
interface ReceiptOrderFields {
	id: string;
	amount: number;
	currency: string;
	status: string;
	createdAt: Date;
}

export function generateReceiptHtml(
	order: ReceiptOrderFields,
	orgName: string,
	taxInfo?: {
		address?: string | null;
	},
): string {
	const date = new Date(order.createdAt).toLocaleDateString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	const amountFormatted = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: order.currency,
	}).format(order.amount / 100);

	const statusLabel =
		order.status === "completed" ? "Paid" : order.status === "failed" ? "Failed" : "Pending";

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Payment Receipt — ${order.id}</title>
<style>
  @page { margin: 20mm; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1a1a1a;
    max-width: 700px;
    margin: 0 auto;
    padding: 40px 20px;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 40px;
    padding-bottom: 20px;
    border-bottom: 2px solid #f0f0f0;
  }
  .header h1 {
    font-size: 24px;
    font-weight: 700;
    color: #111;
    margin: 0;
  }
  .header .org-name {
    font-size: 14px;
    color: #666;
    margin-top: 4px;
  }
  .receipt-badge {
    background: #059669;
    color: white;
    padding: 6px 16px;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .details {
    margin-bottom: 32px;
  }
  .details table {
    width: 100%;
    border-collapse: collapse;
  }
  .details td {
    padding: 8px 0;
    font-size: 14px;
  }
  .details td:first-child {
    color: #666;
    width: 140px;
  }
  .details td:last-child {
    font-weight: 500;
  }
  .amount-row {
    margin: 24px 0;
    padding: 20px;
    background: #f9fafb;
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .amount-label {
    font-size: 14px;
    color: #666;
  }
  .amount-value {
    font-size: 28px;
    font-weight: 700;
    color: #111;
  }
  .tax-info {
    margin-top: 32px;
    padding-top: 20px;
    border-top: 1px solid #e5e7eb;
    font-size: 12px;
    color: #999;
    line-height: 1.6;
  }
  .tax-info strong {
    color: #666;
  }
  .footer {
    margin-top: 48px;
    text-align: center;
    font-size: 11px;
    color: #bbb;
  }
  ${
		taxInfo?.taxIdType === "inn"
			? `
  .qr-code {
    text-align: center;
    margin: 24px 0;
  }
  .qr-note {
    font-size: 11px;
    color: #999;
    margin-top: 8px;
  }
  .fiscal-info {
    margin-top: 24px;
    padding: 16px;
    background: #fef3c7;
    border-radius: 6px;
    font-size: 12px;
    line-height: 1.8;
    color: #92400e;
  }
  .fiscal-info strong {
    color: #78350f;
  }
  `
			: ""
  }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Payment Receipt</h1>
      <div class="org-name">${orgName}</div>
    </div>
    <div class="receipt-badge">${statusLabel}</div>
  </div>

  <div class="details">
    <table>
      <tr><td>Receipt ID</td><td>${order.id}</td></tr>
      <tr><td>Date</td><td>${date}</td></tr>
      <tr><td>Status</td><td>${statusLabel}</td></tr>
      ${taxInfo?.legalName ? `<tr><td>Customer</td><td>${taxInfo.legalName}</td></tr>` : ""}
      ${taxInfo?.taxId ? `<tr><td>${taxInfo.taxIdType?.toUpperCase() ?? "Tax ID"}</td><td>${taxInfo.taxId}</td></tr>` : ""}
    </table>
  </div>

  <div class="amount-row">
    <span class="amount-label">Total Amount</span>
    <span class="amount-value">${amountFormatted}</span>
  </div>

  ${
		taxInfo?.address
			? `
  <div class="tax-info">
    <strong>Company Address:</strong><br>
    ${taxInfo.address.replace(/\n/g, "<br>")}
  </div>`
			: ""
  }

  ${
		taxInfo?.taxIdType === "inn"
			? `
  <div class="fiscal-info">
    <strong>54-ФЗ Compliance Information</strong><br>
    This receipt serves as a fiscal document for Russian tax purposes.<br>
    <strong>Receipt:</strong> ${order.id}<br>
    <strong>Amount:</strong> ${amountFormatted}<br>
    <strong>Date:</strong> ${date}<br>
    <strong>Seller:</strong> AACsearch Engine<br>
    <strong>ИНН:</strong> ${taxInfo.taxId ?? "—"}
  </div>`
			: ""
  }

  <div class="footer">
    AACsearch Engine — Payment Receipt<br>
    Generated on ${new Date().toISOString()}
  </div>
</body>
</html>`;
}

/**
 * Generate a simple fiscal receipt line for 54-ФЗ compliance.
 * Returns structured fiscal data that could be sent to OFD.
 */
export function generateFiscalReceiptData(
	order: Pick<WalletTopupOrder, "id" | "amount" | "currency" | "createdAt">,
	sellerTaxId: string,
	buyerTaxId?: string | null,
): Record<string, unknown> {
	const amountRub = order.currency === "RUB" ? order.amount : 0;

	return {
		fiscal_receipt_id: `FR-${order.id}`,
		created_at: order.createdAt.toISOString(),
		seller: {
			tax_id: sellerTaxId,
			name: "AACsearch Engine",
		},
		buyer: buyerTaxId
			? {
					tax_id: buyerTaxId,
				}
			: null,
		items: [
			{
				name: "AI Wallet Topup",
				quantity: 1,
				price: amountRub,
				total: amountRub,
				tax: "vat20",
			},
		],
		total: amountRub,
		currency: "RUB",
		taxation_system: "usn_income",
		payment_method: "full_prepayment",
		payment_type: "electronic",
	};
}
