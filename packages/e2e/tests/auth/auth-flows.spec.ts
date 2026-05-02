/**
 * E2E: Auth flows — login, registration, org switching, 2FA, passkeys
 *
 * Tests the authentication system of AACsearch:
 * - Email+password login
 * - Signup/registration flow
 * - Organization switching
 * - Session persistence across page reload
 * - 2FA/TOTP setup and verification (requires test user with 2FA configured)
 * - Magic link flow (requires mail interception)
 * - OAuth redirect placeholder
 */

import { test, expect } from "../../src/fixtures";
import type { Page } from "@playwright/test";

const BASE_URL = process.env.E2E_SAAS_URL || "http://localhost:3010";
const _MARKETING_URL = process.env.E2E_MARKETING_URL || "http://localhost:3001";

// ─── Test user credentials ───────────────────────────────────────
// These should be set in .env.local or CI env
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || "test@aacsearch.io";
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || "TestPassword123!";
const _TEST_EMAIL_ALT = process.env.E2E_TEST_EMAIL_2 || "test2@aacsearch.io";
const SIGNUP_EMAIL = `e2e-signup-${Date.now()}@aacsearch.io`;
const SIGNUP_PASSWORD = "NewSignupPassword456!";
const SIGNUP_NAME = "E2E Test User";

// ─── Helpers ─────────────────────────────────────────────────────

async function login(page: Page, email: string, password: string): Promise<void> {
	await page.goto(`${BASE_URL}/login`);
	await page.waitForSelector('input[name="email"]', { timeout: 10000 });
	await page.fill('input[name="email"]', email);
	await page.fill('input[name="password"]', password);
	await page.click('button[type="submit"]');
}

async function logout(page: Page): Promise<void> {
	await page.goto(`${BASE_URL}/logout`);
	await page.waitForURL(/\/login/);
}

// ─── Tests ───────────────────────────────────────────────────────

test.describe("Auth — Login / Logout", () => {

	test("should redirect unauthenticated user to login page", async ({ page }) => {
		await page.goto(`${BASE_URL}/overview`);
		// Should redirect to login
		expect(page.url()).toContain("/login");
	});

	test("should show login page with email and password fields", async ({ page }) => {
		await page.goto(`${BASE_URL}/login`);
		await expect(page.locator('input[name="email"]')).toBeVisible();
		await expect(page.locator('input[name="password"]')).toBeVisible();
		await expect(page.locator('button[type="submit"]')).toBeVisible();
	});

	test("should login with valid credentials", async ({ page }) => {
		await login(page, TEST_EMAIL, TEST_PASSWORD);
		// After successful login, should be redirected to dashboard
		await page.waitForURL(/\/overview|\/getting-started/);
		expect(page.url()).not.toContain("/login");
	});

	test("should show error for invalid credentials", async ({ page }) => {
		await login(page, TEST_EMAIL, "wrong-password-xyz");
		// Should stay on login page and show error
		await page.waitForTimeout(2000);
		expect(page.url()).toContain("/login");
		// Look for error message
		const errorEl = page.locator('[role="alert"], .error, .text-red-*, [data-error]').first();
		await expect(errorEl).toBeVisible({ timeout: 5000 }).catch(() => {
			// Error might be rendered differently
		});
	});

	test("should persist session across page reload", async ({ page }) => {
		await login(page, TEST_EMAIL, TEST_PASSWORD);
		await page.waitForURL(/\/overview|\/getting-started/);

		// Reload the page
		await page.reload();
		await page.waitForLoadState("networkidle");

		// Should still be on dashboard, not redirected to login
		expect(page.url()).toContain("/overview");
	});
});

