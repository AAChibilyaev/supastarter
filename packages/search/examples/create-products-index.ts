/**
 * Example: provisioning a `products` search index for an organization.
 *
 * Run from a server context (e.g. Next.js route handler, server action,
 * or CLI script using `tsx`). Requires TYPESENSE_* env vars to be set.
 *
 *   pnpm tsx packages/search/examples/create-products-index.ts <organizationId>
 */
import { createSearchIndex, getSearchIndexBySlug } from "@repo/database";

import { createPhysicalCollection, ensureAlias, type CollectionFieldInput } from "../index";

const SLUG = "products";

async function main() {
	const organizationId = process.argv[2];
	if (!organizationId) {
		throw new Error("Usage: create-products-index.ts <organizationId>");
	}

	const fields = [
		{ name: "id", type: "string" },
		{ name: "title", type: "string" },
		{ name: "description", type: "string", optional: true },
		{ name: "tags", type: "string[]", facet: true, optional: true },
		{ name: "price_cents", type: "int32", optional: true },
		{ name: "created_at", type: "int64" },
	];

	const existing = await getSearchIndexBySlug(organizationId, SLUG);
	if (existing) {
		throw new Error(`Index ${SLUG} already exists for organization ${organizationId}`);
	}

	const created = await createSearchIndex({
		organizationId,
		slug: SLUG,
		displayName: "Products",
		schema: { fields, defaultSortingField: "created_at" },
	});

	await createPhysicalCollection({
		organizationId,
		slug: SLUG,
		version: created.version,
		fields: fields as CollectionFieldInput[],
		defaultSortingField: "created_at",
	});
	await ensureAlias(organizationId, SLUG, created.version);

	console.log(`Created index ${created.id} (org ${organizationId}, slug ${SLUG})`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
