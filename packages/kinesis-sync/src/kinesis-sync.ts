/**
 * AWS Kinesis streaming consumer for AACsearch.
 *
 * Features:
 * - Kinesis Data Stream consumer with shard iterator management
 * - Checkpointing with sequence number persistence (file or memory)
 * - Dead-letter queue (publish to DLQ Kinesis stream)
 * - Backpressure handling with configurable shard concurrency
 * - Batch processing to AACsearch
 * - Retry with exponential backoff
 * - At-least-once delivery via checkpointing
 */

import {
	KinesisClient,
	GetShardIteratorCommand,
	GetRecordsCommand,
	PutRecordCommand,
	DescribeStreamCommand,
	type _Record,
	type Shard,
} from "@aws-sdk/client-kinesis";

import { AacSearchClient } from "./client";
import type { KinesisSyncConfig, KinesisChangeEvent, SyncCallbacks } from "./types";

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_MAX_SHARDS = 5;
const DEFAULT_MAX_RECORDS = 10000;
const DEFAULT_POLL_INTERVAL_MS = 1000;
const DEFAULT_CHECKPOINT_INTERVAL = 100;
const DEFAULT_CHECKPOINT_FILE = "./.kinesis-checkpoints.json";

/** Checkpoint map: shardId → sequenceNumber */
interface CheckpointMap {
	[shardId: string]: string;
}

/**
 * Start a Kinesis streaming consumer that polls a Kinesis Data Stream
 * and syncs documents to AACsearch Engine.
 *
 * Returns an object with `.stop()` to gracefully shut down.
 */
