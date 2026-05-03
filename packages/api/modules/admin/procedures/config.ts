import { db } from "@repo/database";
import { getTypesenseClient } from "@repo/search";
import { z } from "zod";

import { adminProcedure } from "../../../orpc/procedures";

export const getConfig = adminProcedure
	.route({
		method: "GET",
		path: "/admin/config",
		tags: ["Administration"],
		summary: "Runtime configuration and system health",
	})
	.input(z.object({}))
	.handler(async () => {
		// ── App config ──────────────────────────────────────────────────
		const config = {
			appName: process.env.NEXT_PUBLIC_APP_NAME ?? "AACsearch",
			nodeVersion: process.version,
			runtimeEnv: process.env.NODE_ENV ?? "development",
			platform: process.platform,
			uptime: Math.floor(process.uptime()),
		};

		// ── Typesense health ─────────────────────────────────────────────
		let typesenseHealth: {
			ok: boolean;
			version?: string;
			error?: string;
		} = { ok: false, error: "Not checked" };

		try {
			const client = getTypesenseClient();
			const health = await client.health.retrieve();
			const raw = health as unknown as Record<string, unknown>;
			const version = typeof raw.version === "string" ? raw.version : "unknown";
			typesenseHealth = { ok: true, version };
		} catch (error) {
			typesenseHealth = {
				ok: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}

		// ── Prisma stats ─────────────────────────────────────────────────
		let prismaStats: {
			ok: boolean;
			userCount?: number;
			organizationCount?: number;
			searchIndexCount?: number;
			totalApiKeys?: number;
			totalUsageEvents?: number;
			error?: string;
		} = { ok: true };

		try {
			const [userCount, organizationCount, searchIndexCount, totalApiKeys, totalUsageEvents] =
				await Promise.all([
					db.user.count(),
					db.organization.count(),
					db.searchIndex.count(),
					db.searchApiKey.count(),
					db.searchUsageEvent.count(),
				]);

			prismaStats = {
				ok: true,
				userCount,
				organizationCount,
				searchIndexCount,
				totalApiKeys,
				totalUsageEvents,
			};
		} catch (error) {
			prismaStats = {
				ok: false,
				error: error instanceof Error ? error.message : "Connection failed",
			};
		}

		// ── Env vars (safe — no secrets) ─────────────────────────────────
		const urls = {
			saasUrl: process.env.NEXT_PUBLIC_SAAS_URL ?? null,
			marketingUrl: process.env.NEXT_PUBLIC_MARKETING_URL ?? null,
			docsUrl: process.env.NEXT_PUBLIC_DOCS_URL ?? null,
		};

		const services = {
			typesenseHost: process.env.TYPESENSE_HOST ?? null,
			typesenseConfigured: Boolean(
				process.env.TYPESENSE_HOST && process.env.TYPESENSE_ADMIN_API_KEY,
			),
			tochkaConfigured: Boolean(process.env.TOCHKA_API_BASE_URL && process.env.TOCHKA_JWT_TOKEN),
			mailConfigured: Boolean(
				process.env.PLUNK_API_KEY ||
				process.env.RESEND_API_KEY ||
				process.env.POSTMARK_SERVER_TOKEN ||
				process.env.MAILGUN_API_KEY ||
				process.env.MAIL_HOST,
			),
			paymentsConfigured: Boolean(
				process.env.STRIPE_SECRET_KEY ||
				process.env.LEMONSQUEEZY_API_KEY ||
				process.env.POLAR_ACCESS_TOKEN ||
				process.env.CREEM_API_KEY ||
				process.env.DODO_PAYMENTS_API_KEY,
			),
		};

		return {
			config,
			typesenseHealth,
			prismaStats,
			urls,
			services,
		};
	});
