import { db } from "@repo/database";
import { getTypesenseClient } from "@repo/search";
import { z } from "zod";

import { adminProcedure } from "../../../orpc/procedures";

export const integrationChecks = adminProcedure
	.route({
		method: "GET",
		path: "/admin/integrations",
		tags: ["Administration"],
		summary: "Check integration connectivity",
	})
	.input(z.object({}))
	.handler(async () => {
		// ── Typesense connectivity ───────────────────────────────────────
		let typesense: { ok: boolean; latencyMs?: number; error?: string } = { ok: false };

		try {
			const start = Date.now();
			const client = getTypesenseClient();
			await client.health.retrieve();
			typesense = { ok: true, latencyMs: Date.now() - start };
		} catch (error) {
			typesense = {
				ok: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}

		// ── Database connectivity ────────────────────────────────────────
		let database: { ok: boolean; latencyMs?: number; error?: string } = { ok: false };

		try {
			const start = Date.now();
			await db.$queryRaw`SELECT 1`;
			database = { ok: true, latencyMs: Date.now() - start };
		} catch (error) {
			database = {
				ok: false,
				error: error instanceof Error ? error.message : "Connection failed",
			};
		}

		// ── Mail provider ────────────────────────────────────────────────
		const mailProvider = getMailProvider();

		// ── Payments provider ────────────────────────────────────────────
		const paymentProviders = getPaymentProviders();

		// ── Storage (S3/MinIO) ───────────────────────────────────────────
		const storageConfigured =
			Boolean(process.env.S3_ENDPOINT || process.env.NEXT_PUBLIC_S3_ENDPOINT) &&
			Boolean(process.env.S3_ACCESS_KEY_ID || process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID);

		// ── Tochka wallet ────────────────────────────────────────────────
		const tochkaConfigured = Boolean(
			process.env.TOCHKA_API_BASE_URL && process.env.TOCHKA_JWT_TOKEN,
		);

		return {
			typesense,
			database,
			mail: {
				configured: Boolean(
					process.env.PLUNK_API_KEY ||
					process.env.RESEND_API_KEY ||
					process.env.POSTMARK_SERVER_TOKEN ||
					process.env.MAILGUN_API_KEY ||
					process.env.MAIL_HOST,
				),
				provider: mailProvider,
			},
			payments: {
				configured: Boolean(
					process.env.STRIPE_SECRET_KEY ||
					process.env.LEMONSQUEEZY_API_KEY ||
					process.env.POLAR_ACCESS_TOKEN ||
					process.env.CREEM_API_KEY ||
					process.env.DODO_PAYMENTS_API_KEY,
				),
				providers: paymentProviders,
			},
			storage: {
				configured: storageConfigured,
				endpoint: process.env.S3_ENDPOINT ?? process.env.NEXT_PUBLIC_S3_ENDPOINT ?? null,
			},
			tochka: {
				configured: tochkaConfigured,
				baseUrl: process.env.TOCHKA_API_BASE_URL ?? null,
			},
		};
	});

function getMailProvider(): string {
	if (process.env.PLUNK_API_KEY) return "Plunk";
	if (process.env.RESEND_API_KEY) return "Resend";
	if (process.env.POSTMARK_SERVER_TOKEN) return "Postmark";
	if (process.env.MAILGUN_API_KEY) return "Mailgun";
	if (process.env.MAIL_HOST) return "SMTP";
	return "none";
}

function getPaymentProviders(): string[] {
	const providers: string[] = [];
	if (process.env.STRIPE_SECRET_KEY) providers.push("Stripe");
	if (process.env.LEMONSQUEEZY_API_KEY) providers.push("LemonSqueezy");
	if (process.env.POLAR_ACCESS_TOKEN) providers.push("Polar");
	if (process.env.CREEM_API_KEY) providers.push("Creem");
	if (process.env.DODO_PAYMENTS_API_KEY) providers.push("DodoPayments");
	return providers.length > 0 ? providers : ["none"];
}
