"use client";

import { useSession } from "@auth/hooks/use-session";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

/**
 * useFeatureFlag — React hook for client-side feature flag evaluation.
 *
 * Evaluates the flag via the server-side `checkFeatureFlag` oRPC procedure
 * on mount, then opens an SSE connection for real-time updates when the
 * flag is toggled or an override is changed by an admin.
 *
 * Usage:
 *   const isEnabled = useFeatureFlag("new-dashboard");
 *   if (isEnabled) { ... }
 *
 * @param flagKey - The feature flag key (e.g. "new-dashboard", "ai-answer")
 * @returns boolean — true if the flag is enabled for the current organization
 */
export function useFeatureFlag(flagKey: string | null | undefined): boolean {
	const { session } = useSession();
	const orgId = session?.activeOrganizationId;
	const queryClient = useQueryClient();

	// React Query cache key
	const queryKey = ["featureFlag", orgId, flagKey] as const;

	// Initial fetch via oRPC (server-side evaluation with all targeting rules)
	const { data: result } = useQuery({
		...orpc.featureFlags.check.queryOptions({
			input: { flagKey: flagKey ?? "" },
		}),
		queryKey,
		enabled: !!orgId && !!flagKey,
		staleTime: 60_000, // 60s — matches server-side cache TTL
	});

	// SSE connection for real-time push updates
	const eventSourceRef = useRef<EventSource | null>(null);

	useEffect(() => {
		if (!orgId || !flagKey) return;

		// Close any existing connection before opening a new one
		if (eventSourceRef.current) {
			eventSourceRef.current.close();
		}

		const url = `/api/feature-flags/subscribe?orgId=${encodeURIComponent(orgId)}`;
		const eventSource = new EventSource(url);
		eventSourceRef.current = eventSource;

		// Listen for flag change events
		eventSource.addEventListener("flag_change", (event: MessageEvent) => {
			try {
				const data = JSON.parse(event.data) as {
					type: string;
					flagKey: string;
					organizationId?: string;
					enabled?: boolean;
				};

				// Only process events for the flag we're watching
				if (data.flagKey !== flagKey) return;

				// For per-org override updates: only care about our org
				if (
					data.type === "override_updated" &&
					data.organizationId &&
					data.organizationId !== orgId
				) {
					return;
				}

				if (data.type === "flag_deleted") {
					// Flag was deleted — set to false
					queryClient.setQueryData(queryKey, { enabled: false });
					return;
				}

				// flag_updated or override_updated for our org
				if (data.enabled !== undefined) {
					queryClient.setQueryData(queryKey, { enabled: data.enabled });
				}
			} catch {
				// Ignore malformed SSE payloads
			}
		});

		// The browser auto-reconnects on connection loss

		return () => {
			eventSource.close();
			eventSourceRef.current = null;
		};
	}, [orgId, flagKey, queryClient, queryKey]);

	return result?.enabled ?? false;
}
