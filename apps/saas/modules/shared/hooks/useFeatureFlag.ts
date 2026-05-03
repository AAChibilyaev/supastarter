"use client";

import { useSession } from "@auth/hooks/use-session";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

/**
 * useFeatureFlag — React hook for client-side feature flag evaluation.
 *
 * 1. On mount, fetches the flag state via the `checkFeatureFlag` oRPC procedure.
 * 2. Opens an SSE connection to receive real-time flag change events.
 * 3. Updates cached state when a flag change event is received via SSE.
 *
 * Usage:
 *   const isEnabled = useFeatureFlag("new-dashboard");
 *   if (isEnabled) { ... }
 *
 * @param flagKey - The feature flag key (e.g. "new-dashboard", "ai-answer")
 * @returns boolean — true if the flag is enabled for the current organization
 */
export function useFeatureFlag(flagKey: string | null | undefined): boolean {
	const { data: session } = useSession();
	const orgId = session?.session?.activeOrganizationId;
	const queryClient = useQueryClient();

	// Cache key for React Query — so different consumers share the same data
	const queryKey = ["featureFlag", orgId, flagKey] as const;

	// Initial fetch via oRPC (server-side evaluation)
	const { data: result } = useQuery({
		queryKey,
		queryFn: async () => {
			if (!orgId || !flagKey) return { enabled: false };
			return orpc.featureFlags.check({ flagKey });
		},
		enabled: !!orgId && !!flagKey,
		staleTime: 60_000, // 60s — matches server-side cache TTL
	});

	// SSE connection for real-time updates
	const eventSourceRef = useRef<EventSource | null>(null);

	useEffect(() => {
		if (!orgId || !flagKey) return;

		// Clean up any existing connection
		if (eventSourceRef.current) {
			eventSourceRef.current.close();
		}

		const url = `/api/feature-flags/subscribe?orgId=${encodeURIComponent(orgId)}`;
		const eventSource = new EventSource(url);
		eventSourceRef.current = eventSource;

		eventSource.addEventListener("flag_change", (event) => {
			try {
				const data = JSON.parse(event.data) as {
					type: string;
					flagKey: string;
					organizationId?: string;
					enabled?: boolean;
				};

				// Only update if this event matches our flag
				if (data.flagKey !== flagKey) return;

				// For override_updated with a specific org, only update if it's our org
				if (
					data.type === "override_updated" &&
					data.organizationId &&
					data.organizationId !== orgId
				) {
					return;
				}

				// For flag_deleted, set to false
				if (data.type === "flag_deleted") {
					queryClient.setQueryData(queryKey, { enabled: false });
					return;
				}

				// For flag_updated and override_updated, update with the new state
				if (data.enabled !== undefined) {
					queryClient.setQueryData(queryKey, { enabled: data.enabled });
				}
			} catch {
				// Ignore malformed SSE events
			}
		});

		eventSource.addEventListener("connected", () => {
			// SSE connection established — noop, we already have the initial fetch
		});

		eventSource.onerror = () => {
			// Connection lost — React Query will serve stale data from cache.
			// The browser will auto-reconnect after a brief delay.
		};

		return () => {
			eventSource.close();
			eventSourceRef.current = null;
		};
	}, [orgId, flagKey, queryClient, queryKey]);

	return result?.enabled ?? false;
}
