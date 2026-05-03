/**
 * `aacsearch migrate --from=algolia <file>` — migrate search data from other providers
 */

import { existsSync, readFileSync } from "fs";
import { createInterface } from "readline/promises";

import { Command } from "commander";

import { ApiClient } from "../lib/client.js";
import { loadConfig } from "../lib/config.js";
import { formatError } from "../lib/formatter.js";

export const migrateCommand = new Command("migrate")
	.description("Migrate search data from other providers")
	.option("-f, --from <provider>", "Source provider (algolia, elasticsearch, solr)")
	.option("-c, --collection <slug>", "Target collection slug")
	.option("--dry-run", "Preview what will be imported without making changes")
	.option("--json", "Output as JSON")
	.argument("[file]", "Exported data file from the source provider")
	.action(
		async (
			file: string | undefined,
			options: {
				from?: string;
				collection?: string;
				dryRun?: boolean;
				json?: boolean;
			},
		) => {
			const config = loadConfig();
			const client = new ApiClient(config);
			const provider = (options.from ?? "").toLowerCase();

			const validProviders = ["algolia", "elasticsearch", "solr"];
			if (!validProviders.includes(provider)) {
				console.error(
					`Error: Unsupported provider "${options.from}". Supported: ${validProviders.join(", ")}`,
				);
				process.exit(1);
			}

			if (!file) {
				console.error(
					`Error: Export file is required. Usage: aacsearch migrate --from=${provider} <file.json>`,
				);
				process.exit(1);
			}

			if (!existsSync(file)) {
				console.error(`Error: File not found: ${file}`);
				process.exit(1);
			}

			try {
				// Resolve project
				const projects = await client.get<Array<{ id: string }>>("/v1/projects");
				const project = projects?.[0];
				if (!project?.id) {
					console.error(
						"Error: Could not find project. Is your API key valid?",
					);
					process.exit(1);
				}

				// Parse the export file
				const raw = readFileSync(file, "utf-8");
				const data = JSON.parse(raw) as Record<string, unknown>;

				// Convert provider format to AACsearch format
				let result: { collectionSlug: string; documents: Array<Record<string, unknown>>; schemaFields?: Array<{ name: string; type: string }> };

				switch (provider) {
					case "algolia":
						result = convertAlgolia(data);
						break;
					case "elasticsearch":
						result = convertElasticsearch(data);
						break;
					case "solr":
						result = convertSolr(data);
						break;
					default:
						throw new Error(`Unsupported provider: ${provider}`);
				}

				// Determine target collection
				const targetCollection = options.collection ?? result.collectionSlug;

				if (options.dryRun || options.json) {
					const output = {
						provider,
						sourceFile: file,
						targetCollection,
						documents: result.documents.length,
						schemaFields: result.schemaFields?.length ?? 0,
						preview: result.documents.slice(0, 3),
					};

					if (options.json) {
						console.log(JSON.stringify(output, null, 2));
					} else {
						console.log(`\nMigration Preview (DRY RUN):`);
						console.log(`  Source:        ${provider}`);
						console.log(`  File:          ${file}`);
						console.log(`  Target:        ${targetCollection}`);
						console.log(`  Documents:     ${result.documents.length}`);
						console.log(`  Schema Fields: ${result.schemaFields?.length ?? "auto"}`);
						console.log(`\n  Sample documents:`);
						for (const doc of result.documents.slice(0, 3)) {
							console.log(`    ${JSON.stringify(doc).slice(0, 120)}...`);
						}
						console.log("\n  Use without --dry-run to execute.");
					}
					return;
				}

				// Confirm
				const rl = createInterface({
					input: process.stdin,
					output: process.stdout,
				});
				const answer = await rl.question(
					`\nReady to import ${result.documents.length} documents from ${provider} into "${targetCollection}". Continue? [y/N]: `,
				);
				rl.close();

				if (answer.toLowerCase() !== "y" && answer.toLowerCase() !== "yes") {
					console.log("Migration cancelled.");
					return;
				}

				// Create the collection if needed
				const indexes = await client.get<
					Array<{ id: string; slug: string }>
				>(`/v1/projects/${project.id}/indexes`);
				const existing = indexes.find((idx) => idx.slug === targetCollection);

				let indexId: string;
				if (existing) {
					indexId = existing.id;
					console.log(`Using existing collection "${targetCollection}".`);
				} else {
					console.log(`Creating collection "${targetCollection}"...`);
					const body: Record<string, unknown> = {
						slug: targetCollection,
						displayName: targetCollection,
					};
					if (result.schemaFields) {
						body.schema = { fields: result.schemaFields };
					}
					const created = await client.post<{ id: string }>(
						`/v1/projects/${project.id}/indexes`,
						body,
					);
					indexId = created.id;
					console.log(`✓ Collection "${targetCollection}" created.`);
				}

				// Import documents
				const batchSize = 100;
				let imported = 0;
				let errors = 0;

				console.log(`Importing ${result.documents.length} documents...`);

				for (let i = 0; i < result.documents.length; i += batchSize) {
					const batch = result.documents.slice(i, i + batchSize);
					try {
						const resp = await client.post<{ success: boolean; count: number }>(
							`/v1/indexes/${indexId}/documents/import`,
							{ documents: batch },
						);
						imported += resp.count ?? batch.length;
					} catch (error) {
						errors += batch.length;
						console.error(
							`Batch ${Math.floor(i / batchSize) + 1} failed: ${formatError(error)}`,
						);
					}
					process.stdout.write(
						`\r  Progress: ${imported + errors}/${result.documents.length} (${imported} ok, ${errors} errors)`,
					);
				}

				console.log("\n✓ Migration complete.");
				console.log(`  Provider:    ${provider}`);
				console.log(`  Collection:  ${targetCollection}`);
				console.log(`  Imported:    ${imported}`);
				console.log(`  Errors:      ${errors}`);
			} catch (error) {
				console.error(formatError(error));
				process.exit(1);
			}
		},
	);

