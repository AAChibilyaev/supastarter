/**
 * E2E test fixtures for AACsearch.
 *
 * Extends Playwright base test with:
 * - `authPage` — logged-in page session
 * - `apiClient` — fetch wrapper with base URL + JSON handling
 * - `searchIndex` — creates a search index for the test
 */

import { test as base, type Page } from "@playwright/test";

// ─── Types ───────────────────────────────────────────────────────

export interface ApiClient {
	get: (path: string, opts?: RequestInit) => Promise<ApiResponse>;
	post: (path: string, body?: unknown, opts?: RequestInit) => Promise<ApiResponse>;
	patch: (path: string, body?: unknown, opts?: RequestInit) => Promise<ApiResponse>;
	delete: (path: string, opts?: RequestInit) => Promise<ApiResponse>;
}

interface ApiResponse {
	status: number;
	ok: boolean;
	headers: Headers;
	json: <T = unknown>() => Promise<T>;
	text: () => Promise<string>;
}

export interface TestFixtures {
	authPage: Page;
	apiClient: ApiClient;
}

// ─── API Client Factory ──────────────────────────────────────────

function createApiClient(baseURL: string): ApiClient {
	const apiBase = `${baseURL}/api`;

	async function request(
		method: string,
		path: string,
		body?: unknown,
		opts?: RequestInit,
	): Promise<ApiResponse> {
		const url = `${apiBase}${path}`;
		const headers: Record<string, string> = {
			...((opts?.headers as Record<string, string>) || {}),
		};
		if (body !== undefined) {
			headers["Content-Type"] = "application/json";
		}
		const response = await fetch(url, {
			method,
			headers,
			body: body !== undefined ? JSON.stringify(body) : undefined,
			...opts,
		});
		return {
			status: response.status,
			ok: response.ok,
			headers: response.headers,
			json: <T>() => response.json() as Promise<T>,
			text: () => response.text(),
		};
	}

	return {
		get: (path, opts) => request("GET", path, undefined, opts),
		post: (path, body, opts) => request("POST", path, body, opts),
		patch: (path, body, opts) => request("PATCH", path, body, opts),
		delete: (path, opts) => request("DELETE", path, undefined, opts),
	};
}

// ─── Base URL ─────────────────────────────────────────────────────

function getSaaSUrl(): string {
	return process.env.E2E_SAAS_URL || "http://localhost:3010";
}

// ─── Login helper ─────────────────────────────────────────────────

async function loginAsTestUser(page: Page, baseURL: string): Promise<void> {
	const email = process.env.E2E_TEST_EMAIL || "test@aacsearch.io";
	const password = process.env.E2E_TEST_PASSWORD || "TestPassword123!";

	await page.goto(`${baseURL}/login`);
	await page.fill('input[name="email"]', email);
	await page.fill('input[name="password"]', password);
	await page.click('button[type="submit"]');
	// Wait for redirect to dashboard
	await page.waitForURL(/\/overview|\/getting-started/);
}

// ─── Extend base test ─────────────────────────────────────────────

export const test = base.extend<TestFixtures>({
	authPage: async ({ browser }, _use) => {
		const context = await browser.newContext({
			storageState: undefined, // fresh session
		});
		const page = await context.newPage();
		await loginAsTestUser(page, getSaaSUrl());
		await _use(page);
		await context.close();
	},

	apiClient: async ({}, use) => {
		const client = createApiClient(getSaaSUrl());
		await use(client);
	},
});

export { expect } from "@playwright/test";
