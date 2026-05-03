/**
 * `aacsearch keys list|create|rotate|revoke` — API key management
 */

import { createInterface } from "readline/promises";

import { Command } from "commander";

import { ApiClient } from "../lib/client.js";
import { loadConfig } from "../lib/config.js";
import {
	formatCreatedKey,
	formatError,
	formatKeyList,
	formatRotatedKey,
} from "../lib/formatter.js";

export const keysCommand = new Command("keys")
	.description("Manage API keys")
	.option("--json", "Output as JSON");

// ── keys list ──────────────────────────────────────────────────────────────
keysCommand
	.command("list")
	.description("List all API keys")
	.action(async (_, cmd) => {
		const parentOpts = cmd.parent?.opts() ?? {};
		const json = parentOpts.json ?? false;
		const config = loadConfig();
		const client = new ApiClient(config);

		try {
			const projects = await client.get<Array<{ id: string }>>("/v1/projects");
			const project = projects?.[0];
			if (!project?.id) {
				console.error("Error: Could not find project. Is your API key valid?");
				process.exit(1);
			}

			const keys = await client.get<Array<Record<string, unknown>>>(
				`/v1/projects/${project.id}/keys`,
			);
			console.log(formatKeyList(keys, { json }));
		} catch (error) {
			console.error(formatError(error));
			process.exit(1);
		}
	});

// ── keys create ────────────────────────────────────────────────────────────
keysCommand
	.command("create")
	.description("Create a new API key")
	.option("-n, --name <name>", "Key name")
	.option("-i, --index <slug>", "Index slug to bind the key to")
	.option("-s, --scopes <scopes>", "Comma-separated scopes (admin, ingest, search)")
	.option("-o, --origins <origins>", "Comma-separated allowed origins")
	.option("-r, --rate-limit <n>", "Rate limit per minute")
	.option("--expires <date>", "Expiration date (ISO 8601)")
	.action(async (_, cmd) => {
		const parentOpts = cmd.parent?.opts() ?? {};
		const json = parentOpts.json ?? false;
		const config = loadConfig();
		const client = new ApiClient(config);

		const opts = cmd.opts();
		const name = opts.name as string | undefined;
		const indexSlug = opts.index as string | undefined;

		try {
			// Resolve project
			const projects = await client.get<Array<{ id: string }>>("/v1/projects");
			const project = projects?.[0];
			if (!project?.id) {
				console.error("Error: Could not find project. Is your API key valid?");
				process.exit(1);
			}

			// Parse scopes from --scopes flag if provided
			let resolvedScopes: string[] | undefined;
			if (opts.scopes) {
				resolvedScopes = (opts.scopes as string).split(",").map((s: string) => s.trim());
			}

			// Interactive prompts for missing options
			let resolvedName = name;
			let resolvedIndex = indexSlug;

			if (!resolvedName || !resolvedIndex || !resolvedScopes) {
				const rl = createInterface({ input: process.stdin, output: process.stdout });

				// List indexes for user to pick from
				const indexes = await client.get<Array<{ slug: string; displayName: string }>>(
					`/v1/projects/${project.id}/indexes`,
				);

				if (!resolvedName) {
					resolvedName = await rl.question("Key name: ");
					if (!resolvedName) {
						console.error("Error: Key name is required.");
						process.exit(1);
					}
				}

				if (!resolvedIndex) {
					console.log("\nAvailable indexes:");
					for (const idx of indexes) {
						console.log(`  ${idx.slug} — ${idx.displayName}`);
					}
					resolvedIndex = await rl.question("\nIndex slug: ");
					if (!resolvedIndex) {
						console.error("Error: Index slug is required.");
						process.exit(1);
					}
				}

				if (!resolvedScopes || resolvedScopes.length === 0) {
					const scopesInput = await rl.question(
						"Scopes (comma-separated: admin, ingest, search) [admin]: ",
					);
					resolvedScopes = scopesInput
						? scopesInput.split(",").map((s) => s.trim())
						: ["admin"];
				}

				rl.close();
			}

			const body: Record<string, unknown> = {
				indexSlug: resolvedIndex,
				name: resolvedName,
				scopes: resolvedScopes,
			};

			if (opts.origins) {
				body.allowedOrigins = (opts.origins as string)
					.split(",")
					.map((o: string) => o.trim());
			}
			if (opts.rateLimit) {
				body.rateLimitPerMinute = parseInt(opts.rateLimit as string, 10);
			}
			if (opts.expires) {
				body.expiresAt = opts.expires;
			}

			const result = await client.post<Record<string, unknown>>(
				`/v1/projects/${project.id}/keys`,
				body,
			);

			console.log(formatCreatedKey(result, { json }));
		} catch (error) {
			console.error(formatError(error));
			process.exit(1);
		}
	});

