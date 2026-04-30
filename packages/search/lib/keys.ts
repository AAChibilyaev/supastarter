import "server-only";
import { createHash, randomBytes } from "node:crypto";

const SEARCH_KEY_PREFIX = "ss_search_";
const PREFIX_DISPLAY_LENGTH = 12;

export const SEARCH_API_KEY_SCOPES = ["search", "ingest", "admin"] as const;
export type SearchApiKeyScope = (typeof SEARCH_API_KEY_SCOPES)[number];

export interface GeneratedSearchKey {
	rawKey: string;
	prefix: string;
	hash: string;
}

export function generateSearchApiKey(): GeneratedSearchKey {
	const body = randomBytes(32).toString("base64url");
	const rawKey = `${SEARCH_KEY_PREFIX}${body}`;
	return {
		rawKey,
		prefix: rawKey.slice(0, PREFIX_DISPLAY_LENGTH),
		hash: hashSearchApiKey(rawKey),
	};
}

export function hashSearchApiKey(rawKey: string): string {
	return createHash("sha256").update(rawKey).digest("hex");
}

export function isValidSearchApiKeyShape(rawKey: string): boolean {
	return rawKey.startsWith(SEARCH_KEY_PREFIX) && rawKey.length > SEARCH_KEY_PREFIX.length + 16;
}
