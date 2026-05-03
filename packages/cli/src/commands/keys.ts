/**
 * `aacsearch keys list|create|revoke` — API key management
 */

import { createInterface } from "readline/promises";

import { Command } from "commander";

import { ApiClient } from "../lib/client.js";
import { loadConfig } from "../lib/config.js";
import { formatCreatedKey, formatError, formatKeyList } from "../lib/formatter.js";

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

		const name = cmd.name;
		const indexSlug = cmd.index;

		try {
			// Resolve project
			const projects = await client.get<Array<{ id: string }>>("/v1/projects");
			const project = projects?.[0];
			if (!project?.id) {
				console.error("Error: Could not find project. Is your API key valid?");
				process.exit(1);
			}

			// Interactive prompts for missing options
			let resolvedName = name as string | undefined;
			let resolvedIndex = indexSlug as string | undefined;
			let resolvedScopes: string[] | undefined;

			if (!resolvedName || !resolvedIndex || !resolvedScopes) {
				const rl = createInterface({ input: process.stdin, output: process.stdout });

				// List indexes for user to pick from
				const indexes = await client.get<
					Array<{ slug: string; displayName: string }>
				>(`/v1/projects/${project.id}/indexes`);

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

			if (cmd.origins) {
				body.allowedOrigins = (cmd.origins as string).split(",").map((o: string) => o.trim());
			}
			if (cmd.rateLimit) {
				body.rateLimitPerMinute = parseInt(cmd.rateLimit as string, 10);
			}
			if (cmd.expires) {
				body.expiresAt = cmd.expires;
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
