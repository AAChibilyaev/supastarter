import "server-only";
import { getSearchApiKeyByHash, touchSearchApiKey } from "@repo/database";

import { hashSearchApiKey, isValidSearchApiKeyShape, type SearchApiKeyScope } from "./keys";

export interface VerifiedSearchKey {
	keyId: string;
	indexId: string;
	organizationId: string;
	indexSlug: string;
	scopes: SearchApiKeyScope[];
	allowedOrigins: string[];
	rateLimitPerMinute: number;
}

export async function verifySearchApiKey(
	rawKey: string,
	requiredScope: SearchApiKeyScope,
): Promise<VerifiedSearchKey | null> {
	if (!isValidSearchApiKeyShape(rawKey)) {
		return null;
	}

	const hash = hashSearchApiKey(rawKey);
	const record = await getSearchApiKeyByHash(hash);

	if (!record || record.revokedAt) {
		return null;
	}
	if (record.expiresAt && record.expiresAt.getTime() < Date.now()) {
		return null;
	}

	const scopes = record.scopes as SearchApiKeyScope[];
	if (!scopes.includes(requiredScope) && !scopes.includes("admin")) {
		return null;
	}

	void touchSearchApiKey(record.id).catch(() => undefined);

	return {
		keyId: record.id,
		indexId: record.indexId,
		organizationId: record.organizationId,
		indexSlug: record.index.slug,
		scopes,
		allowedOrigins: record.allowedOrigins ?? [],
		rateLimitPerMinute: record.rateLimitPerMinute ?? 600,
	};
}
