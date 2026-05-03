/**
 * `aacsearch documents import|export` — document import/export with pipe support
 */

import { createReadStream, existsSync, readFileSync } from "fs";
import { createInterface } from "readline/promises";

import { Command } from "commander";

import { ApiClient } from "../lib/client.js";
import { loadConfig } from "../lib/config.js";
import { formatError, formatTable } from "../lib/formatter.js";

export const documentsCommand = new Command("documents").description("Import and export documents");

// ── documents import ───────────────────────────────────────────────────────
documentsCommand
	.command("import [file]")
	.description("Import documents from a JSON/CSV file or stdin (pipe)")
	.option("-c, --collection <slug>", "Collection slug to import into (required)")
	.option("-f, --format <format>", "Input format (auto-detected from extension, or json/csv)")
	.option("--batch-size <n>", "Documents per batch (default: 100)", "100")
	.option("--json", "Output as JSON")
	.action(
		async (
			file: string | undefined,
			options: {
				collection?: string;
				format?: string;
				batchSize?: string;
				json?: boolean;
			},
		) => {
			const config = loadConfig();
			const client = new ApiClient(config);
			const batchSize = Math.min(
				Math.max(parseInt(options.batchSize ?? "100", 10) || 100, 1),
				1000,
			);

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
					console.error("Error: Could not find project. Is your API key valid?");
					process.exit(1);
				}

				const indexes = await client.get<
					Array<{ id: string; slug: string; displayName: string }>
				>(`/v1/projects/${project.id}/indexes`);
				const found = indexes.find(
					(idx) =>
						idx.slug === options.collection || idx.displayName === options.collection,
				);
				if (!found) {
					console.error(
						`Error: Collection "${options.collection}" not found. Use 'aacsearch collections list' to see available collections.`,
					);
					process.exit(1);
				}

				// Read data (file or stdin)
				let rawData: string;
				let detectedFormat: string;

				if (file) {
					if (!existsSync(file)) {
						console.error(`Error: File not found: ${file}`);
						process.exit(1);
					}
					rawData = readFileSync(file, "utf-8");
					detectedFormat =
						(options.format ?? file.toLowerCase().endsWith(".csv")) ? "csv" : "json";
				} else {
					// Pipe mode: read from stdin
					const stdin = process.stdin;
					const chunks: Buffer[] = [];
					for await (const chunk of stdin) {
						chunks.push(Buffer.from(chunk));
					}
					rawData = Buffer.concat(chunks).toString("utf-8");
					detectedFormat = options.format ?? "json";
				}

				if (!rawData.trim()) {
					console.error("Error: No data to import.");
					process.exit(1);
				}

				// Parse input
				let documents: Array<Record<string, unknown>>;
				if (detectedFormat === "csv") {
					documents = parseCsv(rawData);
				} else {
					documents = parseJson(rawData);
				}

				if (documents.length === 0) {
					console.error("Error: No documents found in input.");
					process.exit(1);
				}

				// Import in batches
				const totalDocs = documents.length;
				console.log(`Importing ${totalDocs} documents into "${found.displayName}"...`);

				let imported = 0;
				let errors = 0;

				for (let i = 0; i < totalDocs; i += batchSize) {
					const batch = documents.slice(i, i + batchSize);
					try {
						const result = await client.post<{ success: boolean; count: number }>(
							`/v1/indexes/${found.id}/documents/import`,
							{ documents: batch },
						);
						imported += result.count ?? batch.length;
					} catch (error) {
						errors += batch.length;
						console.error(`Batch ${Math.floor(i / batchSize) + 1} failed:`);
						console.error(formatError(error));
					}

					// Progress indicator
					if (!options.json) {
						process.stdout.write(
							`\r  Progress: ${imported + errors}/${totalDocs} (${imported} ok, ${errors} errors)`,
						);
					}
				}

				if (!options.json) {
					console.log("\n✓ Import complete.");
					console.log(`  Imported: ${imported}`);
					console.log(`  Errors:   ${errors}`);
				} else {
					console.log(JSON.stringify({ imported, errors, total: totalDocs }, null, 2));
				}
			} catch (error) {
				console.error(formatError(error));
				process.exit(1);
			}
		},
	);

