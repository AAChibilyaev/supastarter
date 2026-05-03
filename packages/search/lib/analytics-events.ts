import "server-only";
import { logger } from "@repo/logs";

import { getTypesenseEnv } from "./env";

/**
 * Typesense analytics events API helper.
 *
 * Sends events to Typesense's /analytics/events endpoint so that
 * configured analytics rules (counter, log) can process them.
 *
 * Counter rules: increment a numeric field (e.g. click_count) for
 * popularity-based ranking.
 *
 * Log rules: capture raw event data into a dedicated collection for
 * later ML training / personalization.
 *
 * Typesense docs: https://typesense.org/docs/28.0/api/analytics-events.html
 */

export interface AnalyticsEvent {
	/** Event type matching rule source.events[].type (e.g. "click", "conversion", "visit") */
	type: string;
	/** Event name matching rule source.events[].name (e.g. "products-click") */
	name: string;
	/** Arbitrary event context data */
	data: Record<string, unknown>;
	/** Optional query_id from a search response to associate event with a search query */
	query_id?: string;
}

/**
 * Map of widget event types → canonical Typesense analytics event types.
 *
 * Widget types: search_query, result_click, zero_results, widget_open, filter_used
 * Typesense canonical types: click, conversion, visit, search
 */
const WIDGET_TO_TYPESENSE_TYPE: Record<string, { type: string; name: string }> = {
	search_query: { type: "search", name: "search_query" },
	result_click: { type: "click", name: "result_click" },
	zero_results: { type: "search", name: "zero_results" },
	widget_open: { type: "visit", name: "widget_open" },
	filter_used: { type: "click", name: "filter_used" },
	conversion: { type: "conversion", name: "conversion_event" },
	visit: { type: "visit", name: "page_visit" },
};

/**
 * Returns whether a widget event type should be forwarded to Typesense analytics.
 * Currently forwards: search_query, result_click, zero_results, widget_open, filter_used.
 */
export function isForwardableEvent(widgetType: string): boolean {
	return widgetType in WIDGET_TO_TYPESENSE_TYPE;
}

/**
 * Convert a widget event type + metadata into a Typesense analytics event.
 */
export function widgetEventToAnalyticsEvent(
	widgetType: string,
	meta: Record<string, unknown>,
): AnalyticsEvent | null {
	const mapping = WIDGET_TO_TYPESENSE_TYPE[widgetType];
	if (!mapping) return null;

	const data: Record<string, unknown> = {};

	// Common fields
	if (meta.query) data.q = meta.query;
	if (meta.productId) data.doc_id = meta.productId;
	if (meta.position !== null && meta.position !== undefined) data.position = meta.position;
	if (meta.sessionId) data.session_id = meta.sessionId;
	if (meta.anonymousUserId) data.user_id = meta.anonymousUserId;
	if (meta.locale) data.locale = meta.locale;
	if (meta.filters) data.filters = meta.filters;
	if (meta.sort) data.sort = meta.sort;
	if (meta.referrer) data.referrer = meta.referrer;

	return {
		type: mapping.type,
		name: mapping.name,
		data,
		query_id: (meta.queryId as string) ?? undefined,
	};
}

/**
 * Send an analytics event to Typesense /analytics/events endpoint.
 *
 * Best-effort: logs errors, never throws, so it doesn't block the calling code.
 */
export async function sendAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
	try {
		const env = getTypesenseEnv();
		const url = `${env.protocol}://${env.host}:${env.port}/analytics/events`;

		const res = await fetch(url, {
			method: "POST",
			headers: {
				"X-TYPESENSE-API-KEY": env.adminApiKey,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(event),
		});

		if (!res.ok) {
			const text = await res.text();
			logger.warn("analytics-events: Typesense rejected event", {
				type: event.type,
				name: event.name,
				status: res.status,
				body: text.slice(0, 500),
			});
		}
	} catch (err) {
		logger.warn("analytics-events: failed to send event to Typesense", {
			type: event.type,
			name: event.name,
			err,
		});
	}
}

/**
 * Send multiple analytics events to Typesense in parallel.
 * All events are independent (no batch endpoint on Typesense).
 */
export async function sendAnalyticsEvents(events: AnalyticsEvent[]): Promise<void> {
	await Promise.allSettled(events.map(sendAnalyticsEvent));
}
