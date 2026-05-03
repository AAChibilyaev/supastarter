/**
 * Build-time ingest script for AACSearch docs search.
 *
 * Reads all Fumadocs pages and ingests them into the AACSearch docs index
 * via the v1 REST API (AdminClient). Run as a prebuild step.
 *
 * Usage:
 *   npx tsx apps/docs/scripts/ingest-docs.ts
 *
 * Env:
 *   AACSEARCH_BASE_URL  — AACSearch API base URL (default: http://localhost:3010)
 *   AACSEARCH_ADMIN_KEY — Admin API key (aa_admin_*) with index/document write scope
 *   AACSEARCH_DOCS_INDEX_SLUG — Docs index slug (default: "docs")
 */

import { defineI18n } from "fumadocs-core/i18n";
import { loader } from "fumadocs-core/source";
import { docs } from "fumadocs-mdx:collections/server";

// ── Config ────────────────────────────────────────────────────

const BASE_URL = (process.env.AACSEARCH_BASE_URL ?? "http://localhost:3010").replace(/\/+$/, "");
const ADMIN_KEY = process.env.AACSEARCH_ADMIN_KEY ?? "";
const INDEX_SLUG = process.env.AACSEARCH_DOCS_INDEX_SLUG ?? "docs";

const LOCALES = ["en", "de", "es", "fr", "ru"] as const;

// ── Fumadocs source ───────────────────────────────────────────

const i18nConfig = defineI18n({
	languages: [...LOCALES],
	defaultLanguage: "en",
	parser: "dir",
	hideLocale: "default-locale",
});

const source = loader({
	baseUrl: "/",
	source: docs.toFumadocsSource(),
	i18n: i18nConfig,
});

// ── Helpers ───────────────────────────────────────────────────

async function apiRequest(method: string, path: string, body?: unknown) {
	const url = `${BASE_URL}/api/v1${path}`;
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		Authorization: `Bearer ${ADMIN_KEY}`,
	};

	const res = await fetch(url, {
		method,
		headers,
		body: body ? JSON.stringify(body) : undefined,
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "unknown error");
		console.error(`[ingest] ${method} ${path} → ${res.status}: ${text}`);
		return null;
	}

	const data = res.status === 204 ? null : await res.json();
	return data;
}

async function getProjectId(): Promise<string | null> {
	const keys = await apiRequest("GET", "/projects/keys");
	if (keys && Array.isArray(keys)) {
		// First key has the projectId
		if (keys.length > 0 && keys[0].projectId) return keys[0].projectId;
	}
	return null;
}

async function ensureIndex(projectId: string): Promise<{ id: string } | null> {
	// Check if index already exists
	const indexes = await apiRequest("GET", `/projects/${projectId}/indexes`);
	if (indexes && Array.isArray(indexes)) {
		const existing = indexes.find((idx: { slug: string }) => idx.slug === INDEX_SLUG);
		if (existing) {
			console.log(`[ingest] Found existing index: ${INDEX_SLUG} (${existing.id})`);
			return existing;
		}
	}

	// Create new index
	console.log(`[ingest] Creating index: ${INDEX_SLUG}...`);
	const created = await apiRequest("POST", `/projects/${projectId}/indexes`, {
		slug: INDEX_SLUG,
		displayName: "Documentation",
		fields: [
			{ name: "title", type: "string", index: true, store: true },
			{ name: "description", type: "string", index: true, store: true, optional: true },
			{ name: "content", type: "string", index: true },
			{ name: "url", type: "string", index: false, store: true },
			{ name: "locale", type: "string", index: true, store: true, facet: true },
			{
				name: "section",
				type: "string",
				index: true,
				store: true,
				facet: true,
				optional: true,
			},
		],
		defaultSortingField: "title",
	});

	if (created) {
		console.log(`[ingest] Created index: ${INDEX_SLUG} (${created.id})`);
	}
	return created;
}

async function ingestAllPages(indexId: string) {
	const allDocuments: Record<string, unknown>[] = [];

	for (const locale of LOCALES) {
		const pages = source.getPages(locale);
		console.log(`[ingest] Processing ${pages.length} pages for locale: ${locale}`);

		for (const page of pages) {
			const title = (page.data.title as string) ?? "Untitled";
			const description = page.data.description as string | undefined;
			const slugs = page.slugs as string[];

			// Extract raw content from the processed MDX
			let content = "";
			try {
				content = await page.data.getText("processed");
			} catch {
				try {
					content = await page.data.getText();
				} catch {
					content = "";
				}
			}

			if (!content) continue;

			// Determine section from slugs (first directory segment)
			const section = slugs.length > 1 ? slugs[0] : "home";

			// Build URL path
			const url = locale === "en" ? `/${slugs.join("/")}` : `/${locale}/${slugs.join("/")}`;

			// Create a unique document ID based on locale + slugs
			const docId = locale === "en" ? slugs.join("/") : `${locale}/${slugs.join("/")}`;

			allDocuments.push({
				id: docId,
				title,
				description: description ?? "",
				content,
				url,
				locale,
				section,
			});
		}
	}

	if (allDocuments.length === 0) {
		console.log("[ingest] No documents to ingest.");
		return;
	}

	// Batch upsert in chunks of 500
	const CHUNK_SIZE = 500;
	for (let i = 0; i < allDocuments.length; i += CHUNK_SIZE) {
		const chunk = allDocuments.slice(i, i + CHUNK_SIZE);
		console.log(
			`[ingest] Upserting ${chunk.length} documents (batch ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(allDocuments.length / CHUNK_SIZE)})...`,
		);

		const result = await apiRequest("POST", `/indexes/${indexId}/documents:batch`, {
			documents: chunk,
		});

		if (result) {
			console.log(`[ingest] Batch result: ${JSON.stringify(result)}`);
		}
	}

	console.log(
		`[ingest] Done! Ingested ${allDocuments.length} documents across ${LOCALES.length} locales.`,
	);
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
	if (!ADMIN_KEY) {
		console.error("[ingest] Missing AACSEARCH_ADMIN_KEY env var. Skipping ingest.");
		console.error(
			"[ingest] Create an admin API key in the SaaS dashboard and set AACSEARCH_ADMIN_KEY.",
		);
		process.exit(1);
	}

	console.log(`[ingest] Starting docs ingest to ${BASE_URL}...`);

	const projectId = await getProjectId();
	if (!projectId) {
		console.error(
			"[ingest] Could not determine project ID. Make sure the AACSearch API is running.",
		);
		process.exit(1);
	}

	const index = await ensureIndex(projectId);
	if (!index) {
		console.error("[ingest] Failed to create or find docs index.");
		process.exit(1);
	}

	await ingestAllPages(index.id);
}

main().catch((err: unknown) => {
	console.error("[ingest] Fatal error:", err);
	process.exit(1);
});
