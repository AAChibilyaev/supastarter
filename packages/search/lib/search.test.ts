import { describe, expect, it, vi } from "vitest";

vi.mock("./client", () => ({
	getTypesenseClient: () => ({
		collections: () => ({
			documents: () => ({
				search: vi.fn(async (params: Record<string, unknown>) => {
					capturedParams = params;
					return {
						hits: [],
						found: 0,
						page: 1,
						facet_counts: [],
						search_time_ms: 0,
					};
				}),
			}),
		}),
	}),
}));

let capturedParams: Record<string, unknown> = {};

import { searchDocuments } from "./search";

describe("searchDocuments", () => {
	it("always merges tenant_id filter when no userFilter is set", async () => {
		await searchDocuments({
			alias: "ss_org1_products",
			tenantId: "org1",
			q: "*",
			queryBy: "title",
		});
		expect(capturedParams.filter_by).toBe("tenant_id:=org1");
	});

	it("AND-merges userFilter with mandatory tenant_id filter", async () => {
		await searchDocuments({
			alias: "ss_org1_products",
			tenantId: "org1",
			q: "*",
			queryBy: "title",
			filterBy: "category:=books && in_stock:=true",
		});
		expect(capturedParams.filter_by).toBe(
			"tenant_id:=org1 && (category:=books && in_stock:=true)",
		);
	});

	it("clamps perPage to maxPerPage", async () => {
		await searchDocuments({
			alias: "ss_org1_products",
			tenantId: "org1",
			q: "*",
			queryBy: "title",
			perPage: 1000,
		});
		expect(capturedParams.per_page).toBe(100);
	});

	it("clamps perPage to minimum of 1", async () => {
		await searchDocuments({
			alias: "ss_org1_products",
			tenantId: "org1",
			q: "*",
			queryBy: "title",
			perPage: 0,
		});
		expect(capturedParams.per_page).toBe(1);
	});

	it("uses default perPage when omitted", async () => {
		await searchDocuments({
			alias: "ss_org1_products",
			tenantId: "org1",
			q: "*",
			queryBy: "title",
		});
		expect(capturedParams.per_page).toBe(20);
	});

	it("never lets a malicious userFilter override tenant_id", async () => {
		// Even if user tries to use OR or comments, tenant filter is enforced
		// because we always wrap user filter in (...) and prepend tenant_id with &&.
		await searchDocuments({
			alias: "ss_org1_products",
			tenantId: "org1",
			q: "*",
			queryBy: "title",
			filterBy: "tenant_id:=hacker_org",
		});
		expect(capturedParams.filter_by).toBe("tenant_id:=org1 && (tenant_id:=hacker_org)");
	});
});
