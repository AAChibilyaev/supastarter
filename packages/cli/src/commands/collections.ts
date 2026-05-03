/**
 * `aacsearch collections list|create|delete` — collection/index management
 */

import { createInterface } from "readline/promises";

import { Command } from "commander";

import { ApiClient } from "../lib/client.js";
import { loadConfig } from "../lib/config.js";
import {
	formatError,
	formatTable,
} from "../lib/formatter.js";

interface IndexInfo {
	id: string;
	slug: string;
	displayName: string;
	documentsCount?: number;
	status?: string;
	createdAt?: string;
}

export const collectionsCommand = new Command("collections")
	.description("Manage search collections (indexes)")
	.option("--json", "Output as JSON");

// ── collections list ───────────────────────────────────────────────────────
collectionsCommand
	.command("list")
	.description("List all collections in the project")
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

			const indexes = await client.get<IndexInfo[]>(
				`/v1/projects/${project.id}/indexes`,
			);

			if (json) {
				console.log(JSON.stringify(indexes, null, 2));
				return;
			}

			if (indexes.length === 0) {
				console.log("No collections found in this project.");
				return;
			}

			const rows = indexes.map((idx) => ({
				slug: idx.slug,
				name: idx.displayName ?? "—",
				documents: String(idx.documentsCount ?? "—"),
				status: idx.status ?? "—",
				created: idx.createdAt
					? new Date(idx.createdAt).toLocaleDateString()
					: "—",
			}));

			console.log(
				formatTable(rows, [
					{ header: "Slug" },
					{ header: "Name" },
					{ header: "Documents" },
					{ header: "Status" },
					{ header: "Created" },
				]),
			);
		} catch (error) {
			console.error(formatError(error));
			process.exit(1);
		}
	});

// ── collections create ─────────────────────────────────────────────────────
collectionsCommand
	.command("create <slug>")
	.description("Create a new collection")
	.option("-n, --name <name>", "Display name (defaults to slug)")
	.option("-f, --fields <fields>", "Schema fields as JSON (otherwise interactive)")
	.action(async (slug: string, options: { name?: string; fields?: string }) => {
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

			const displayName = options.name ?? slug;

			// Schema fields
			let fields: Array<{ name: string; type: string; facet?: boolean }>;

			if (options.fields) {
				try {
					fields = JSON.parse(options.fields) as Array<{
						name: string;
						type: string;
						facet?: boolean;
					}>;
				} catch {
					console.error("Error: --fields must be valid JSON array");
					process.exit(1);
				}
			} else {
				fields = await promptForFields();
			}

			const body = {
				slug,
				displayName,
				schema: { fields },
			};

			const result = await client.post<Record<string, unknown>>(
				`/v1/projects/${project.id}/indexes`,
				body,
			);

			console.log(`✓ Collection "${slug}" created.`);
			console.log(`  ID:   ${(result.id as string) ?? "?"}`);
			console.log(`  Name: ${displayName}`);
			console.log(`  Fields: ${fields.length}`);
		} catch (error) {
			console.error(formatError(error));
			process.exit(1);
		}
	});

async function promptForFields(): Promise<
	Array<{ name: string; type: string; facet?: boolean }>
> {
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	const fields: Array<{ name: string; type: string; facet?: boolean }> = [];

	console.log("\nDefine schema fields (one by one). Leave name empty to finish.");
	console.log("Available types: string, int32, int64, float, bool, string[], auto, geocoordinates, object, object[]");

	// eslint-disable-next-line no-constant-condition
	while (true) {
		const name = await rl.question("\nField name (empty to finish): ");
		if (!name) break;

		const type = await rl.question("  Type [string]: ");
		const resolvedType = type || "string";

		const facetStr = await rl.question("  Facet? (y/N): ");
		const facet = facetStr.toLowerCase() === "y" || facetStr.toLowerCase() === "yes";

		fields.push({ name, type: resolvedType, facet });
		console.log(`  → Added "${name}" (${resolvedType}${facet ? ", facet" : ""})`);
	}

	rl.close();

	if (fields.length === 0) {
		console.log("Warning: No fields defined. The collection will be created with auto-schema.");
	}

	return fields;
}

// ── collections delete ─────────────────────────────────────────────────────
collectionsCommand
	.command("delete <slug>")
	.description("Delete a collection and all its documents")
	.option("-f, --force", "Skip confirmation prompt")
	.action(async (slug: string, options: { force?: boolean }) => {
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

			// Find the index
			const indexes = await client.get<IndexInfo[]>(
				`/v1/projects/${project.id}/indexes`,
			);
			const found = indexes.find(
				(idx) => idx.slug === slug || idx.displayName === slug,
			);
			if (!found) {
				console.error(
					`Error: Collection "${slug}" not found. Use 'aacsearch collections list' to see available collections.`,
				);
				process.exit(1);
			}

			// Confirm deletion
			if (!options.force) {
				const rl = createInterface({
					input: process.stdin,
					output: process.stdout,
				});
				const answer = await rl.question(
					`Are you sure you want to delete "${found.displayName}" (${found.slug})? This cannot be undone. Type the collection slug to confirm: `,
				);
				rl.close();

				if (answer.trim() !== found.slug) {
					console.log("Deletion cancelled.");
					return;
				}
			}

			await client.delete<Record<string, unknown>>(
				`/v1/indexes/${found.id}`,
			);

			console.log(`✓ Collection "${found.displayName}" (${found.slug}) deleted.`);
		} catch (error) {
			console.error(formatError(error));
			process.exit(1);
		}
	});
