/**
 * Tochka HTTP client.
 *
 * MVP placeholder: uses `process.env.TOCHKA_*` for credentials, posts JSON,
 * handles HMAC signing once exact spec is confirmed.
 *
 * TODO before production:
 *   - Add JWT/HMAC signing per official spec
 *   - Add retry policy on 5xx (3 retries with exponential backoff)
 *   - Add response validation against zod schemas (TochkaCreatePaymentResponse, etc.)
 *   - Add request id + log correlation
 */

const baseUrl = process.env.TOCHKA_API_BASE_URL ?? "https://enter.tochka.com/sandbox";

interface TochkaRequestOptions {
	method: "GET" | "POST" | "PUT" | "DELETE";
	path: string;
	body?: unknown;
	idempotencyKey?: string;
}

export async function tochkaRequest<T>(opts: TochkaRequestOptions): Promise<T> {
	const apiToken = process.env.TOCHKA_API_TOKEN;
	if (!apiToken) {
		throw new Error("TOCHKA_API_TOKEN is not configured");
	}

	const url = `${baseUrl}${opts.path}`;

	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		Authorization: `Bearer ${apiToken}`,
	};
	if (opts.idempotencyKey) {
		headers["Idempotency-Key"] = opts.idempotencyKey;
	}

	const response = await fetch(url, {
		method: opts.method,
		headers,
		body: opts.body ? JSON.stringify(opts.body) : undefined,
	});

	const text = await response.text();
	if (!response.ok) {
		throw new Error(`Tochka API ${opts.method} ${opts.path} failed: ${response.status} ${text}`);
	}

	try {
		return JSON.parse(text) as T;
	} catch {
		throw new Error(`Tochka API ${opts.path} returned non-JSON: ${text.slice(0, 200)}`);
	}
}
