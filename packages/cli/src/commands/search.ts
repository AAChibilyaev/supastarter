/**
 * `aacsearch search <query>` — search across collections
 */

import { Command } from "commander";

import { ApiClient } from "../lib/client.js";
import { loadConfig } from "../lib/config.js";
import { formatError, formatSearchResults } from "../lib/formatter.js";

interface SearchResult {
	hits?: Array<Record<string, unknown>>;
	found?: number;
	page?: number;
	perPage?: number;
	facetCounts?: Array<Record<string, unknown>>;
	searchTimeMs?: number;
}

interface IndexInfo {
	id: string;
	slug: string;
	displayName: string;
}

export const searchCommand = new Command("search")
	.description("Search across a collection")
	.argument("[query]", "Search query (use * for all documents)")
	.option("-c, --collection <slug>", "Collection slug to search")
	.option("--query-by <fields>", "Fields to search (comma-separated)")
	.option("--filter-by <expression>", "Filter expression (e.g. 'price:>10')")
	.option("--facet-by <fields>", "Facet fields (comma-separated)")
	.option("--sort-by <field:order>", "Sort field and direction")
	.option("--per-page <n>", "Results per page (1-100)", "10")
	.option("--page <n>", "Page number", "1")
	.option("--json", "Output as JSON")
	.action(
		async (
			query: string | undefined,
			options: {
				collection?: string;
				queryBy?: string;
				filterBy?: string;
				facetBy?: string;
				sortBy?: string;
				perPage?: string;
				page?: string;
				json?: boolean;
			},
		) => {
			const config = loadConfig();
			const client = new ApiClient(config);
			const perPage = Math.min(Math.max(parseInt(options.perPage ?? "10", 10) || 10, 1), 100);
			const page = Math.max(parseInt(options.page ?? "1", 10) || 1, 1);

			try {
				let indexId = "";

				if (options.collection) {
					// Find the index by slug
					const projects = await client.get<Array<Record<string, string>>>("/v1/projects");
					const project = projects?.[0];
					const projectId = project?.id;
					if (!projectId) {
						console.error("Error: Could not find project. Is your API key valid?");
						process.exit(1);
					}
					const indexes = await client.get<IndexInfo[]>(`/v1/projects/${projectId}/indexes`);
					const found = indexes.find(
						(idx) => idx.slug === options.collection || idx.displayName === options.collection,
					);
					if (!found) {
						console.error(
							`Error: Collection "${options.collection}" not found. Use 'aacsearch collections list' to see available collections.`,
						);
						process.exit(1);
					}
					indexId = found.id;
				}

				// If no collection specified and no indexId resolved, try discovering from config
				if (!indexId) {
					// Try to get index info from the projects endpoint
					try {
						const projects = await client.get<Array<Record<string, string>>>("/v1/projects");
						const project = projects?.[0];
						const projectId = project?.id;
						if (projectId) {
							const indexes = await client.get<IndexInfo[]>(`/v1/projects/${projectId}/indexes`);
							if (indexes.length === 1) {
								indexId = indexes[0].id;
							} else if (indexes.length === 0) {
								console.error("Error: No collections found in your project.");
								process.exit(1);
							} else {
								console.error(
									"Error: Multiple collections found. Use --collection to specify one.",
								);
								console.error("Available collections:");
								for (const idx of indexes) {
									console.error(`  ${idx.slug} (${idx.displayName})`);
								}
								process.exit(1);
							}
						}
					} catch {
						console.error("Error: Could not determine collection. Use --collection.");
						process.exit(1);
					}
				}

				const body: Record<string, unknown> = {
					q: query ?? "*",
					perPage,
					page,
				};
				if (options.queryBy) body.queryBy = options.queryBy;
				if (options.filterBy) body.filterBy = options.filterBy;
				if (options.facetBy) body.facetBy = options.facetBy;
				if (options.sortBy) body.sortBy = options.sortBy;

				const result = await client.post<SearchResult>(`/v1/indexes/${indexId}/search`, body);

				console.log(formatSearchResults(result, { json: options.json ?? false }));
			} catch (error) {
				console.error(formatError(error));
				process.exit(1);
			}
		},
	);