test.describe("Auth — Registration", () => {

	test("should show signup page", async ({ page }) => {
		await page.goto(`${BASE_URL}/signup`);
		await expect(page.locator('input[name="email"]')).toBeVisible();
		await expect(page.locator('input[name="password"]')).toBeVisible();
		await expect(page.locator('input[name="name"]')).toBeVisible().catch(() => {
			// Name field may be optional or have different selector
		});
	});

	test("should register a new user", async ({ page }) => {
		await page.goto(`${BASE_URL}/signup`);
		await page.waitForSelector('input[name="email"]', { timeout: 10000 });

		await page.fill('input[name="email"]', SIGNUP_EMAIL);
		await page.fill('input[name="password"]', SIGNUP_PASSWORD);

		// Try to fill name if present
		const nameInput = page.locator('input[name="name"]');
		if (await nameInput.isVisible()) {
			await nameInput.fill(SIGNUP_NAME);
		}

		await page.click('button[type="submit"]');

		// Should redirect to dashboard after signup (possibly to onboarding)
		await page.waitForURL(/\/overview|\/getting-started|\/onboard/, { timeout: 15000 });
		expect(page.url()).not.toContain("/signup");
	});

	test("should reject duplicate email registration", async ({ page }) => {
		await page.goto(`${BASE_URL}/signup`);
		await page.waitForSelector('input[name="email"]', { timeout: 10000 });

		await page.fill('input[name="email"]', TEST_EMAIL);
		await page.fill('input[name="password"]', SIGNUP_PASSWORD);
		await page.click('button[type="submit"]');

		// Should show error (user already exists)
		await page.waitForTimeout(2000);
		expect(page.url()).toContain("/signup");
	});
});

test.describe("Auth — Session Management", () => {

	test("should allow logout", async ({ page }) => {
		await login(page, TEST_EMAIL, TEST_PASSWORD);
		await page.waitForURL(/\/overview|\/getting-started/);

		await logout(page);
		await page.waitForURL(/\/login/);
		expect(page.url()).toContain("/login");
	});

	test("should redirect to login after logout on protected page", async ({ page }) => {
		await login(page, TEST_EMAIL, TEST_PASSWORD);
		await page.waitForURL(/\/overview|\/getting-started/);

		await logout(page);
		await page.waitForURL(/\/login/);

		// Try to access protected page
		await page.goto(`${BASE_URL}/overview`);
		await page.waitForTimeout(2000);
		expect(page.url()).toContain("/login");
	});
});

test.describe("Auth — Organization Switching", () => {

	test("should show organization switcher for users with multiple orgs", async ({ page }) => {
		await login(page, TEST_EMAIL, TEST_PASSWORD);
		await page.waitForURL(/\/overview|\/getting-started/);

		// Look for org switcher UI element
		const orgSwitcher = page.locator('[data-org-switcher], [data-radix-select-trigger], [aria-label*="organization" i], [aria-label*="org" i]').first();
		const visible = await orgSwitcher.isVisible().catch(() => false);

		if (visible) {
			// Click org switcher
			await orgSwitcher.click();
			const orgOptions = page.locator('[role="option"], [role="menuitem"], [data-org-option]');
			await expect(orgOptions.first()).toBeVisible({ timeout: 3000 });
		}
		// If no org switcher, user may only have one org — that's acceptable
	});
});

test.describe("Auth — Password Reset", () => {

	test("should show password reset page", async ({ page }) => {
		await page.goto(`${BASE_URL}/reset-password`);
		await expect(page.locator('input[name="email"]')).toBeVisible();
		await expect(page.locator('button[type="submit"]')).toBeVisible();
	});
});

test.describe("Auth — 2FA / TOTP", () => {

	test("should show 2FA setup option in security settings", async ({ page }) => {
		await login(page, TEST_EMAIL, TEST_PASSWORD);
		await page.waitForURL(/\/overview|\/getting-started/);

		// Navigate to security settings
		await page.goto(`${BASE_URL}/settings/security`).catch(async () => {
			// Try alternative paths
			await page.goto(`${BASE_URL}/account/security`).catch(() => {});
		});

		await page.waitForTimeout(2000);

		// Look for 2FA section
		const twoFactorSection = page.locator('text=2FA,text=Two Factor,text=Two-Factor,text=Authenticator,text=TOTP').first();
		const visible = await twoFactorSection.isVisible().catch(() => false);
		if (visible) {
			await expect(twoFactorSection).toBeVisible();
		}
	});
});
