/**
 * Output formatting utilities for AACsearch CLI.
 * Supports table-style terminal output and JSON mode.
 */

export interface Column {
	header: string;
	align?: "left" | "right";
}

export function formatTable<T extends Record<string, string>>(
	rows: T[],
	columns: Column[],
	options?: { maxWidth?: number },
): string {
	if (rows.length === 0) {
		return "No results.";
	}

	const keys = Object.keys(rows[0] ?? {});
	const colWidths = columns.map((col, i) => {
		const key = keys[i] ?? col.header;
		const headerLen = col.header.length;
		const maxDataLen = Math.max(
			...rows.map((r) => String(r[key] ?? "").length),
		);
		const maxW = options?.maxWidth ?? 80;
		return Math.min(Math.max(headerLen, maxDataLen), maxW);
	});

	// Header
	const headerLine = columns
		.map((col, i) => col.header.padEnd(colWidths[i]))
		.join("  ");
	const separator = colWidths.map((w) => "─".repeat(w)).join("──");

	const lines: string[] = [headerLine, separator];

	for (const row of rows) {
		const line = columns
			.map((col, i) => {
				const key = keys[i] ?? col.header;
				const val = String(row[key] ?? "");
				if (col.align === "right") {
					return val.padStart(colWidths[i]);
				}
				return val.padEnd(colWidths[i]);
			})
			.join("  ");
		lines.push(line);
	}

	return lines.join("\n");
}

export function formatSearchResults(
	data: {
		hits?: Array<Record<string, unknown>>;
		found?: number;
		page?: number;
		perPage?: number;
		facetCounts?: Array<Record<string, unknown>>;
		searchTimeMs?: number;
	},
	options: { json?: boolean },
): string {
	if (options.json) {
		return JSON.stringify(data, null, 2);
	}

	const lines: string[] = [];

	// Summary
	const found = data.found ?? 0;
	const page = data.page ?? 1;
	const perPage = data.perPage ?? 10;
	const totalPages = Math.ceil(found / perPage);
	const time = data.searchTimeMs ?? 0;
	lines.push(`Found ${found} results (page ${page}/${totalPages}, ${time}ms)`);
	lines.push("");

	// Hits table
	const hits = data.hits ?? [];
	if (hits.length > 0) {
		// Collect all unique keys from hits
		const keySet = new Set<string>();
		for (const hit of hits) {
			for (const key of Object.keys(hit)) {
				if (key !== "document" && key !== "highlights" && key !== "text_match_info") {
					keySet.add(key);
				}
			}
			// Also extract document fields
			const doc = hit.document as Record<string, unknown> | undefined;
			if (doc) {
				for (const key of Object.keys(doc)) {
					keySet.add(key);
				}
			}
		}

		const keys = Array.from(keySet).slice(0, 6); // Limit to 6 columns

		const rows = hits.map((hit) => {
			const doc = (hit.document as Record<string, unknown>) ?? hit;
			const row: Record<string, string> = {};
			for (const key of keys) {
				const val = (doc[key] as string) ?? "";
				row[key] = typeof val === "string" ? val.slice(0, 60) : String(val).slice(0, 60);
			}
			return row;
		});

		lines.push(
			formatTable(rows, keys.map((k) => ({ header: k })), { maxWidth: 40 }),
		);
	}

	// Facets
	const facetCounts = data.facetCounts ?? [];
	if (facetCounts.length > 0) {
		lines.push("");
		lines.push("Facets:");
		for (const facet of facetCounts) {
			const fieldName = (facet.field_name as string) ?? "?";
			const counts = (facet.counts as Array<Record<string, unknown>>) ?? [];
			const facetStr = counts
				.slice(0, 10)
				.map((c) => `${String(c.value)}: ${String(c.count)}`)
				.join(", ");
			lines.push(`  ${fieldName}: ${facetStr}`);
		}
	}

	return lines.join("\n");
}

export function formatKeyList(
	keys: Array<Record<string, unknown>>,
	options: { json?: boolean },
): string {
	if (options.json) {
		return JSON.stringify(keys, null, 2);
	}

	if (keys.length === 0) {
		return "No API keys found.";
	}

	const rows = keys.map((k) => ({
		id: (k.id as string)?.slice(0, 8) ?? "?",
		name: (k.name as string) ?? "?",
		prefix: (k.prefix as string) ?? "?",
		scopes: Array.isArray(k.scopes) ? (k.scopes as string[]).join(",") : "?",
		index: (k.indexDisplayName as string) ?? (k.indexSlug as string) ?? "?",
		status: k.revokedAt ? "revoked" : k.expiresAt ? "active" : "active",
	}));

	return formatTable(rows, [
		{ header: "ID (first 8)" },
		{ header: "Name" },
		{ header: "Prefix" },
		{ header: "Scopes" },
		{ header: "Index" },
		{ header: "Status" },
	]);
}

export function formatCreatedKey(
	key: Record<string, unknown>,
	options: { json?: boolean },
): string {
	if (options.json) {
		return JSON.stringify(key, null, 2);
	}

	const lines: string[] = [];
	lines.push("✓ API key created:");
	lines.push(`  ID:     ${(key.id as string) ?? "?"}`);
	lines.push(`  Name:   ${(key.name as string) ?? "?"}`);
	lines.push(`  Prefix: ${(key.prefix as string) ?? "?"}`);
	lines.push(`  Scopes: ${Array.isArray(key.scopes) ? (key.scopes as string[]).join(", ") : "?"}`);

	const rawKey = key.rawKey as string | undefined;
	if (rawKey) {
		lines.push("");
		lines.push("  ⚠️  This is the only time the raw key is shown:");
		lines.push(`  ${rawKey}`);
		lines.push("  Store it securely. It cannot be recovered later.");
	}

	return lines.join("\n");
}

export function formatError(error: unknown): string {
	if (error && typeof error === "object" && "status" in error) {
		const apiErr = error as { status: number; message: string; body?: string };
		let msg = `Error ${apiErr.status}: ${apiErr.message}`;
		if (apiErr.body) {
			try {
				const body = JSON.parse(apiErr.body) as Record<string, unknown>;
				if (body.message) {
					msg = `Error ${apiErr.status}: ${body.message as string}`;
				}
			} catch {
				// ignore parse failure
			}
		}
		return msg;
	}
	return String(error);
}
