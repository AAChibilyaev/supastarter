import { resolve } from "node:path";

import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

// Load env from monorepo root
config({ path: resolve(__dirname, "../../.env.local") });
config({ path: resolve(__dirname, "../../.env") });

const SAAS_URL = process.env.NEXT_PUBLIC_SAAS_URL || "http://localhost:3010";
const _MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || "http://localhost:3001";

export default defineConfig({
	testDir: "./tests",
	fullyParallel: false,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 2 : 1,
	reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],
	use: {
		baseURL: SAAS_URL,
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
		// Allow navigation to both apps
		bypassCSP: true,
		// Extra HTTP headers for tests that need admin/API access
		extraHTTPHeaders: {
			"Content-Type": "application/json",
		},
	},

	projects: [
		{
			name: "setup",
			testMatch: /global\.setup\.ts/,
			testDir: "./src",
		},
		{
			name: "search",
			dependencies: ["setup"],
			testMatch: "tests/search/**/*.spec.ts",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "api-key",
			dependencies: ["setup"],
			testMatch: "tests/api-key/**/*.spec.ts",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "auth",
			dependencies: ["setup"],
			testMatch: "tests/auth/**/*.spec.ts",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "quota",
			dependencies: ["setup"],
			testMatch: "tests/quota/**/*.spec.ts",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "connector",
			dependencies: ["setup"],
			testMatch: "tests/connector/**/*.spec.ts",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "project",
			dependencies: ["setup"],
			testMatch: "tests/project/**/*.spec.ts",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "widget",
			dependencies: ["setup"],
			testMatch: "tests/widget/**/*.spec.ts",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "analytics",
			dependencies: ["setup"],
			testMatch: "tests/analytics/**/*.spec.ts",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "indexing",
			dependencies: ["setup"],
			testMatch: "tests/indexing/**/*.spec.ts",
			use: { ...devices["Desktop Chrome"] },
		},
	],

	webServer: [
		{
			command: "pnpm --filter saas dev -p 3010",
			url: SAAS_URL + "/api/health",
			reuseExistingServer: true,
			timeout: 120_000,
			cwd: resolve(__dirname, "../.."),
			env: {
				NEXT_PUBLIC_SAAS_URL: SAAS_URL,
			},
		},
	],

	// Global setup — runs once before all projects
	globalSetup: resolve(__dirname, "src/global-setup.ts"),
});
