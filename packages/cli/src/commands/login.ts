/**
 * `aacsearch login` — authenticate with API key (interactive or --api-key flag)
 */

import { createInterface } from "readline/promises";

import { Command } from "commander";

import { authWithApiKey, logout, isAuthenticated } from "../lib/auth.js";
import { loadConfig, saveConfig } from "../lib/config.js";

export const loginCommand = new Command("login")
	.description("Authenticate with AACsearch")
	.option("-k, --api-key <key>", "Authenticate with an API key directly")
	.option("--logout", "Clear stored credentials")
	.action(async (options: { apiKey?: string; logout?: boolean }) => {
		if (options.logout) {
			logout();
			return;
		}

		if (options.apiKey) {
			authWithApiKey(options.apiKey);
			return;
		}

		if (isAuthenticated()) {
			const config = loadConfig();
			console.log(`Already authenticated (endpoint: ${config.endpoint})`);
			console.log("Use `aacsearch login --logout` to clear credentials.");
			return;
		}

		// Interactive prompt for API key
		const rl = createInterface({ input: process.stdin, output: process.stdout });
		const endpoint =
			(await rl.question("API endpoint (default: https://api.aacsearch.io): ")) ||
			"https://api.aacsearch.io";
		const projectId = await rl.question("Project ID (optional): ");
		const apiKey = await rl.question("API key: ");
		rl.close();

		if (!apiKey) {
			console.error("Error: API key is required.");
			process.exit(1);
		}

		saveConfig({
			endpoint: endpoint || undefined,
			projectId: projectId || undefined,
			apiKey,
		});

		console.log("✓ Authenticated successfully");
	});
