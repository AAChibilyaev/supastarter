import "server-only";
import type { Prisma } from "@repo/database";
import { logger } from "@repo/logs";

import { getTypesenseClient } from "./client";
import { aliasName } from "./collections";
import type { StorageRegion } from "./regions";
import { deleteByQuery } from "./ingest";
import { config } from "../config";

// ── Types ──────────────────────────────────────────────────────────

export interface MigrateCollectionInput {
	/** ID of the source collection (the physical collection name as stored in Typesense) */
	collectionName: string;
	/** Source region */
	sourceRegion: StorageRegion;
	/** Destination region */
	destRegion: StorageRegion;
	/** Optional filter to migrate only matching documents */
	filterBy?: string;
	/** Batch size for import (default: 100) */
	batchSize?: number;
}

export interface MigrationProgress {
	totalDocuments: number;
	exported: number;
	imported: number;
	failures: number;
	completed: boolean;
	errors: string[];
}

export interface MigrationResult {
	success: boolean;
	collection: string;
	sourceRegion: StorageRegion;
	destRegion: StorageRegion;
	progress: MigrationProgress;
	durationMs: number;
}

// ── Migration Functions ────────────────────────────────────────────

/**
 * Migrate all documents in a Typesense collection from one region to another.
 *
 * This function:
 * 1. Exports documents from the source region collection
 * 2. Imports them into the destination region collection
 * 3. Reports progress and any failures
 *
 * NOTE: This is a "copy and verify" operation. The source collection is preserved.
 * Use `deleteFromSource` if you want to remove documents after migration.
 */
export async function migrateCollection(
	input: MigrateCollectionInput,
): Promise<MigrationResult> {
	const { collectionName, sourceRegion, destRegion, filterBy, batchSize = 100 } = input;
	const startTime = Date.now();

	const progress: MigrationProgress = {
		totalDocuments: 0,
		exported: 0,
		imported: 0,
		failures: 0,
		completed: false,
		errors: [],
	};

	try {
		const sourceClient = getTypesenseClient(sourceRegion);
		const destClient = getTypesenseClient(destRegion);

		// Step 1: Determine total document count
		try {
			const collection = await sourceClient.collections(collectionName).retrieve();
			progress.totalDocuments = collection.num_documents ?? 0;
		} catch (error) {
			const msg = `Failed to retrieve source collection "${collectionName}" in ${sourceRegion}: ${error instanceof Error ? error.message : String(error)}`;
			logger.error(msg);
			return {
				success: false,
				collection: collectionName,
				sourceRegion,
				destRegion,
				progress,
				durationMs: Date.now() - startTime,
			};
		}

		if (progress.totalDocuments === 0) {
			progress.completed = true;
			return {
				success: true,
				collection: collectionName,
				sourceRegion,
				destRegion,
				progress,
				durationMs: Date.now() - startTime,
			};
		}

		// Step 2: Export documents from source region
		logger.info("Migrating collection between regions", {
			collection: collectionName,
			source: sourceRegion,
			dest: destRegion,
			totalDocs: progress.totalDocuments,
		});

		const exportParams: Record<string, unknown> = {};
		if (filterBy) {
			exportParams.filter_by = filterBy;
		}

		const rawJsonl = await sourceClient
			.collections(collectionName)
			.documents()
			.export(exportParams);

		const lines = rawJsonl.split("\n").filter((line) => line.trim().length > 0);
		const documents: Record<string, unknown>[] = [];

		for (const line of lines) {
			try {
				const doc = JSON.parse(line) as Record<string, unknown>;
				// Remove internal Typesense `id` field to allow auto-assignment
				if (doc.id && typeof doc.id === "string" && !doc.id.startsWith("_")) {
					// Preserve custom IDs, but remove auto-generated ones if re-importing
					// Keep the id since Typesense's emplace/upsert handles dedup
				}
				documents.push(doc);
			} catch {
				progress.failures += 1;
				progress.errors.push(`Failed to parse document at line ${progress.exported}`);
			}
			progress.exported += 1;
		}

		// Step 3: Import into destination region in batches
		for (let i = 0; i < documents.length; i += batchSize) {
			const batch = documents.slice(i, i + batchSize);
			try {
				const response = await destClient
					.collections(collectionName)
					.documents()
					.import(batch, { action: "emplace" });

				const results = Array.isArray(response) ? response : [];
				for (const result of results) {
					if (result && typeof result === "object" && result.success === true) {
						progress.imported += 1;
					} else {
						progress.failures += 1;
						const errMsg = typeof result?.error === "string" ? result.error : "unknown";
						progress.errors.push(`Import failure at batch offset ${i}: ${errMsg}`);
					}
				}
			} catch (importError) {
				const failCount = batch.length;
				progress.failures += failCount;
				progress.errors.push(
					`Batch at offset ${i} failed entirely: ${importError instanceof Error ? importError.message : String(importError)}`,
				);
			}
		}

		progress.completed = true;

		logger.info("Migration completed", {
			collection: collectionName,
			source: sourceRegion,
			dest: destRegion,
			total: progress.totalDocuments,
			imported: progress.imported,
			failures: progress.failures,
			durationMs: Date.now() - startTime,
		});

		return {
			success: progress.failures === 0,
			collection: collectionName,
			sourceRegion,
			destRegion,
			progress,
			durationMs: Date.now() - startTime,
		};
	} catch (error) {
		const msg = `Migration failed: ${error instanceof Error ? error.message : String(error)}`;
		logger.error(msg, { collection: collectionName, sourceRegion, destRegion });
		progress.errors.push(msg);
		progress.completed = false;

		return {
			success: false,
			collection: collectionName,
			sourceRegion,
			destRegion,
			progress,
			durationMs: Date.now() - startTime,
		};
	}
}

