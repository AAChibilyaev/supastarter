import { describe, expect, it, vi } from "vitest";

vi.mock("@repo/database", () => ({
	getOrganizationMembership: vi.fn(),
}));

import { getOrganizationMembership } from "@repo/database";

import { verifyOrganizationMembership } from "./membership";

describe("verifyOrganizationMembership", () => {
	it("returns null when membership does not exist", async () => {
		vi.mocked(getOrganizationMembership).mockResolvedValueOnce(null);

		const result = await verifyOrganizationMembership("org-1", "user-1");

		expect(result).toBeNull();
		expect(getOrganizationMembership).toHaveBeenCalledWith("org-1", "user-1");
	});

	it("returns organization and role when membership exists", async () => {
		const mockMembership = {
			organization: { id: "org-1", name: "Test Org", slug: "test-org" },
			role: "owner",
		};
		vi.mocked(getOrganizationMembership).mockResolvedValueOnce(mockMembership as never);

		const result = await verifyOrganizationMembership("org-1", "user-1");

		expect(result).toEqual({
			organization: mockMembership.organization,
			role: mockMembership.role,
		});
	});

	it("returns only organization and role, not the full membership object", async () => {
		const mockMembership = {
			organization: {
				id: "org-2",
				name: "Another Org",
				slug: "another-org",
			},
			role: "member",
			extraField: "should-not-be-returned",
		};
		vi.mocked(getOrganizationMembership).mockResolvedValueOnce(mockMembership as never);

		const result = await verifyOrganizationMembership("org-2", "user-2");

		expect(result).toEqual({
			organization: mockMembership.organization,
			role: mockMembership.role,
		});
		expect(result).not.toHaveProperty("extraField");
	});
});
