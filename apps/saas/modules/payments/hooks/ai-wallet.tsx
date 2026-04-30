"use client";

import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useAiWallet(organizationId?: string) {
	return useQuery(
		orpc.billingWallet.getWallet.queryOptions({
			input: { organizationId },
		}),
	);
}

export function useAiWalletTransactions(organizationId?: string, limit = 50) {
	return useQuery(
		orpc.billingWallet.listTransactions.queryOptions({
			input: { organizationId, limit },
		}),
	);
}

export function useAiUsageEvents(filter: {
	organizationId?: string;
	projectId?: string;
	operation?: string;
	provider?: string;
	model?: string;
	from?: Date;
	to?: Date;
	limit?: number;
}) {
	return useQuery(
		orpc.billingWallet.listUsageEvents.queryOptions({
			input: { ...filter, limit: filter.limit ?? 50 },
		}),
	);
}

export function useCreateTopup() {
	const qc = useQueryClient();
	return useMutation(
		orpc.billingWallet.createTopup.mutationOptions({
			onSuccess: () => {
				qc.invalidateQueries({ queryKey: ["billingWallet"] });
			},
		}),
	);
}
