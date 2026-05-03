import { getTypesenseClient } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin } from "../lib/access";

const clusterOperationSchema = z.enum(["vote", "debug", "metrics", "snapshot"]);

export const performClusterOperation = protectedProcedure
	.route({
		method: "POST",
		path: "/search/cluster/operations",
		tags: ["Search"],
		summary: "Perform cluster-level operations (vote, debug, metrics.json)",
		description:
			"Executes cluster maintenance operations: vote for leader, retrieve debug info, or fetch cluster metrics.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			operation: clusterOperationSchema,
		}),
	)
	.output(
		z.object({
			success: z.boolean(),
			operation: z.string(),
			data: z.record(z.string(), z.unknown()),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);

		const client = getTypesenseClient();
		let data: Record<string, unknown> = {};

		try {
			switch (input.operation) {
				case "metrics": {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const metrics = (await (client as any).metrics.retrieve()) as any;
					data = {
						system_cpu_percentage:
							(metrics?.system_cpu1_active_percentage as number) ?? 0,
						system_memory_total: (metrics?.system_memory_total_bytes as string) ?? "0",
						system_memory_used: (metrics?.system_memory_used_bytes as string) ?? "0",
						system_network_received:
							(metrics?.system_network_received_bytes as string) ?? "0",
						system_network_sent: (metrics?.system_network_sent_bytes as string) ?? "0",
						typesense_memory_used:
							(metrics?.typesense_memory_active_bytes as string) ?? "0",
						typesense_memory_allocated:
							(metrics?.typesense_memory_allocated_bytes as string) ?? "0",
						typesense_processed_requests:
							(metrics?.typesense_processed_requests_total_count as number) ?? 0,
						typesense_pending_write_batches:
							(metrics?.typesense_pending_write_batches_total_count as number) ?? 0,
					};
					break;
				}
				case "debug": {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const debug = (await (client as any).debug.retrieve()) as any;
					data = { version: debug?.version as string, state: debug?.state as string };
					break;
				}
				case "vote": {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					await (client as any).operations().perform("vote");
					data = { message: "Vote requested successfully" };
					break;
				}
				case "snapshot": {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const result = await (client as any).operations().perform("snapshot");
					data = {
						success: result?.success as boolean ?? true,
						snapshotPath: result?.snapshot_path as string ?? "",
					};
					break;
				}
			}

			return {
				success: true,
				operation: input.operation,
				data: data as Record<string, unknown>,
			};
		} catch {
			return { success: false, operation: input.operation, data: {} };
		}
	});

export const clusterMetrics = protectedProcedure
	.route({
		method: "GET",
		path: "/search/cluster/metrics",
		tags: ["Search"],
		summary: "Get cluster metrics as JSON",
		description:
			"Returns Typesense cluster /metrics.json data including CPU, memory, network, and request stats.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(
		z.object({
			system: z.object({
				cpuPercentage: z.number(),
				memoryTotalBytes: z.string(),
				memoryUsedBytes: z.string(),
				networkReceivedBytes: z.string(),
				networkSentBytes: z.string(),
			}),
			typesense: z.object({
				memoryActiveBytes: z.string(),
				memoryAllocatedBytes: z.string(),
				processedRequests: z.number(),
				pendingWriteBatches: z.number(),
			}),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);

		const client = getTypesenseClient();
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const metrics = (await (client as any).metrics.retrieve()) as any;

			return {
				system: {
					cpuPercentage: (metrics?.system_cpu1_active_percentage as number) ?? 0,
					memoryTotalBytes: (metrics?.system_memory_total_bytes as string) ?? "0",
					memoryUsedBytes: (metrics?.system_memory_used_bytes as string) ?? "0",
					networkReceivedBytes: (metrics?.system_network_received_bytes as string) ?? "0",
					networkSentBytes: (metrics?.system_network_sent_bytes as string) ?? "0",
				},
				typesense: {
					memoryActiveBytes: (metrics?.typesense_memory_active_bytes as string) ?? "0",
					memoryAllocatedBytes:
						(metrics?.typesense_memory_allocated_bytes as string) ?? "0",
					processedRequests:
						(metrics?.typesense_processed_requests_total_count as number) ?? 0,
					pendingWriteBatches:
						(metrics?.typesense_pending_write_batches_total_count as number) ?? 0,
				},
			};
		} catch {
			return {
				system: {
					cpuPercentage: 0,
					memoryTotalBytes: "0",
					memoryUsedBytes: "0",
					networkReceivedBytes: "0",
					networkSentBytes: "0",
				},
			typesense: {
				memoryActiveBytes: "0",
				memoryAllocatedBytes: "0",
				processedRequests: 0,
				pendingWriteBatches: 0,
			},
		};
		}
	});

export const triggerClusterSnapshot = protectedProcedure
	.route({
		method: "POST",
		path: "/search/cluster/snapshot",
		tags: ["Search"],
		summary: "Trigger a point-in-time cluster snapshot",
		description:
			"Initiates a Typesense cluster snapshot operation. The snapshot is created server-side and the response includes the snapshot path on disk.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(
		z.object({
			success: z.boolean(),
			snapshotPath: z.string(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);

		const client = getTypesenseClient();
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const result = await (client as any).operations().perform("snapshot");
			return {
				success: (result?.success as boolean) ?? true,
				snapshotPath: (result?.snapshot_path as string) ?? "",
			};
		} catch {
			return { success: false, snapshotPath: "" };
		}
	});
