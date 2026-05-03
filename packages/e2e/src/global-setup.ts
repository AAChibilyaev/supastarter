/**
 * Global setup for Playwright E2E tests.
 * Runs once before all test suites.
 *
 * Responsibilities:
 * - Validate environment variables
 * - Check that the API is reachable
 * - Create test users/data fixtures if needed
 */

import { resolve } from "node:path";

import type { FullConfig } from "@playwright/test";
import { config as dotenv } from "dotenv";

dotenv({ path: resolve(__dirname, "../../.env.local") });
dotenv({ path: resolve(__dirname, "../../.env") });

async function globalSetup(_config: FullConfig): Promise<void> {
	const baseURL = process.env.NEXT_PUBLIC_SAAS_URL || "http://localhost:3010";

	console.log(`[E2E Setup] SAAS_URL: ${baseURL}`);

	// Check API health
	try {
		const response = await fetch(`${baseURL}/api/health`);
		if (response.ok) {
			console.log("[E2E Setup] API health check: OK");
		} else {
			console.warn(`[E2E Setup] API health check returned ${response.status}`);
		}
	} catch (error) {
		console.warn("[E2E Setup] API health check failed (server may not be running):", error);
	}

	// Store the base URL in environment for fixtures
	process.env.E2E_SAAS_URL = baseURL;
	process.env.E2E_MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || "http://localhost:3001";

	console.log("[E2E Setup] Global setup complete");
}

export default globalSetup;
