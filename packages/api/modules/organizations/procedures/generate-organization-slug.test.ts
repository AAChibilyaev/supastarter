import { ORPCError } from "@orpc/client";
import { call } from "@orpc/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth", () => ({
	auth: {
		api: { getSession: vi.fn() },
	},
}));

vi.mock("@repo/database", () => ({
	getOrganizationBySlug: vi.fn(),
}));

vi.mock("nanoid", () => ({
	nanoid: vi.fn(() => "abc12"),
}));

import { getOrganizationBySlug } from "@repo/database";

import { generateOrganizationSlug } from "./generate-organization-slug";

const ctx = { context: { headers: new Headers() } };

describe("generateOrganizationSlug", () => {
	it("is defined", () => {
		expect(generateOrganizationSlug).toBeDefined();
	});

	it("returns a slugified version of the name when slug is available", async () => {
		vi.mocked(getOrganizationBySlug).mockResolvedValueOnce(null);

		const result = await call(generateOrganizationSlug, { name: "My Test Organization" }, ctx);

		expect(result.slug).toBe("my-test-organization");
	});

	it("appends a nanoid suffix when the base slug is taken", async () => {
		const existingOrg = { id: "org-1", name: "Existing Org" };
		vi.mocked(getOrganizationBySlug)
			.mockResolvedValueOnce(existingOrg as never)
			.mockResolvedValueOnce(null);

		const result = await call(generateOrganizationSlug, { name: "Existing Org" }, ctx);

		expect(result.slug).toBe("existing-org-abc12");
	});

	it("throws INTERNAL_SERVER_ERROR when no available slug is found after 3 attempts", async () => {
		const existingOrg = { id: "org-1", name: "Taken Org" };
		vi.mocked(getOrganizationBySlug).mockResolvedValue(existingOrg as never);

		await expect(call(generateOrganizationSlug, { name: "Taken Org" }, ctx)).rejects.toThrow(
			ORPCError,
		);
		await expect(
			call(generateOrganizationSlug, { name: "Taken Org" }, ctx),
		).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
	});
});
