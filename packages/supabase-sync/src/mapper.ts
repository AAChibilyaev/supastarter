/**
 * Utility functions for mapping Supabase rows to AACsearch documents.
 */

/** Default mapper: ensures an external_id field and converts date/JSON fields safely */
export function defaultMapper(
	row: Record<string, unknown>,
	idColumn: string = "id",
): Record<string, unknown> {
	const doc: Record<string, unknown> = {
		external_id: String(row[idColumn] ?? ""),
	};

	for (const [key, value] of Object.entries(row)) {
		if (key === idColumn) continue; // already set as external_id
		if (value === null || value === undefined) continue;

		// Serialize objects/arrays to JSON strings
		if (typeof value === "object") {
			doc[key] = JSON.stringify(value);
		} else if (value instanceof Date) {
			doc[key] = value.toISOString();
		} else {
			doc[key] = value;
		}
	}

	return doc;
}

/** Pick specific columns from a Supabase row */
export function pickColumns(
	row: Record<string, unknown>,
	columns: string[],
	idColumn: string = "id",
): Record<string, unknown> {
	const doc: Record<string, unknown> = {
		external_id: String(row[idColumn] ?? ""),
	};

	for (const col of columns) {
		if (col in row && row[col] !== null) {
			doc[col] = row[col];
		}
	}

	return doc;
}

/** Convert a Supabase row's JSON column into a flat document field */
export function flattenJsonColumn(
	row: Record<string, unknown>,
	jsonColumn: string,
	prefix: string = "",
): Record<string, unknown> {
	const doc: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(row)) {
		if (key === jsonColumn && typeof value === "object" && value !== null) {
			const obj = value as Record<string, unknown>;
			for (const [subKey, subValue] of Object.entries(obj)) {
				const targetKey = prefix ? `${prefix}${subKey}` : subKey;
				doc[targetKey] = subValue;
			}
		} else {
			doc[key] = value;
		}
	}

	return doc;
}
