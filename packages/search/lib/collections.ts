import "server-only";
import { logger } from "@repo/logs";
import type { CollectionCreateSchema } from "typesense/lib/Typesense/Collections";

import { config } from "../config";
import { getTypesenseClient } from "./client";
import { typesenseFetch } from "./synonyms-sync";

function sanitize(value: string): string {
	return value.replace(/[^a-zA-Z0-9]/g, "_");
}

export function physicalCollectionName(
	organizationId: string,
	slug: string,
	version: number,
): string {
	return `${config.collectionPrefix}_${sanitize(organizationId)}_${sanitize(slug)}_v${version}`;
}

export function aliasName(organizationId: string, slug: string): string {
	return `${config.collectionPrefix}_${sanitize(organizationId)}_${sanitize(slug)}`;
}

export interface HnswParams {
	ef_construction?: number;
	M?: number;
}

export interface CollectionFieldInput {
	name: string;
	type: string;
	facet?: boolean;
	optional?: boolean;
	index?: boolean;
	sort?: boolean;
	num_dim?: number;
	hnsw_params?: HnswParams;
	/** When true, the field value is truncated to fit within the token limit */
	truncate?: boolean;
}

export interface CreatePhysicalCollectionInput {
	organizationId: string;
	slug: string;
	version: number;
	fields: CollectionFieldInput[];
	defaultSortingField?: string;
	/** Custom token separators (e.g. "+-@#"). Allows searching "C++", "C#", "hello@world" */
	tokenSeparators?: string[];
	/** Symbols to index as part of tokens (e.g. "+#@."). Overrides tokenSeparators for specific chars */
	symbolTokensToIndex?: string[];
}

export async function createPhysicalCollection(input: CreatePhysicalCollectionInput) {
	const client = getTypesenseClient();
	const name = physicalCollectionName(input.organizationId, input.slug, input.version);

	const tenantField: CollectionFieldInput = {
		name: config.tenantField,
		type: "string",
		facet: true,
		index: true,
	};

	const userFields = input.fields.filter((field) => field.name !== config.tenantField);

	const schema = {
		name,
		fields: [tenantField, ...userFields],
		default_sorting_field: input.defaultSortingField,
		enable_nested_fields: true,
		...(input.tokenSeparators !== undefined && {
			token_separators: input.tokenSeparators,
		}),
		...(input.symbolTokensToIndex !== undefined && {
			symbol_tokens_to_index: input.symbolTokensToIndex,
		}),
	} as unknown as CollectionCreateSchema;

	return client.collections().create(schema);
}

export async function ensureAlias(organizationId: string, slug: string, version: number) {
	const client = getTypesenseClient();
	const alias = aliasName(organizationId, slug);
	const target = physicalCollectionName(organizationId, slug, version);

	await client.aliases().upsert(alias, { collection_name: target });
	return { alias, target };
}

export async function swapAliasToVersion(organizationId: string, slug: string, newVersion: number) {
	const client = getTypesenseClient();
	const alias = aliasName(organizationId, slug);
	const target = physicalCollectionName(organizationId, slug, newVersion);

	const result = await client.aliases().upsert(alias, { collection_name: target });
	return result;
}

export async function deleteSearchIndexCollections(organizationId: string, slug: string) {
	const client = getTypesenseClient();
	const alias = aliasName(organizationId, slug);

	try {
		await client.aliases(alias).delete();
	} catch (error) {
		logger.warn("Could not delete alias", { alias, error });
	}

	const collections = await client.collections().retrieve();
	const prefix = `${alias}_v`;

	for (const name of collections.map((collection) => collection.name)) {
		if (name.startsWith(prefix)) {
			await dropCollection(name);
		}
	}
}

export async function dropCollection(name: string) {
	const client = getTypesenseClient();
	try {
		await client.collections(name).delete();
	} catch (error) {
		logger.warn("Could not drop collection", { name, error });
	}
}

export async function cloneCollection(
	name: string,
	newName: string,
	copyDocuments: boolean,
): Promise<{ name: string }> {
	const client = getTypesenseClient();

	const existing = await client.collections(name).exists();
	if (!existing) {
		throw new Error(`Source collection "${name}" does not exist`);
	}

	const result = await typesenseFetch<{ name: string }>(
		"POST",
		`/collections/${encodeURIComponent(name)}/clone`,
		{
			copy_documents: copyDocuments,
		},
	);

	return result;
}

export async function dropOldVersions(organizationId: string, slug: string, keepVersion: number) {
	const client = getTypesenseClient();
	const collections = await client.collections().retrieve();
	const aliasPrefix = `${config.collectionPrefix}_${sanitize(organizationId)}_${sanitize(slug)}_v`;
	const keepName = physicalCollectionName(organizationId, slug, keepVersion);

	const toDrop = collections
		.map((collection) => collection.name)
		.filter((name) => name.startsWith(aliasPrefix) && name !== keepName);

	for (const name of toDrop) {
		await dropCollection(name);
	}
}
