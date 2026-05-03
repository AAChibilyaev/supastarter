"use client";

import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";

export function useOverageStatus(organizationId: string) {
	return useQuery({
		...orpc.search.getOverageStatus.queryOptions({
			input: { organizationId },
		}),
		enabled: Boolean(organizationId),
	});
}
