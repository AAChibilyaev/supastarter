import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getSearchIndexById: vi.fn(),
	takePendingIngestRows: vi.fn(),
	markIngestRowsSuccess: vi.fn(),
	markIngestRowsFailure: vi.fn(),
	recordSearchUsage: vi.fn(),
	bulkUpsert: vi.fn(),
	deleteByQuery: vi.fn(),
}));

vi.mock("@repo/database", () => ({
	getSearchIndexById: mocks.getSearchIndexById,
	takePendingIngestRows: mocks.takePendingIngestRows,
	markIngestRowsSuccess: mocks.markIngestRowsSuccess,
	markIngestRowsFailure: mocks.markIngestRowsFailure,
	recordSearchUsage: mocks.recordSearchUsage,
}));

vi.mock("@repo/logs", () => ({
	logger: { warn: vi.fn(), error: vi.fn() },
}));

vi.mock("./ingest", () => ({
	bulkUpsert: mocks.bulkUpsert,
	deleteByQuery: mocks.deleteByQuery,
}));

import { flushSearchIngestBuffer } from "./buffer";

beforeEach(() => {
	for (const m of Object.values(mocks)) {
		m.mockReset();
	}
	mocks.getSearchIndexById.mockResolvedValue({
		id: "idx_1",
		organizationId: "org_1",
		slug: "products",
		version: 1,
	});
	mocks.markIngestRowsSuccess.mockResolvedValue(undefined);
	mocks.markIngestRowsFailure.mockResolvedValue(undefined);
	mocks.recordSearchUsage.mockResolvedValue(undefined);
});

describe("flushSearchIngestBuffer", () => {
	it("marks all rows success when bulkUpsert reports no failures", async () => {
		mocks.takePendingIngestRows.mockResolvedValue([
			{ id: "r1", action: "upsert", document: { id: "a" } },
			{ id: "r2", action: "upsert", document: { id: "b" } },
		]);
		mocks.bulkUpsert.mockResolvedValue({ total: 2, successCount: 2, failures: [] });

		const result = await flushSearchIngestBuffer("idx_1");

		expect(result).toEqual({ flushed: 2, failed: 0 });
		expect(mocks.markIngestRowsSuccess).toHaveBeenCalledWith(["r1", "r2"]);
		expect(mocks.markIngestRowsFailure).toHaveBeenCalledWith([]);
	});

	it("splits success/failure on partial bulkUpsert failure", async () => {
		mocks.takePendingIngestRows.mockResolvedValue([
			{ id: "r1", action: "upsert", document: { id: "a" } },
			{ id: "r2", action: "upsert", document: { id: "bad" } },
			{ id: "r3", action: "upsert", document: { id: "c" } },
		]);
		mocks.bulkUpsert.mockResolvedValue({
			total: 3,
			successCount: 2,
			failures: [{ index: 1, error: "schema mismatch" }],
		});

		const result = await flushSearchIngestBuffer("idx_1");

		expect(result).toEqual({ flushed: 2, failed: 1 });
		expect(mocks.markIngestRowsSuccess).toHaveBeenCalledWith(["r1", "r3"]);
		expect(mocks.markIngestRowsFailure).toHaveBeenCalledWith([
			{ id: "r2", error: "schema mismatch" },
		]);
	});

	it("marks every row failure when bulkUpsert throws (Typesense outage)", async () => {
		mocks.takePendingIngestRows.mockResolvedValue([
			{ id: "r1", action: "upsert", document: { id: "a" } },
			{ id: "r2", action: "upsert", document: { id: "b" } },
		]);
		mocks.bulkUpsert.mockRejectedValue(new Error("ECONNREFUSED localhost:8108"));

		const result = await flushSearchIngestBuffer("idx_1");

		expect(result).toEqual({ flushed: 0, failed: 2 });
		expect(mocks.markIngestRowsSuccess).toHaveBeenCalledWith([]);
		expect(mocks.markIngestRowsFailure).toHaveBeenCalledWith([
			{ id: "r1", error: "ECONNREFUSED localhost:8108" },
			{ id: "r2", error: "ECONNREFUSED localhost:8108" },
		]);
		expect(mocks.recordSearchUsage).not.toHaveBeenCalled();
	});
});
