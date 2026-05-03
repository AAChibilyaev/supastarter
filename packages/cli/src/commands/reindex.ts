/**
 * `aacsearch reindex --collection=products` — trigger reindex on a collection
 */

import { createInterface } from "readline/promises";

import { Command } from "commander";

import { ApiClient } from "../lib/client.js";
import { loadConfig } from "../lib/config.js";
import { formatError } from "../lib/formatter.js";

export const reindexCommand = new Command("reindex")
	.description("Trigger reindex on a collection")
	.option("-c, --collection <slug>", "Collection slug to reindex (required)")
	.option("-f, --force", "Skip confirmation prompt")
	.option("--json", "Output as JSON")
	.action(
		async (options: {
			collection?: string;
			force?: boolean;
			json?: boolean;
		}) => {
			const config = loadConfig();
			const client = new ApiClient(config);

			if (!options.collection) {
				console.error(
					"Error: --collection is required. Use 'aacsearch collections list' to see available collections.",
				);
				process.exit(1);
			}

			try {
				// Resolve project + collection
				const projects = await client.get<Array<{ id: string }>>("/v1/projects");
				const project = projects?.[0];
				if (!project?.id) {
					console.error(
						"Error: Could not find project. Is your API key valid?",
					);
					process.exit(1);
				}

				const indexes = await client.get<
					Array<{ id: string; slug: string; displayName: string }>
				>(`/v1/projects/${project.id}/indexes`);
				const found = indexes.find(
					(idx) =>
						idx.slug === options.collection ||
						idx.displayName === options.collection,
				);
				if (!found) {
					console.error(
						`Error: Collection "${options.collection}" not found. Use 'aacsearch collections list' to see available collections.`,
					);
					process.exit(1);
				}

				// Confirm
				if (!options.force) {
					const rl = createInterface({
						input: process.stdin,
						output: process.stdout,
					});
					const answer = await rl.question(
						`Reindex "${found.displayName}" (${found.slug})? This may take a while. [y/N]: `,
					);
					rl.close();

					if (answer.toLowerCase() !== "y" && answer.toLowerCase() !== "yes") {
						console.log("Reindex cancelled.");
						return;
					}
				}

				console.log(`Triggering reindex for "${found.displayName}"...`);

				const result = await client.post<Record<string, unknown>>(
					`/v1/indexes/${found.id}/reindex`,
				);

				if (options.json) {
					console.log(JSON.stringify(result, null, 2));
				} else {
					console.log(
						`✓ Reindex triggered for "${found.displayName}".`,
					);
					const taskId = result.taskId as string | undefined;
					if (taskId) {
						console.log(`  Task ID: ${taskId}`);
						console.log("  Use `aacsearch monitor` to check progress.");
					}
				}
			} catch (error) {
				console.error(formatError(error));
				process.exit(1);
			}
		},
	);
