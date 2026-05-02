/**
 * Helper functions for E2E tests.
 */

/**
 * Creates a test search index via the v1 REST API.
 * Returns the index name/slug.
 */
export async function createTestIndex(
	apiKey: string,
	baseURL: string,
	indexName: string = `e2e-test-${Date.now()}`,
): Promise<{ name: string; slug: string }> {
	const response = await fetch(`${baseURL}/api/v1/indexes`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			name: indexName,
			fields: [
				{ name: "title", type: "string" },
				{ name: "description", type: "string" },
				{ name: "price", type: "float" },
				{ name: "category", type: "string" },
			],
			defaultSortingField: "title",
		}),
	});

	if (!response.ok) {
		const body = await response.text();
		throw new Error(`Failed to create index: ${response.status} — ${body}`);
	}

	const data = (await response.json()) as { name: string; slug: string };
	return data;
}

/**
 * Seeds documents into an index via the v1 REST API.
 */
export async function seedDocuments(
	apiKey: string,
	baseURL: string,
	indexSlug: string,
	documents: Record<string, unknown>[],
): Promise<void> {
	const response = await fetch(`${baseURL}/api/v1/indexes/${indexSlug}/documents`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({ documents }),
	});

	if (!response.ok) {
		const body = await response.text();
		throw new Error(`Failed to seed documents: ${response.status} — ${body}`);
	}
}

/**
 * Performs a search query against the public search API.
 */
export async function searchPublic(
	slug: string,
	query: string,
	apiKey: string,
	baseURL: string,
	options?: Record<string, unknown>,
): Promise<{ hits: unknown[]; found: number }> {
	const response = await fetch(`${baseURL}/api/search/public/${slug}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			q: query,
			perPage: 10,
			...options,
		}),
	});

	const data = (await response.json()) as { hits?: unknown[]; found?: number };

	return {
		hits: data.hits || [],
		found: data.found || 0,
	};
}

/**
 * Creates an API key via the v1 REST API.
 */
export async function createApiKey(
	apiKey: string,
	baseURL: string,
	name: string = "e2e-test-key",
	scopes: string[] = ["search"],
	indexSlug?: string,
): Promise<{ key: string; id: string }> {
	const body: Record<string, unknown> = {
		name,
		scopes,
	};
	if (indexSlug) {
		body.indexes = [indexSlug];
	}

	const response = await fetch(`${baseURL}/api/v1/keys`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Failed to create API key: ${response.status} — ${text}`);
	}

	return (await response.json()) as { key: string; id: string };
}

/**
 * Revokes an API key via the v1 REST API.
 */
export async function revokeApiKey(
	adminKey: string,
	baseURL: string,
	keyId: string,
): Promise<boolean> {
	const response = await fetch(`${baseURL}/api/v1/keys/${keyId}`, {
		method: "DELETE",
		headers: {
			Authorization: `Bearer ${adminKey}`,
		},
	});
	return response.ok;
}

/**
 * Waits for a short period to allow async operations to settle.
 */
export function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Logs in users via the v1 API and returns auth cookie/session.
 */
export async function loginViaApi(
	baseURL: string,
	email: string,
	password: string,
): Promise<string | null> {
	const response = await fetch(`${baseURL}/api/auth/sign-in/email`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password }),
	});
	if (!response.ok) return null;
	// Return the session token from cookie
	const setCookie = response.headers.get("set-cookie");
	return setCookie;
}
