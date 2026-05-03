import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useSearchIndexesQuery(organizationId: string) {
	return useQuery(
		orpc.search.listIndexes.queryOptions({
			input: { organizationId },
			enabled: !!organizationId,
		}),
	);
}

export function useSearchApiKeysQuery(organizationId: string, slug: string) {
	return useQuery(
		orpc.search.listApiKeys.queryOptions({
			input: { organizationId, slug },
			enabled: !!organizationId && !!slug,
		}),
	);
}

export function useSearchUsageQuery(organizationId: string, windowDays = 30) {
	return useQuery(
		orpc.search.usage.queryOptions({
			input: { organizationId, windowDays },
			enabled: !!organizationId,
		}),
	);
}

export function useCreateSearchIndexMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		...orpc.search.createIndex.mutationOptions(),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: orpc.search.listIndexes.key(),
			});
		},
	});
}

export function useCreateSearchApiKeyMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		...orpc.search.createApiKey.mutationOptions(),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: orpc.search.listApiKeys.key(),
			});
		},
	});
}

export function useRevokeSearchApiKeyMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		...orpc.search.revokeApiKey.mutationOptions(),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: orpc.search.listApiKeys.key(),
			});
		},
	});
}

// ── Model Config ────────────────────────────────────────────────

export function useListModelsQuery() {
	return useQuery(orpc.search.listModels.queryOptions({ input: undefined }));
}

export function useModelConfigQuery(organizationId: string, slug: string) {
	return useQuery(
		orpc.search.modelConfig.get.queryOptions({
			input: { organizationId, slug },
			enabled: !!organizationId && !!slug,
		}),
	);
}

export function useUpdateModelConfigMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		...orpc.search.modelConfig.update.mutationOptions(),
		onSuccess: async (_data, _variables) => {
			await queryClient.invalidateQueries({
				queryKey: orpc.search.modelConfig.get.key(),
			});
		},
	});
}