// ── documents export ───────────────────────────────────────────────────────
documentsCommand
	.command("export")
	.description("Export documents from a collection")
	.option("-c, --collection <slug>", "Collection slug to export from (required)")
	.option("-o, --output <file>", "Output file path (default: stdout)")
	.option("-f, --format <format>", "Output format: json or csv (default: json)")
	.option("--filter <expression>", "Filter expression (e.g. 'price:>10')")
	.option("--limit <n>", "Maximum documents to export (default: all)", "10000")
	.action(
		async (options: {
			collection?: string;
			output?: string;
			format?: string;
			filter?: string;
			limit?: string;
		}) => {
			const config = loadConfig();
			const client = new ApiClient(config);
			const limit = parseInt(options.limit ?? "10000", 10) || 10000;
			const format = options.format ?? "json";

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
					console.error("Error: Could not find project. Is your API key valid?");
					process.exit(1);
				}

				const indexes = await client.get<
					Array<{ id: string; slug: string; displayName: string }>
				>(`/v1/projects/${project.id}/indexes`);
				const found = indexes.find(
					(idx) =>
						idx.slug === options.collection || idx.displayName === options.collection,
				);
				if (!found) {
					console.error(
						`Error: Collection "${options.collection}" not found. Use 'aacsearch collections list' to see available collections.`,
					);
					process.exit(1);
				}

				// Search for all documents (use * query, page through)
				const allDocs: Array<Record<string, unknown>> = [];
				const perPage = Math.min(limit, 250);
				let page = 1;
				let totalFound = 0;

				do {
					const body: Record<string, unknown> = {
						q: "*",
						perPage,
						page,
					};
					if (options.filter) body.filterBy = options.filter;

					const result = await client.post<{
						hits?: Array<Record<string, unknown>>;
						found?: number;
						perPage?: number;
						page?: number;
					}>(`/v1/indexes/${found.id}/search`, body);

					totalFound = result.found ?? 0;
					const hits = result.hits ?? [];

					for (const hit of hits) {
						allDocs.push((hit.document as Record<string, unknown>) ?? hit);
					}

					page++;
				} while (allDocs.length < Math.min(totalFound, limit));

				console.error(`Exported ${allDocs.length} documents from "${found.displayName}".`);

				// Format output
				let output: string;
				if (format === "csv") {
					output = toCsv(allDocs);
				} else {
					output = JSON.stringify(allDocs, null, 2);
				}

				if (options.output) {
					const { writeFileSync } = await import("fs");
					writeFileSync(options.output, output, "utf-8");
					console.error(`Written to ${options.output}`);
				} else {
					console.log(output);
				}
			} catch (error) {
				console.error(formatError(error));
				process.exit(1);
			}
		},
	);

// ── documents list (quick summary) ─────────────────────────────────────────
documentsCommand
	.command("list")
	.description("List documents in a collection (summary)")
	.option("-c, --collection <slug>", "Collection slug (required)")
	.option("--limit <n>", "Max documents to show (default: 20)", "20")
	.option("--json", "Output as JSON")
	.action(async (options: { collection?: string; limit?: string; json?: boolean }) => {
		const config = loadConfig();
		const client = new ApiClient(config);
		const limit = Math.min(Math.max(parseInt(options.limit ?? "20", 10) || 20, 1), 100);

		if (!options.collection) {
			console.error(
				"Error: --collection is required. Use 'aacsearch collections list' to see available collections.",
			);
			process.exit(1);
		}

		try {
			// Resolve
			const projects = await client.get<Array<{ id: string }>>("/v1/projects");
			const project = projects?.[0];
			if (!project?.id) {
				console.error("Error: Could not find project. Is your API key valid?");
				process.exit(1);
			}

			const indexes = await client.get<
				Array<{ id: string; slug: string; displayName: string }>
			>(`/v1/projects/${project.id}/indexes`);
			const found = indexes.find(
				(idx) => idx.slug === options.collection || idx.displayName === options.collection,
			);
			if (!found) {
				console.error(`Error: Collection "${options.collection}" not found.`);
				process.exit(1);
			}

			const result = await client.post<{
				hits?: Array<Record<string, unknown>>;
				found?: number;
			}>(`/v1/indexes/${found.id}/search`, {
				q: "*",
				perPage: limit,
				page: 1,
			});

			const hits = result.hits ?? [];
			const foundCount = result.found ?? 0;

			if (options.json) {
				console.log(JSON.stringify({ found: foundCount, documents: hits }, null, 2));
				return;
			}

			console.log(`Found ${foundCount} documents in "${found.displayName}":`);
			console.log("");

			const keys = hits.length > 0 ? Object.keys(hits[0]).slice(0, 4) : [];
			const rows = hits.map((hit) => {
				const row: Record<string, string> = {};
				for (const key of keys) {
					const val = (hit[key] as string) ?? "";
					row[key] =
						typeof val === "string" ? val.slice(0, 50) : String(val).slice(0, 50);
				}
				return row;
			});

			if (rows.length > 0) {
				console.log(
					formatTable(
						rows,
						keys.map((k) => ({ header: k })),
						{ maxWidth: 40 },
					),
				);
			}

			if (foundCount > limit) {
				console.log(`\n... and ${foundCount - limit} more. Use --limit to show more.`);
			}
		} catch (error) {
			console.error(formatError(error));
			process.exit(1);
		}
	});

