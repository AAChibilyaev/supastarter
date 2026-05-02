/**
 * Low-level HTTP transport for the AACSearch SDK.
 */
import { SdkError, type SdkErrorCode } from "./types";

export function buildHeaders(apiKey: string): Record<string, string> {
	return {
		"Content-Type": "application/json",
		Authorization: `Bearer ${apiKey}`,
	};
}

export async function request<T>(
	baseUrl: string,
	apiKey: string,
	method: string,
	path: string,
	body?: unknown,
	fetchImpl?: typeof fetch,
): Promise<T> {
	const url = `${baseUrl.replace(/\/+$/, "")}${path}`;
	const doFetch: typeof fetch = fetchImpl ?? fetch;

	let response: Response;
	try {
		response = await doFetch(url, {
			method,
			headers: buildHeaders(apiKey),
			body: body !== undefined ? JSON.stringify(body) : undefined,
		});
	} catch (cause) {
		throw new SdkError(
			"network_error",
			0,
			cause instanceof Error ? cause.message : "Network request failed",
		);
	}

	const text = await response.text();
	let payload: unknown = undefined;
	if (text) {
		try {
			payload = JSON.parse(text);
		} catch {
			// non-JSON response — fall through
		}
	}

	if (!response.ok) {
		const code: SdkErrorCode = (payload as { error?: SdkErrorCode })?.error ?? "unexpected";
		const details = (payload as { details?: unknown })?.details;
		throw new SdkError(
			code,
			response.status,
			`${response.status} ${code}${details ? ` — ${JSON.stringify(details)}` : ""}`,
			details,
		);
	}

	return payload as T;
}
