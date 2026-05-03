/**
 * generate-api-ref.ts
 *
 * Generates API reference MDX pages from the AACsearch v1 OpenAPI 3.1 spec.
 * Uses fumadocs-openapi's generateFiles() to create endpoint pages,
 * auto-grouped by tag.
 *
 * Run before fumadocs-mdx so the MDX loader picks up the generated files.
 *
 * Usage: node --import tsx scripts/generate-api-ref.ts
 */

import * as path from "node:path";

import { generateFiles } from "fumadocs-openapi";
import { createOpenAPI } from "fumadocs-openapi/server";

async function main(): Promise<void> {
	const REPO_ROOT = path.resolve(process.cwd(), "../..");
	const outputDir = path.resolve(process.cwd(), "content/docs/en/api-reference");

	// Import and execute the v1 OpenAPI spec generator
	const { generateOpenApiSpec } = await import(
		path.join(REPO_ROOT, "packages/api/v1/openapi.ts")
	);

	const spec = generateOpenApiSpec();

	const server = createOpenAPI({
		input: () => ({
			"aacsearch-api-v1": spec,
		}),
	});

	await generateFiles({
		input: server,
		output: outputDir,
		// Group pages by route — /projects/{id} → /api-reference/projects/{id}
		groupBy: "route",
		// Generate meta.json files for navigation
		meta: {
			groupStyle: "separator",
		},
		// Add description text to each page body
		includeDescription: true,
		// Custom frontmatter for Fumadocs compatibility
		frontmatter(title, description) {
			return {
				title,
				description: description ?? "",
				full: true,
			};
		},
	});

	console.log(`[generate-api-ref] MDX pages written to ${outputDir}`);
}

main().catch((err) => {
	console.error("[generate-api-ref] Failed:", err);
	process.exit(1);
});