// ── Helper: Parse JSON array or NDJSON ─────────────────────────────────────
function parseJson(raw: string): Array<Record<string, unknown>> {
	const trimmed = raw.trim();

	// Try parsing as JSON array
	if (trimmed.startsWith("[")) {
		return JSON.parse(trimmed) as Array<Record<string, unknown>>;
	}

	// Try NDJSON (one JSON object per line)
	const lines = trimmed.split("\n").filter((l) => l.trim());
	const docs: Array<Record<string, unknown>> = [];
	for (const line of lines) {
		try {
			const parsed = JSON.parse(line.trim()) as Record<string, unknown>;
			docs.push(parsed);
		} catch {
			throw new Error(`Invalid JSON on line ${docs.length + 1}: ${line.slice(0, 80)}`);
		}
	}
	return docs;
}

// ── Helper: Parse CSV ──────────────────────────────────────────────────────
function parseCsv(raw: string): Array<Record<string, unknown>> {
	const lines = raw.trim().split("\n");
	if (lines.length < 2) {
		throw new Error("CSV must have a header row and at least one data row.");
	}

	const headers = parseCsvLine(lines[0]);
	const docs: Array<Record<string, unknown>> = [];

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		const values = parseCsvLine(line);
		const doc: Record<string, unknown> = {};
		for (let j = 0; j < headers.length; j++) {
			const val = values[j] ?? "";
			// Try to coerce numbers and booleans
			doc[headers[j]] = coerceValue(val);
		}
		docs.push(doc);
	}

	return docs;
}

function parseCsvLine(line: string): string[] {
	const values: string[] = [];
	let current = "";
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (ch === '"') {
			if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
				current += '"';
				i++;
			} else {
				inQuotes = !inQuotes;
			}
		} else if (ch === "," && !inQuotes) {
			values.push(current);
			current = "";
		} else {
			current += ch;
		}
	}
	values.push(current);

	return values;
}

function coerceValue(val: string): string | number | boolean {
	if (val === "") return val;
	if (val === "true") return true;
	if (val === "false") return false;
	const num = Number(val);
	if (!Number.isNaN(num) && val.trim() !== "") return num;
	return val;
}

// ── Helper: Convert docs to CSV ────────────────────────────────────────────
function toCsv(docs: Array<Record<string, unknown>>): string {
	if (docs.length === 0) return "";

	// Collect all unique keys
	const keys = new Set<string>();
	for (const doc of docs) {
		for (const key of Object.keys(doc)) {
			keys.add(key);
		}
	}

	const headerKeys = Array.from(keys);
	const lines: string[] = [];

	// Header
	lines.push(headerKeys.map(escapeCsvField).join(","));

	// Data
	for (const doc of docs) {
		const row = headerKeys.map((key) => {
			const val = doc[key];
			return escapeCsvField(val != null ? String(val) : "");
		});
		lines.push(row.join(","));
	}

	return lines.join("\n");
}

function escapeCsvField(val: string): string {
	if (val.includes(",") || val.includes('"') || val.includes("\n")) {
		return `"${val.replace(/"/g, '""')}"`;
	}
	return val;
}