// ── keys revoke ────────────────────────────────────────────────────────────
keysCommand
	.command("revoke <keyId>")
	.description("Revoke an API key")
	.action(async (keyId: string) => {
		const config = loadConfig();
		const client = new ApiClient(config);

		try {
			const result = await client.delete<{ id: string; revoked: boolean }>(
				`/v1/keys/${keyId}`,
			);

			if (result.revoked) {
				console.log(`✓ API key ${result.id.slice(0, 8)} revoked.`);
			} else {
				console.log("? API key could not be revoked.");
			}
		} catch (error) {
			console.error(formatError(error));
			process.exit(1);
		}
	});

interface KeyEntry {
	id: string;
	name: string;
	prefix: string;
	scopes: string[];
	indexSlug?: string;
	indexDisplayName?: string;
	allowedOrigins?: string[];
	rateLimitPerMinute?: number;
	expiresAt?: string;
}

// ── keys rotate ────────────────────────────────────────────────────────────
keysCommand
	.command("rotate <keyId>")
	.description("Rotate an API key (create new key with same settings, revoke old)")
	.action(async (keyId: string) => {
		const config = loadConfig();
		const client = new ApiClient(config);

		try {
			// Resolve project
			const projects = await client.get<Array<{ id: string }>>("/v1/projects");
			const project = projects?.[0];
			if (!project?.id) {
				console.error("Error: Could not find project. Is your API key valid?");
				process.exit(1);
			}

			// Fetch the existing key details from the project keys list
			const allKeys = await client.get<KeyEntry[]>(`/v1/projects/${project.id}/keys`);
			const oldKey = allKeys.find((k) => k.id === keyId);
			if (!oldKey) {
				console.error(`Error: API key "${keyId.slice(0, 8)}..." not found.`);
				process.exit(1);
			}

			if (oldKey.expiresAt) {
				const expiresDate = new Date(oldKey.expiresAt);
				if (expiresDate < new Date()) {
					console.error(
						`Error: Cannot rotate an expired API key (expired ${expiresDate.toISOString()}). Create a new key instead.`,
					);
					process.exit(1);
				}
			}

			// Create new key with same settings
			const body: Record<string, unknown> = {
				indexSlug: oldKey.indexSlug,
				name: oldKey.name,
				scopes: oldKey.scopes,
			};
			if (oldKey.allowedOrigins?.length) body.allowedOrigins = oldKey.allowedOrigins;
			if (oldKey.rateLimitPerMinute) body.rateLimitPerMinute = oldKey.rateLimitPerMinute;
			if (oldKey.expiresAt) body.expiresAt = oldKey.expiresAt;

			const newKey = await client.post<Record<string, unknown>>(
				`/v1/projects/${project.id}/keys`,
				body,
			);

			// Revoke old key
			const revokeResult = await client.delete<{ id: string; revoked: boolean }>(
				`/v1/keys/${keyId}`,
			);

			console.log(formatRotatedKey({ newKey, revoked: revokeResult.revoked }));
		} catch (error) {
			console.error(formatError(error));
			process.exit(1);
		}
	});
