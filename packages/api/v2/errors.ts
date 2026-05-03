/**
 * V2 extended error format.
 *
 * Every v2 error response includes:
 *   - requestId   — unique identifier for request tracing
 *   - error       — machine-readable error code
 *   - message     — human-readable description
 *   - details     — optional array of structured issue objects
 *   - documentationUrl — link to API docs for the error type
 */

import type { StatusCode } from "hono/utils/http-status";

// ── Error catalog ─────────────────────────────────────────────────

const ERROR_DOCS_BASE = "https://docs.aacsearch.com/api/v2/errors";

const ERROR_DOCS: Record<string, string> = {
	unauthorized: `${ERROR_DOCS_BASE}#unauthorized`,
	forbidden: `${ERROR_DOCS_BASE}#forbidden`,
	not_found: `${ERROR_DOCS_BASE}#not-found`,
	invalid_input: `${ERROR_DOCS_BASE}#invalid-input`,
	invalid_json: `${ERROR_DOCS_BASE}#invalid-json`,
	conflict: `${ERROR_DOCS_BASE}#conflict`,
	rate_limited: `${ERROR_DOCS_BASE}#rate-limited`,
	quota_exceeded: `${ERROR_DOCS_BASE}#quota-exceeded`,
	internal_error: `${ERROR_DOCS_BASE}#internal-error`,
	method_not_allowed: `${ERROR_DOCS_BASE}#method-not-allowed`,
	gone: `${ERROR_DOCS_BASE}#gone`,
};

// ── Error detail type ─────────────────────────────────────────────

export interface ErrorDetail {
	code: string;
	message: string;
	path?: string[];
}

// ── Error response body ───────────────────────────────────────────

export interface V2ErrorBody {
	requestId: string;
	error: string;
	message: string;
	statusCode: number;
	details?: ErrorDetail[];
	documentationUrl?: string;
}

// ── Helpers ───────────────────────────────────────────────────────

let requestIdCounter = 0;

/**
 * Generate a short, unique request ID for tracing across logs and responses.
 * Format: `v2-{timestamp}-{counter}`.
 */
export function generateRequestId(): string {
	requestIdCounter += 1;
	return `v2-${Date.now().toString(36)}-${requestIdCounter}`;
}

/**
 * Build a standard v2 error response body.
 *
 * Callers should prefer `errorResponse()` (which wraps c.json) unless
 * they need the raw body object.
 */
export function buildErrorBody(
	requestId: string,
	error: string,
	message: string,
	statusCode: number,
	details?: ErrorDetail[],
): V2ErrorBody {
	const body: V2ErrorBody = {
		requestId,
		error,
		message,
		statusCode,
		documentationUrl: ERROR_DOCS[error],
	};
	if (details && details.length > 0) {
		body.details = details;
	}
	return body;
}

/**
 * Create a JSON Response with the v2 extended error format.
 *
 * Usage:
 *   return errorResponse(c, 401, "unauthorized", "Missing Bearer token");
 */
export function errorResponse(
	c: { json: (body: V2ErrorBody, status: StatusCode) => Response },
	statusCode: StatusCode,
	error: string,
	message: string,
	details?: ErrorDetail[],
): Response {
	const requestId = generateRequestId();
	return c.json(buildErrorBody(requestId, error, message, statusCode, details), statusCode);
}
