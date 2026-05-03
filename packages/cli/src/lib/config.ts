/**
 * Config management for AACsearch CLI.
 * Stores credentials in ~/.aacsearch/config.json (chmod 600).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";

export interface CliConfig {
	endpoint?: string;
	projectId?: string;
	apiKey?: string;
}

const CONFIG_DIR = join(homedir(), ".aacsearch");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

export function getConfigDir(): string {
	return CONFIG_DIR;
}

export function getConfigPath(): string {
	return CONFIG_PATH;
}

export function loadConfig(): CliConfig {
	// Env vars take precedence
	const envConfig: CliConfig = {};
	if (process.env.AACSEARCH_ENDPOINT) envConfig.endpoint = process.env.AACSEARCH_ENDPOINT;
	if (process.env.AACSEARCH_PROJECT_ID) envConfig.projectId = process.env.AACSEARCH_PROJECT_ID;
	if (process.env.AACSEARCH_API_KEY) envConfig.apiKey = process.env.AACSEARCH_API_KEY;

	// File config as fallback
	let fileConfig: CliConfig = {};
	if (existsSync(CONFIG_PATH)) {
		try {
			fileConfig = JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as CliConfig;
		} catch {
			// Ignore corrupt config
		}
	}

	return {
		endpoint: envConfig.endpoint ?? fileConfig.endpoint ?? "https://api.aacsearch.io",
		projectId: envConfig.projectId ?? fileConfig.projectId,
		apiKey: envConfig.apiKey ?? fileConfig.apiKey,
	};
}

export function saveConfig(config: CliConfig): void {
	if (!existsSync(CONFIG_DIR)) {
		mkdirSync(CONFIG_DIR, { recursive: true });
	}

	const existing = loadConfig();
	const merged: CliConfig = {
		...existing,
		...config,
	};

	writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), "utf-8");
	// Secure the config file (owner read/write only)
	try {
		chmodSync(CONFIG_PATH, 0o600);
	} catch {
		// chmod may fail on Windows
	}
}

export function clearConfig(): void {
	if (existsSync(CONFIG_PATH)) {
		writeFileSync(CONFIG_PATH, JSON.stringify({}, null, 2), "utf-8");
	}
}
