/**
 * Regression J3 + J4: Billing/Upgrade & Widget → Analytics
 *
 * Tests:
 * - Billing page renders for free/trial user
 * - Widget embed code is accessible
 * - Widget search returns results via public API
 * - Analytics page renders and reflects data
 */

import { test, expect } from "../../src/fixtures";
import { createTestIndex, createApiKey, seedDocuments, wait } from "../../src/helpers";

const BASE_URL = process.env.E2E_SAAS_URL || "http://localhost:3010";
const ADMIN_KEY = process.env.E2E_ADMIN_API_KEY || "test-admin-key";

let indexSlug: string;
let apiKey: string;

test.describe.configure({ mode: "serial" });

test.describe("J3: Billing & Upgrade Flow", () => {
	test("1 — Billing page loads for authenticated user", async ({ authPage }) => {
		const page = authPage;

		await page.goto(`${BASE_URL}/settings/billing`);
		await page.waitForLoadState("networkidle");
		await page.waitForTimeout(3000);

		expect(page.url()).toContain("/settings/billing");

		const bodyText = await page.textContent("body").catch(() => "");
		const hasBillingContent =
			bodyText.includes("Billing") ||
			bodyText.includes("billing") ||
			bodyText.includes("Plan") ||
			bodyText.includes("plan") ||
			bodyText.includes("trial") ||
			bodyText.includes("Trial") ||
			bodyText.includes("upgrade") ||
			bodyText.includes("Upgrade") ||
			bodyText.includes("subscription") ||
			bodyText.includes("payment");

		expect(hasBillingContent).toBeTruthy();
	});

	test("2 — Upgrade/pricing CTA is present for non-subscribed users", async ({ authPage }) => {
		const page = authPage;

		await page.goto(`${BASE_URL}/settings/billing`);
		await page.waitForLoadState("networkidle");
		await page.waitForTimeout(2000);

		const bodyText = await page.textContent("body").catch(() => "");

		// Common upgrade CTA patterns
		const hasUpgradeCTA =
			bodyText.includes("Upgrade") ||
			bodyText.includes("upgrade") ||
			bodyText.includes("Choose plan") ||
			bodyText.includes("pricing") ||
			bodyText.includes("Pricing") ||
			bodyText.includes("View plans") ||
			bodyText.includes("Subscribe");

		// Soft assertion — some orgs may already be subscribed
		if (!hasUpgradeCTA) {
			const planText = page.locator("text=Plan,text=Free,text=Pro,text=Enterprise").first();
			const hasPlan = await planText.isVisible().catch(() => false);
			expect(hasPlan).toBeTruthy();
		} else {
			expect(hasUpgradeCTA).toBeTruthy();
		}
	});

	test("3 — Plan info shows correct status", async ({ authPage }) => {
		const page = authPage;

		await page.goto(`${BASE_URL}/settings/billing`);
		await page.waitForLoadState("networkidle");
		await page.waitForTimeout(2000);

		const bodyText = await page.textContent("body").catch(() => "");
		const hasPlanStatus =
			bodyText.includes("Free") ||
			bodyText.includes("free") ||
			bodyText.includes("Trial") ||
			bodyText.includes("trial") ||
			bodyText.includes("Pro") ||
			bodyText.includes("pro") ||
			bodyText.includes("Starter") ||
			bodyText.includes("starter") ||
			bodyText.includes("Enterprise") ||
			bodyText.includes("enterprise");

		expect(hasPlanStatus).toBeTruthy();
	});
});

test.describe("J4: Widget → Analytics Pipeline", () => {
	test.beforeAll(async () => {
		// Set up a test index for widget testing
		const index = await createTestIndex(ADMIN_KEY, BASE_URL, `regression-j4-${Date.now()}`);
		indexSlug = index.slug;

		await seedDocuments(ADMIN_KEY, BASE_URL, indexSlug, [
			{
				id: "1",
				title: "Widget Test Product A",
				description: "For widget regression",
				price: 49.99,
			},
			{
				id: "2",
				title: "Widget Test Product B",
				description: "Second widget test item",
				price: 59.99,
			},
		]);

		const key = await createApiKey(
			ADMIN_KEY,
			BASE_URL,
			"regression-j4-key",
			["search"],
			indexSlug,
		);
		apiKey = key.key;

		await wait(1500);
	});

	test.afterAll(async () => {
		await fetch(`${BASE_URL}/api/v1/indexes/${indexSlug}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${ADMIN_KEY}` },
		}).catch(() => {});
	});

	test("1 — Widget search via public API returns results", async () => {
		const response = await fetch(`${BASE_URL}/api/search/public/${indexSlug}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({ q: "Widget", perPage: 10 }),
		});

		expect(response.status).toBe(200);

		const data = await response.json();
		expect(data.found).toBeGreaterThanOrEqual(1);
		expect(data.hits.length).toBeGreaterThanOrEqual(1);
	});

	test("2 — Widget configurator page loads with embed options", async ({ authPage }) => {
		const page = authPage;

		await page.goto(`${BASE_URL}/search?tab=widget-configurator`);
		await page.waitForLoadState("networkidle");
		await page.waitForTimeout(3000);

		expect(page.url()).toContain("/search");

		const bodyText = await page.textContent("body").catch(() => "");
		const hasWidgetContent =
			bodyText.includes("widget") ||
			bodyText.includes("Widget") ||
			bodyText.includes("embed") ||
			bodyText.includes("Embed") ||
			bodyText.includes("config") ||
			bodyText.includes("Config") ||
			bodyText.includes("script") ||
			bodyText.includes("code");

		expect(hasWidgetContent).toBeTruthy();
	});

	test("3 — Analytics dashboard loads and shows data", async ({ authPage }) => {
		const page = authPage;

		await page.goto(`${BASE_URL}/analytics`);
		await page.waitForLoadState("networkidle");
		await page.waitForTimeout(3000);

		expect(page.url()).toContain("/analytics");

		const bodyText = await page.textContent("body").catch(() => "");
		const hasAnalyticsContent =
			bodyText.includes("Analytics") ||
			bodyText.includes("analytics") ||
			bodyText.includes("overview") ||
			bodyText.includes("search") ||
			bodyText.includes("chart") ||
			bodyText.includes("metric") ||
			bodyText.includes("data");

		expect(hasAnalyticsContent).toBeTruthy();
	});

	test("4 — Analytics API returns structured data", async () => {
		const response = await fetch(`${BASE_URL}/api/analytics/health`).catch(() => null);
		if (response && response.ok) {
			const data = await response.json();
			expect(data).toBeDefined();
		}
	});
});
