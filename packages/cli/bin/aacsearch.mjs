#!/usr/bin/env node

/**
 * AACsearch CLI — npx aacsearch
 * Command-line tool for managing AACsearch without opening the dashboard.
 * Works both in development (via tsx) and production (compiled JS).
 *
 * Production: calls ./dist/src/bin/cli.js
 * Dev/install: falls back to tsx ./src/bin/cli.ts
 */

import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Try production build first
const prodEntry = join(__dirname, "..", "dist", "src", "bin", "cli.js");
if (existsSync(prodEntry)) {
	await import(prodEntry);
} else {
	// Fall back to running via tsx (local development)
	const { register } = await import("node:module");
	const tsEntry = join(__dirname, "..", "src", "bin", "cli.ts");
	register("tsx", import.meta.url);
	await import(tsEntry);
}