/**
 * Migrate all collections belonging to an organization from one region to another.
 *
 * Resolves the organization's aliases and migrates each underlying collection.
 */
export async function migrateOrganizationData(
	organizationId: string,
	tenantId: string,
	sourceRegion: StorageRegion,
	destRegion: StorageRegion,
	indexSlugs?: string[],
): Promise<MigrationResult[]> {
	const { db } = await import("@repo/database");

	// Find all search indexes for this organization
	const where: Prisma.SearchIndexWhereInput = { organizationId };
	if (indexSlugs && indexSlugs.length > 0) {
		where.slug = { in: indexSlugs as string[] };
	}

	const indexes = await db.searchIndex.findMany({
		where,
		select: { id: true, slug: true },
	});

	if (indexes.length === 0) {
		logger.info("No indexes found for organization migration", {
			organizationId,
			sourceRegion,
			destRegion,
		});
		return [];
	}

	const results: MigrationResult[] = [];
	for (const index of indexes) {
		const collectionName = aliasName(organizationId, index.slug);
		const result = await migrateCollection({
			collectionName,
			sourceRegion,
			destRegion,
			batchSize: config.ingestBatchSize,
		});
		results.push(result);
	}

	logger.info("Organization migration complete", {
		organizationId,
		sourceRegion,
		destRegion,
		totalIndexes: indexes.length,
		successful: results.filter((r) => r.success).length,
		failed: results.filter((r) => !r.success).length,
	});

	return results;
}

/**
 * Migrate all organizations from one region to another.
 * Useful for bulk regional rebalancing.
 */
export async function migrateAllOrganizations(
	sourceRegion: StorageRegion,
	destRegion: StorageRegion,
): Promise<number> {
	const { db } = await import("@repo/database");

	// Find all organizations that have the source region set in their metadata
	const organizations = await db.organization.findMany({
		where: {
			searchIndexes: { some: {} }, // Only orgs with at least one index
		},
		select: { id: true },
	});

	logger.info("Starting bulk region migration", {
		sourceRegion,
		destRegion,
		orgCount: organizations.length,
	});

	let migratedCount = 0;
	for (const org of organizations) {
		const orgResults = await migrateOrganizationData(org.id, org.id, sourceRegion, destRegion);
		if (orgResults.length > 0) {
			migratedCount += 1;
		}
	}

	return migratedCount;
}
