import { describe, expect, it } from "vitest";

import { aliasName, physicalCollectionName } from "./collections";

describe("physicalCollectionName", () => {
	it("encodes organization id, slug and version", () => {
		expect(physicalCollectionName("org123", "products", 1)).toBe("ss_org123_products_v1");
	});

	it("sanitizes non-alphanumeric chars in organization id", () => {
		expect(physicalCollectionName("org-abc.123", "products", 2)).toBe(
			"ss_org_abc_123_products_v2",
		);
	});

	it("sanitizes slugs with dashes (Typesense disallows '-')", () => {
		expect(physicalCollectionName("org1", "blog-posts", 5)).toBe("ss_org1_blog_posts_v5");
	});
});

describe("aliasName", () => {
	it("does not include version", () => {
		expect(aliasName("org123", "products")).toBe("ss_org123_products");
	});

	it("matches the prefix used by physicalCollectionName for any version", () => {
		const alias = aliasName("org1", "items");
		const physical = physicalCollectionName("org1", "items", 7);
		expect(physical.startsWith(`${alias}_v`)).toBe(true);
	});

	it("uses the same sanitization as physicalCollectionName", () => {
		const alias = aliasName("org-1", "blog-posts");
		expect(alias).toBe("ss_org_1_blog_posts");
	});
});