export async function startKinesisSync(
	config: KinesisSyncConfig,
	recordMapper?: (record: KinesisRecordData) => KinesisChangeEvent | null,
	callbacks?: SyncCallbacks,
): Promise<{ stop: () => Promise<void> }> {
	const log = config.debug
		? (...args: unknown[]) => console.log("[kinesis-sync]", ...args)
		: () => {};

	// ── Validate config ──────────────────────────────────────────────
	if (!config.kinesis.streamName) throw new Error("No Kinesis stream name configured");
	if (!config.kinesis.aws.region) throw new Error("No AWS region configured");
	if (!config.aacsearch.baseUrl) throw new Error("No AACsearch base URL configured");

	// ── AACsearch client ────────────────────────────────────────────
	const client = new AacSearchClient(config.aacsearch);
	const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;

	// ── Backpressure state ──────────────────────────────────────────
	const bp = {
		batchSize: config.backpressure?.batchSize ?? DEFAULT_BATCH_SIZE,
		maxRecordsPerCall: config.backpressure?.maxRecordsPerCall ?? DEFAULT_MAX_RECORDS,
		pollIntervalMs: config.backpressure?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
		pendingCount: 0,
	};

	// ── Checkpoint state ────────────────────────────────────────────
	const ckptStrategy = config.checkpoint?.strategy ?? "file";
	const ckptFile = config.checkpoint?.filePath ?? DEFAULT_CHECKPOINT_FILE;
	const ckptInterval = config.checkpoint?.saveInterval ?? DEFAULT_CHECKPOINT_INTERVAL;
	let checkpoints: CheckpointMap = {};
	let ckptDirty = false;

	async function loadCheckpoints(): Promise<void> {
		if (ckptStrategy === "memory") return;
		try {
			const fs = await import("fs/promises");
			const data = await fs.readFile(ckptFile, "utf-8");
			checkpoints = JSON.parse(data) as CheckpointMap;
			log(`Loaded ${Object.keys(checkpoints).length} shard checkpoints from ${ckptFile}`);
		} catch {
			checkpoints = {};
			log("No existing checkpoint file, starting fresh");
		}
	}

	async function saveCheckpoints(): Promise<void> {
		if (ckptStrategy === "memory" || !ckptDirty) return;
		try {
			const fs = await import("fs/promises");
			await fs.writeFile(ckptFile, JSON.stringify(checkpoints, null, 2), "utf-8");
			ckptDirty = false;
			log(`Saved ${Object.keys(checkpoints).length} shard checkpoints to ${ckptFile}`);
		} catch (error) {
			log(`Failed to save checkpoints: ${String(error)}`);
		}
	}

	let running = true;

	// ── AWS Kinesis Client ──────────────────────────────────────────
	const kinesisClient = new KinesisClient({
		region: config.kinesis.aws.region,
		credentials: config.kinesis.aws.accessKeyId
			? {
					accessKeyId: config.kinesis.aws.accessKeyId,
					secretAccessKey: config.kinesis.aws.secretAccessKey ?? "",
					sessionToken: config.kinesis.aws.sessionToken,
				}
			: undefined,
	});

	// ── Helper: decode Uint8Array to string ─────────────────────────
	function decodeData(data: Uint8Array | undefined): string {
		if (!data) return "";
		const decoder = new TextDecoder("utf-8");
		return decoder.decode(data);
	}

	// ── Dead-letter queue producer ──────────────────────────────────
	async function sendToDlq(record: _Record, shardId: string, reason: string): Promise<void> {
		if (!config.dlq?.streamName) return;
		const pkPrefix = config.dlq.partitionKeyPrefix ?? "dlq-";

		try {
			await kinesisClient.send(
				new PutRecordCommand({
					StreamName: config.dlq.streamName,
					PartitionKey: `${pkPrefix}${record.PartitionKey ?? "unknown"}`,
					Data: new TextEncoder().encode(
						JSON.stringify({
							originalStream: config.kinesis.streamName,
							originalShard: shardId,
							originalSequenceNumber: record.SequenceNumber,
							approximateArrivalTimestamp:
								record.ApproximateArrivalTimestamp?.toISOString(),
							reason,
							data: record.Data ? Buffer.from(record.Data).toString("base64") : null,
							partitionKey: record.PartitionKey,
						}),
					),
				}),
			);
			log(
				`Sent record ${record.SequenceNumber} to DLQ stream "${config.dlq.streamName}": ${reason}`,
			);
			callbacks?.onDlq?.({
				streamName: config.kinesis.streamName,
				sequenceNumber: record.SequenceNumber ?? "",
				reason,
			});
		} catch (dlqErr) {
			log(`DLQ send failed for ${record.SequenceNumber}: ${String(dlqErr)}`);
		}
	}

	// ── Default record mapper ───────────────────────────────────────
	const defaultMapper = (record: KinesisRecordData): KinesisChangeEvent | null => {
		try {
			if (!record.data || record.data.length === 0) return null;

			const format = config.deserializer?.format ?? "base64-json";
			const decoded = decodeData(record.data);
			let parsed: unknown;

			if (format === "base64-json") {
				parsed = JSON.parse(Buffer.from(decoded, "base64").toString("utf-8"));
			} else if (format === "base64-string") {
				parsed = { value: Buffer.from(decoded, "base64").toString("utf-8") };
			} else {
				// "json" — treat raw data as UTF-8 JSON
				parsed = JSON.parse(decoded);
			}

			// Extract nested payload if configured
			let document: Record<string, unknown>;
			const extractor = config.deserializer;
			if (extractor?.path && typeof parsed === "object" && parsed !== null) {
				const extracted = resolvePath(parsed as Record<string, unknown>, extractor.path);
				if (extracted && typeof extracted === "object") {
					document = extracted as Record<string, unknown>;
				} else if (extractor.fallbackToFull) {
					document = parsed as Record<string, unknown>;
				} else {
					return null;
				}
			} else if (typeof parsed === "object" && parsed !== null) {
				document = parsed as Record<string, unknown>;
			} else {
				return null;
			}

			const externalId = String(
				document.external_id ?? document.id ?? document._id ?? record.sequenceNumber,
			);
			const action =
				(document.action as string) === "delete" ||
				(document._action as string) === "delete"
					? "delete"
					: "upsert";

			return {
				streamName: config.kinesis.streamName,
				shardId: record.shardId,
				sequenceNumber: record.sequenceNumber,
				partitionKey: record.partitionKey,
				document,
				externalId,
				action,
				approximateArrivalTimestamp: record.approximateArrivalTimestamp,
			};
		} catch {
			return null;
		}
	};

	const mapper = recordMapper ?? defaultMapper;

	// ── Helper: process a batch of events ───────────────────────────
	async function processBatch(events: KinesisChangeEvent[]): Promise<{
		success: KinesisChangeEvent[];
		failed: { event: KinesisChangeEvent; error: string }[];
	}> {
		const success: KinesisChangeEvent[] = [];
		const failed: { event: KinesisChangeEvent; error: string }[] = [];

		const upserts = events.filter((e) => e.action === "upsert");
		const deletes = events.filter((e) => e.action === "delete");

		try {
			if (upserts.length > 0) {
				const docs = upserts.map((e) => ({
					external_id: e.externalId,
					...e.document,
				}));
				const result = await withRetry(() => client.syncDocuments(docs), { maxRetries });
				success.push(...upserts);
				log(`Synced ${result.synced} upsert documents`);
			}
		} catch (error) {
			const errMsg = error instanceof Error ? error.message : String(error);
			failed.push(...upserts.map((e) => ({ event: e, error: errMsg })));
		}

		try {
			if (deletes.length > 0) {
				const extIds = deletes.map((e) => e.externalId);
				const deleted = await withRetry(() => client.batchDelete(extIds), { maxRetries });
				success.push(...deletes);
				log(`Deleted ${deleted} documents`);
			}
		} catch (error) {
			const errMsg = error instanceof Error ? error.message : String(error);
			failed.push(...deletes.map((e) => ({ event: e, error: errMsg })));
		}

		return { success, failed };
	}

	// ── Process a single shard (runs in its own loop) ───────────────
	async function processShard(shard: Shard): Promise<void> {
		if (!shard.ShardId) return;
		const shardId = shard.ShardId;

		if (!running) return;

		log(`Starting shard processor: ${shardId}`);
		callbacks?.onShardAssigned?.(shardId);

		let recordCountSinceCheckpoint = 0;

		try {
			// Determine starting sequence number from checkpoint
			const checkpointSeq = checkpoints[shardId];

			// Determine iterator type
			const iteratorType = config.kinesis.iteratorType ?? "LATEST";
			let shardIteratorType:
				| "LATEST"
				| "TRIM_HORIZON"
				| "AT_TIMESTAMP"
				| "AFTER_SEQUENCE_NUMBER" = checkpointSeq
				? "AFTER_SEQUENCE_NUMBER"
				: config.kinesis.startingTimestamp
					? "AT_TIMESTAMP"
					: iteratorType === "TRIM_HORIZON"
						? "TRIM_HORIZON"
						: "LATEST";

			// Get shard iterator
			const iteratorInput: Record<string, unknown> = {
				StreamName: config.kinesis.streamName,
				ShardId: shardId,
				ShardIteratorType: shardIteratorType,
			};

			if (checkpointSeq) {
				iteratorInput.StartingSequenceNumber = checkpointSeq;
			}
			if (config.kinesis.startingTimestamp && !checkpointSeq) {
				iteratorInput.Timestamp = new Date(config.kinesis.startingTimestamp);
			}

			const iteratorResponse = await kinesisClient.send(
				new GetShardIteratorCommand(
					iteratorInput as {
						StreamName: string;
						ShardId: string;
						ShardIteratorType:
							| "LATEST"
							| "TRIM_HORIZON"
							| "AT_TIMESTAMP"
							| "AFTER_SEQUENCE_NUMBER";
						StartingSequenceNumber?: string;
						Timestamp?: Date;
					},
				),
			);
			let shardIterator = iteratorResponse.ShardIterator;

			if (!shardIterator) {
				log(`No iterator returned for shard ${shardId} — it may be closed`);
				return;
			}

			// Poll loop
			while (running && shardIterator) {
				try {
					const response: import("@aws-sdk/client-kinesis").GetRecordsCommandOutput = await kinesisClient.send(
						new GetRecordsCommand({
							ShardIterator: shardIterator,
							Limit: bp.maxRecordsPerCall,
						}),
					);

					const records = response.Records ?? [];
					shardIterator = response.NextShardIterator;

					if (records.length > 0) {
						log(
							`Shard ${shardId}: ${records.length} records received (seq ${records[0].SequenceNumber} - ${records[records.length - 1].SequenceNumber})`,
						);

						// Map records to change events
						const events: KinesisChangeEvent[] = [];
						const parseErrors: Array<{ record: _Record; reason: string }> = [];

						for (const kinesisRecord of records) {
							const recordData: KinesisRecordData = {
								sequenceNumber: kinesisRecord.SequenceNumber ?? "",
								partitionKey: kinesisRecord.PartitionKey ?? "",
								data: kinesisRecord.Data,
								shardId,
								approximateArrivalTimestamp:
									kinesisRecord.ApproximateArrivalTimestamp ?? new Date(),
							};

							try {
								const event = mapper(recordData);
								if (event) {
									events.push(event);
								}
							} catch (error) {
								parseErrors.push({
									record: kinesisRecord,
									reason: error instanceof Error ? error.message : String(error),
								});
							}
						}

						// Handle parse errors → DLQ
						for (const pe of parseErrors) {
							await sendToDlq(pe.record, shardId, `parse_error: ${pe.reason}`);
						}

						// Process events in batches
						if (events.length > 0) {
							bp.pendingCount += events.length;
							if (bp.pendingCount > 1000) {
								callbacks?.onBackpressure?.(bp.pendingCount);
							}

							for (let i = 0; i < events.length; i += bp.batchSize) {
								const eventBatch = events.slice(i, i + bp.batchSize);
								const { success, failed } = await processBatch(eventBatch);

								if (failed.length > 0) {
									log(`Failed to process ${failed.length} events in batch`);
									for (const f of failed) {
										const dlqRecord = records.find(
											(r: import("@aws-sdk/client-kinesis")._Record) => r.SequenceNumber === f.event.sequenceNumber,
										);
										if (dlqRecord) {
											await sendToDlq(dlqRecord, shardId, f.error);
										}
									}
									callbacks?.onError?.(new Error(failed[0].error), {
										streamName: config.kinesis.streamName,
										shardId,
									});
								}

								callbacks?.onSync?.({
									streamName: config.kinesis.streamName,
									action: "upsert",
									documentCount: success.length,
								});
							}

							// Update checkpoint to last processed sequence number
							const lastEvent = events[events.length - 1];
							checkpoints[shardId] = lastEvent.sequenceNumber;
							recordCountSinceCheckpoint += events.length;
							ckptDirty = true;

							if (recordCountSinceCheckpoint >= ckptInterval) {
								await saveCheckpoints();
								recordCountSinceCheckpoint = 0;
								callbacks?.onCheckpoint?.(shardId, lastEvent.sequenceNumber);
							}

							bp.pendingCount = Math.max(0, bp.pendingCount - events.length);
						}
					}

					// If no more records, wait before polling again
					if (records.length === 0 || !shardIterator) {
						await sleep(bp.pollIntervalMs);
					}
				} catch (error) {
					log(`Shard ${shardId} poll error: ${String(error)}`);
					callbacks?.onError?.(
						error instanceof Error ? error : new Error(String(error)),
						{ shardId, streamName: config.kinesis.streamName },
					);

					// On throttling, back off
					await sleep(bp.pollIntervalMs * 2);

					// Get fresh iterator if we lost ours
					if (!shardIterator) {
						const freshIterator = await kinesisClient.send(
							new GetShardIteratorCommand({
								StreamName: config.kinesis.streamName,
								ShardId: shardId,
								ShardIteratorType: "AFTER_SEQUENCE_NUMBER",
								StartingSequenceNumber: checkpoints[shardId],
							}),
						);
						shardIterator = freshIterator.ShardIterator;
					}
				}
			}
		} finally {
			await saveCheckpoints();
			log(`Shard processor stopped: ${shardId}`);
			callbacks?.onShardRevoked?.(shardId);
		}
	}

	// ── Discover shards and start processing ────────────────────────
	await loadCheckpoints();

	log(`Describing stream: ${config.kinesis.streamName}`);
	const describeResponse = await kinesisClient.send(
		new DescribeStreamCommand({
			StreamName: config.kinesis.streamName,
		}),
	);

	const streamDescription = describeResponse.StreamDescription;
	if (!streamDescription) {
		throw new Error("Failed to describe Kinesis stream");
	}

	const shards = streamDescription.Shards ?? [];
	const openShards = shards.filter((s) => !s.SequenceNumberRange?.EndingSequenceNumber);
	log(`Stream has ${shards.length} shards (${openShards.length} open)`);

	callbacks?.onConnected?.();

	// Process shards in parallel with concurrency limit
	const maxShardConcurrency = config.backpressure?.maxShardConcurrency ?? DEFAULT_MAX_SHARDS;
	const shardQueue = [...openShards];

	async function shardWorker(): Promise<void> {
		while (running) {
			const shard = shardQueue.shift();
			if (!shard) break;
			await processShard(shard);
		}
	}

	const workers: Promise<void>[] = [];
	const workerCount = Math.min(maxShardConcurrency, openShards.length);
	for (let i = 0; i < workerCount; i++) {
		workers.push(shardWorker());
	}

	if (workerCount === 0) {
		log("No open shards to process");
	}

	await Promise.all(workers);

	return {
		stop: async () => {
			running = false;
			await saveCheckpoints();
			kinesisClient.destroy();
			log("Kinesis sync stopped");
			callbacks?.onDisconnected?.();
		},
	};
}

