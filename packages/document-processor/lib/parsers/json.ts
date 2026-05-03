import type { ParsedDocument } from "../types";

export async function parseJson(
	content: Buffer | string,
	filename: string,
): Promise<ParsedDocument> {
	const text = typeof content === "string" ? content : content.toString("utf-8");
	let data: unknown;

	try {
		data = JSON.parse(text);
	} catch {
		return {
			title: filename.replace(/\.json$/i, ""),
			content: text,
			mimeType: "application/json",
			metadata: { error: "Invalid JSON" },
		};
	}

	const serialized = JSON.stringify(data, null, 2);
	const flattened = flattenJson(data as Record<string, unknown>);

	return {
		title: filename.replace(/\.json$/i, ""),
		content: serialized,
		mimeType: "application/json",
		metadata: {
			topLevelKeys: Object.keys(data as Record<string, unknown>).length,
			itemsInArrays: flattened.arrayItemCount,
			wordCount: serialized.split(/\s+/).filter(Boolean).length,
		},
	};
}

function flattenJson(
	obj: Record<string, unknown>,
	prefix = "",
): {
	arrayItemCount: number;
} {
	let arrayItemCount = 0;

	for (const [key, value] of Object.entries(obj)) {
		if (Array.isArray(value)) {
			arrayItemCount += value.length;
			for (const item of value) {
				if (typeof item === "object" && item !== null) {
					const nested = flattenJson(item as Record<string, unknown>, `${prefix}${key}.`);
					arrayItemCount += nested.arrayItemCount;
				}
			}
		} else if (typeof value === "object" && value !== null) {
			const nested = flattenJson(value as Record<string, unknown>, `${prefix}${key}.`);
			arrayItemCount += nested.arrayItemCount;
		}
	}

	return { arrayItemCount };
}
