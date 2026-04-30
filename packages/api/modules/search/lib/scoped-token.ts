import { createHmac, timingSafeEqual } from "node:crypto";

const SCOPED_PREFIX = "ss_scoped_";

interface ScopedTokenPayload {
	keyId: string;
	parentRawKey: string;
	filterBy: string;
	exp: number;
}

function getSecret(): string {
	const secret = process.env.BETTER_AUTH_SECRET;
	if (!secret) {
		throw new Error("BETTER_AUTH_SECRET is not configured (required for scoped search tokens)");
	}
	return secret;
}

function signPayload(payload: string): string {
	return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function issueScopedSearchToken(input: {
	keyId: string;
	parentRawKey: string;
	filterBy: string;
	expiresInSeconds: number;
}): { token: string; expiresAt: Date } {
	const exp = Math.floor(Date.now() / 1000) + input.expiresInSeconds;
	const payload: ScopedTokenPayload = {
		keyId: input.keyId,
		parentRawKey: input.parentRawKey,
		filterBy: input.filterBy,
		exp,
	};
	const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
	const sig = signPayload(encoded);
	return {
		token: `${SCOPED_PREFIX}${encoded}.${sig}`,
		expiresAt: new Date(exp * 1000),
	};
}

export async function verifyScopedSearchToken(
	rawToken: string,
): Promise<{ parentRawKey: string; filterBy: string; keyId: string } | null> {
	if (!rawToken.startsWith(SCOPED_PREFIX)) return null;
	const body = rawToken.slice(SCOPED_PREFIX.length);
	const dot = body.indexOf(".");
	if (dot < 0) return null;
	const encoded = body.slice(0, dot);
	const sig = body.slice(dot + 1);

	const expected = signPayload(encoded);
	if (expected.length !== sig.length) return null;
	try {
		if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
	} catch {
		return null;
	}

	let parsed: ScopedTokenPayload;
	try {
		parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
	} catch {
		return null;
	}

	if (parsed.exp * 1000 < Date.now()) return null;
	if (typeof parsed.parentRawKey !== "string" || typeof parsed.filterBy !== "string") return null;

	return {
		parentRawKey: parsed.parentRawKey,
		filterBy: parsed.filterBy,
		keyId: parsed.keyId,
	};
}
