/**
 * Build-time ingest script for AACSearch-powered docs search (dogfood).
 *
 * Collects all MDX page content from Fumadocs and ingests it into
 * an AACSearch index. Run: `pnpm --filter docs ingest:docs`
 *
 * Requires env vars:
 *   AACSEARCH_DOCS_BASE_URL  — AACSearch API base URL (e.g. http://localhost:3000)
 *   AACSEARCH_DOCS_ADMIN_KEY — Admin API key (aa_admin_*)
 *   AACSEARCH_DOCS_PROJECT_ID — Organization/project ID
 *
 * The script:
 * 1. Creates a "docs" index (if not exists)
 * 2. Collects all pages from Fumadocs source
 * 3. Batches upsert into the index
 */
import fs from "node:fs";
import path from "node:path";

import { source } from "@/lib/source";

interface DocDocument {
	id: string;
	title: string;
	description: string;
	content: string;
	url: string;
	locale: string;
	category: string;
}

const BASE_URL = process.env.AACSEARCH_DOCS_BASE_URL || "http://localhost:3000";
const ADMIN_KEY = process.env.AACSEARCH_DOCS_ADMIN_KEY || "";
const PROJECT_ID = process.env.AACSEARCH_DOCS_PROJECT_ID || "";
const DOCS_INDEX_SLUG = "docs";

async function request<T>(
	method: string,
	pathStr: string,
	body?: unknown,
): Promise<T> {
	const res = await fetch(`${BASE_URL}/api/v1${pathStr}`, {
		method,
		headers: {
			"Content-Type": "application/json",
			"X-API-Key": ADMIN_KEY,
		},
		body: body ? JSON.stringify(body) : undefined,
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "unknown error");
		throw new Error(`AACSearch API ${res.status}: ${text}`);
	}

	if (res.status === 204) return undefined as T;
	return res.json() as T;
}

async function ensureDocsIndex(): Promise<string> {
	// Try to find existing docs index
	const indexes = await request<Array<{ id: string; slug: string }>>(
		"GET",
		`/projects/${encodeURIComponent(PROJECT_ID)}/indexes`,
	);

	const existing = indexes.find((idx) => idx.slug === DOCS_INDEX_SLUG);
	if (existing) {
		console.log(`Found existing docs index: ${existing.id}`);
		return existing.id;
	}

	// Create the docs index
	const created = await request<{ id: string; slug: string }>(
		"POST",
		`/projects/${encodeURIComponent(PROJECT_ID)}/indexes`,
		{
			slug: DOCS_INDEX_SLUG,
			displayName: "Documentation",
			schema: {
				fields: [
					{ name: "title", type: "string" as const },
					{ name: "description", type: "string" as const },
					{ name: "content", type: "string" as const },
					{ name: "url", type: "string" as const },
					{ name: "locale", type: "string" as const, facet: true },
					{ name: "category", type: "string" as const, facet: true },
				],
			},
		},
	);

	console.log(`Created docs index: ${created.id}`);
	return created.id;
}

async function collectPages(): Promise<DocDocument[]> {
	const docs: DocDocument[] = [];
	const locales = ["en", "de", "es", "fr", "ru"];

	for (const locale of locales) {
		const pages = source.getPages(locale);

		for (const page of pages) {
			try {
				const text = await page.data.getText("processed");

				// Extract first heading or use title
				const title = page.data.title || page.slugs.join(" / ");
				const description = page.data.description || "";
				const url =
					locale === "en"
						? `/${page.slugs.join("/")}`
						: `/${locale}/${page.slugs.join("/")}`;

				const category = page.slugs[0] || "general";

				docs.push({
					id: `${locale}-${page.slugs.join("-")}`,
					title,
					description,
					content: text || "",
					url,
					locale,
					category,
				});

				console.log(`  Collected: ${url}`);
			} catch (error) {
				console.warn(`  Failed to process page: ${page.slugs.join("/")}`, error);
			}
		}
	}

	return docs;
}

async function ingestPages(
	indexId: string,
	docs: DocDocument[],
): Promise<void> {
	const BATCH_SIZE = 100;

	for (let i = 0; i < docs.length; i += BATCH_SIZE) {
		const batch = docs.slice(i, i + BATCH_SIZE);
		const result = await request<{ success: number; errors: number }>(
			"POST",
			`/indexes/${encodeURIComponent(indexId)}/documents:batch`,
			{ documents: batch },
		);

		console.log(`  Batch ${i / BATCH_SIZE + 1}: ${result.success} success, ${result.errors} errors`);
	}
}

async function main() {
	console.log("=== AACSearch Docs Ingest ===");

	if (!ADMIN_KEY) {
		console.log("AACSEARCH_DOCS_ADMIN_KEY not set — skipping AACSearch ingest");
		console.log("Writing doc content to docs-index.json for manual upload");
		const docs = await collectPages();
		fs.writeFileSync(
			path.join(__dirname, "..", "docs-index.json"),
			JSON.stringify(docs, null, 2),
			"utf-8",
		);
		console.log(`Wrote ${docs.length} documents to docs-index.json`);
		return;
	}

	try {
		// Ensure the docs index exists
		console.log("\n1. Ensuring docs index exists...");
		const indexId = await ensureDocsIndex();

		// Collect all pages
		console.log("\n2. Collecting pages...");
		const docs = await collectPages();
		console.log(`   Total: ${docs.length} documents`);

		// Ingest in batches
		console.log("\n3. Ingesting pages...");
		await ingestPages(indexId, docs);

		console.log("\nDone! Docs search is ready.");
		console.log(`Index ID: ${indexId}`);
		console.log(`Total documents: ${docs.length}`);
	} catch (error) {
		console.error("Ingest failed:", error);
		process.exit(1);
	}
}

main();
