/**
 * Authentication utilities for AACsearch CLI.
 * Supports API key direct input and OAuth device flow.
 */

import { loadConfig, saveConfig, clearConfig } from "./config.js";

/**
 * Authenticate using an API key directly.
 */
export function authWithApiKey(apiKey: string): void {
	saveConfig({ apiKey });
	console.log("✓ Authenticated with API key");
}

/**
 * Log out by clearing stored credentials.
 */
export function logout(): void {
	clearConfig();
	console.log("✓ Logged out. Credentials cleared.");
}

/**
 * Check if the user is currently authenticated.
 */
export function isAuthenticated(): boolean {
	const config = loadConfig();
	return !!config.apiKey;
}