// ── Format Converters ──────────────────────────────────────────────────────

interface ConvertedData {
	collectionSlug: string;
	documents: Array<Record<string, unknown>>;
	schemaFields?: Array<{ name: string; type: string }>;
}

/**
 * Convert Algolia export to AACsearch format.
 * Supports the Algolia dashboard export format (JSON array of objects).
 */
function convertAlgolia(data: Record<string, unknown>): ConvertedData {
	let docs: Array<Record<string, unknown>>;

	if (Array.isArray(data)) {
		docs = data as Array<Record<string, unknown>>;
	} else if (data.hits && Array.isArray(data.hits)) {
		docs = data.hits as Array<Record<string, unknown>>;
	} else if (data.objects && Array.isArray(data.objects)) {
		docs = data.objects as Array<Record<string, unknown>>;
	} else {
		// Try to treat the whole thing as a single document wrapper
		const entries = Object.entries(data).filter(
			([, v]) => typeof v === "object" && v !== null && !Array.isArray(v),
		);
		if (entries.length > 0) {
			docs = entries.map(([, v]) => v as Record<string, unknown>);
		} else {
			throw new Error(
				"Could not parse Algolia export format. Expected a JSON array of objects.",
			);
		}
	}

	// Strip Algolia metadata fields
	const stripFields = ["_highlightResult", "_snippetResult", "objectID", "_geoloc"];
	docs = docs.map((doc) => {
		const cleaned: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(doc)) {
			if (!stripFields.includes(key)) {
				cleaned[key] = value;
			}
		}
		return cleaned;
	});

	// Infer slug from data if present
	const rawData = data as Record<string, unknown>;
	const slug = (rawData.indexName as string) ?? (rawData.name as string) ?? "algolia-migration";

	return {
		collectionSlug: slug,
		documents: docs,
	};
}

/**
 * Convert Elasticsearch export to AACsearch format.
 * Supports the Elasticsearch bulk export format (newline-delimited JSON with _index/_id).
 */
function convertElasticsearch(data: Record<string, unknown>): ConvertedData {
	// Expected format: { hits: { hits: [{ _index, _id, _source }] } }
	const hits = (data.hits as { hits?: Array<Record<string, unknown>> })?.hits ?? [];

	if (hits.length === 0) {
		throw new Error(
			"No Elasticsearch hits found. Expected format: { hits: { hits: [...] } } or array of docs.",
		);
	}

	const docs = hits.map((hit) => {
		const source = hit._source as Record<string, unknown> | undefined;
		return { id: hit._id as string, ...source };
	});

	const slug = (hits[0]._index as string) ?? "elasticsearch-migration";

	return {
		collectionSlug: slug,
		documents: docs,
	};
}

/**
 * Convert Solr export to AACsearch format.
 */
function convertSolr(data: Record<string, unknown>): ConvertedData {
	// Expected format: { response: { docs: [...] } }
	const response = data.response as { docs?: Array<Record<string, unknown>> } | undefined;
	const docs = response?.docs ?? [];

	if (docs.length === 0) {
		throw new Error(
			"No Solr documents found. Expected format: { response: { docs: [...] } }",
		);
	}

	const slug = (data.core as string) ?? (data.collection as string) ?? "solr-migration";

	return {
		collectionSlug: slug,
		documents: docs,
	};
}