// ─── Internal types ──────────────────────────────────────────

/** A single Kinesis record passed to the mapper function */
export interface KinesisRecordData {
	sequenceNumber: string;
	partitionKey: string;
	data: Uint8Array | undefined;
	shardId: string;
	approximateArrivalTimestamp: Date;
}

// ─── Utility Functions ───────────────────────────────────────

/**
 * Retry an async function with exponential backoff.
 */
async function withRetry<T>(
	fn: () => Promise<T>,
	options: { maxRetries?: number; baseDelayMs?: number; maxDelayMs?: number } = {},
): Promise<T> {
	const { maxRetries = 3, baseDelayMs = 200, maxDelayMs = 30000 } = options;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			if (attempt >= maxRetries) {
				throw error instanceof Error ? error : new Error(String(error));
			}
			const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
			const jitter = Math.random() * delay * 0.1;
			await sleep(delay + jitter);
		}
	}
	throw new Error("Unreachable");
}

/**
 * Sleep for the given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resolve a dot-path in a nested object.
 */
function resolvePath(obj: Record<string, unknown>, path: string): unknown {
	const parts = path.split(".");
	let current: unknown = obj;
	for (const part of parts) {
		if (current === null || current === undefined || typeof current !== "object") {
			return undefined;
		}
		current = (current as Record<string, unknown>)[part];
	}
	return current;
}
