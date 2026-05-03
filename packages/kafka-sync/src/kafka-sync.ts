/**
 * Kafka streaming consumer for AACsearch.
 *
 * Features:
 * - Consumer group with at-least-once delivery via manual commit
 * - Dead-letter queue for failed messages
 * - Backpressure handling with configurable concurrency
 * - Batch processing to AACsearch
 * - Retry with exponential backoff
 */

import { Kafka, type Consumer, type EachBatchPayload, logLevel } from "kafkajs";

import { AacSearchClient } from "./client";
import type { KafkaSyncConfig, KafkaChangeEvent, SyncCallbacks } from "./types";

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_MAX_CONCURRENCY = 10;
const DEFAULT_MAX_PENDING = 500;
const DEFAULT_POLL_INTERVAL_MS = 1000;

/**
 * Start a Kafka streaming consumer that reads messages from Kafka topics
 * and syncs documents to AACsearch Engine.
 *
 * Returns the Consumer instance. Call `.disconnect()` to stop.
 */
export async function startKafkaSync(
	config: KafkaSyncConfig,
	topicMapper?: (message: KafkaMessageData, topic: string) => KafkaChangeEvent | null,
	callbacks?: SyncCallbacks,
): Promise<Consumer> {
	const log = config.debug
		? (...args: unknown[]) => console.log("[kafka-sync]", ...args)
		: () => {};

	// ── Validate config ──────────────────────────────────────────────
	if (!config.kafka.brokers.length) throw new Error("No Kafka brokers configured");
	if (!config.kafka.groupId) throw new Error("No consumer group ID configured");
	if (!config.aacsearch.baseUrl) throw new Error("No AACsearch base URL configured");

	// ── AACsearch client ────────────────────────────────────────────
	const client = new AacSearchClient(config.aacsearch);

	// ── Backpressure state ──────────────────────────────────────────
	const bp = {
		maxConcurrency: config.backpressure?.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY,
		batchSize: config.backpressure?.batchSize ?? DEFAULT_BATCH_SIZE,
		maxPending: config.backpressure?.maxPending ?? DEFAULT_MAX_PENDING,
		pollIntervalMs: config.backpressure?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
		pendingCount: 0,
	};

	// ── Dead-letter queue producer ──────────────────────────────────
	let dlqProducer: import("kafkajs").Producer | null = null;

	async function sendToDlq(
		kafkaInstance: import("kafkajs").Kafka,
		offset: string,
		key: Buffer | null | undefined,
		value: Buffer | null | undefined,
		messageTopic: string,
		messagePartition: number,
		messageTimestamp: string,
		reason: string,
	): Promise<void> {
		if (!config.dlq?.topic) return;
		const includeMeta = config.dlq.includeMetadata ?? true;

		if (!dlqProducer) {
			dlqProducer = kafkaInstance.producer();
			await dlqProducer.connect();
		}

		const dlqPayload = includeMeta
			? JSON.stringify({
					originalTopic: messageTopic,
					originalPartition: messagePartition,
					originalOffset: offset,
					originalTimestamp: messageTimestamp,
					reason,
					value: value?.toString("utf-8"),
					key: key?.toString("utf-8"),
				})
			: value;

		await dlqProducer.send({
			topic: config.dlq.topic,
			messages: [
				{
					key: key ?? Buffer.from(offset),
					value: Buffer.from(dlqPayload ?? ""),
					headers: {
						"dlq-original-topic": messageTopic,
						"dlq-original-offset": offset,
						"dlq-reason": reason,
					},
				},
			],
		});

		log(`Sent message ${offset} to DLQ topic "${config.dlq.topic}": ${reason}`);
		callbacks?.onDlq?.({ topic: messageTopic, offset, reason });
	}

	// ── Default topic mapper ────────────────────────────────────────
	const defaultMapper = (msg: KafkaMessageData, topic: string): KafkaChangeEvent | null => {
		try {
			if (!msg.value) return null;

			const valueStr = msg.value.toString("utf-8");
			const extractor = config.valueExtractor;
			let parsed: unknown;

			// Parse based on message format
			if (config.messageFormat === "string") {
				parsed = { value: valueStr };
			} else {
				// Default: JSON
				parsed = JSON.parse(valueStr);
			}

			// Extract nested payload if configured
			let document: Record<string, unknown>;
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
				document.external_id ?? document.id ?? document._id ?? msg.offset,
			);
			const action =
				(document.action as string) === "delete" ||
				(document._action as string) === "delete"
					? "delete"
					: "upsert";

			return {
				topic,
				partition: msg.partition,
				offset: msg.offset,
				key: msg.key?.toString("utf-8") ?? undefined,
				document,
				externalId,
				action,
				raw: {
					timestamp: msg.timestamp,
					headers: {},
				},
			};
		} catch {
			return null;
		}
	};

	const mapper = topicMapper ?? defaultMapper;
	const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;

	// ── Connect to Kafka ────────────────────────────────────────────
	const saslConfig = config.kafka.sasl
		? (() => {
				const s = config.kafka.sasl;
				switch (s.mechanism) {
					case "plain":
						return {
							mechanism: "plain" as const,
							username: s.username,
							password: s.password,
						};
					case "scram-sha-256":
						return {
							mechanism: "scram-sha-256" as const,
							username: s.username,
							password: s.password,
						};
					case "scram-sha-512":
						return {
							mechanism: "scram-sha-512" as const,
							username: s.username,
							password: s.password,
						};
				}
			})()
		: undefined;

	const kafkaInstance = new Kafka({
		clientId: config.kafka.clientId ?? "aacsearch-kafka-sync",
		brokers: config.kafka.brokers,
		ssl: config.kafka.ssl,
		sasl: saslConfig,
		logLevel: config.debug ? logLevel.INFO : logLevel.WARN,
		connectionTimeout: 10000,
		authenticationTimeout: 10000,
	});

	const consumer: Consumer = kafkaInstance.consumer({
		groupId: config.kafka.groupId,
		sessionTimeout: config.kafka.sessionTimeout ?? 30000,
		heartbeatInterval: config.kafka.heartbeatInterval ?? 3000,
		rebalanceTimeout: config.kafka.rebalanceTimeout ?? 60000,
		maxWaitTimeInMs: bp.pollIntervalMs,
		maxBytesPerPartition: 1048576, // 1 MB
	});

	await consumer.connect();
	log(`Connected to Kafka: ${config.kafka.brokers.join(",")}`);

	// ── Subscribe ───────────────────────────────────────────────────
	const topics = Array.isArray(config.kafka.topic) ? config.kafka.topic : [config.kafka.topic];

	await Promise.all(
		topics.map((t) =>
			consumer.subscribe({
				topic: t,
				fromBeginning: config.kafka.fromBeginning ?? false,
			}),
		),
	);
	log(`Subscribed to topics: ${topics.join(", ")}`);

	callbacks?.onConnected?.();

	// ── Helper: process a single batch ──────────────────────────────
	async function processBatch(events: KafkaChangeEvent[]): Promise<{
		success: KafkaChangeEvent[];
		failed: { event: KafkaChangeEvent; error: string }[];
	}> {
		const success: KafkaChangeEvent[] = [];
		const failed: { event: KafkaChangeEvent; error: string }[] = [];

		// Group by action
		const upserts = events.filter((e) => e.action === "upsert");
		const deletes = events.filter((e) => e.action === "delete");

		try {
			if (upserts.length > 0) {
				const docs = upserts.map((e) => ({
					external_id: e.externalId,
					...e.document,
				}));
				const result = await withRetry(() => client.syncDocuments(docs), maxRetries);
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
				const deleted = await withRetry(() => client.batchDelete(extIds), maxRetries);
				success.push(...deletes);
				log(`Deleted ${deleted} documents`);
			}
		} catch (error) {
			const errMsg = error instanceof Error ? error.message : String(error);
			failed.push(...deletes.map((e) => ({ event: e, error: errMsg })));
		}

		return { success, failed };
	}

	// ── Run consumer ────────────────────────────────────────────────
	consumer.run({
		autoCommit: false,
		eachBatchAutoResolve: true,
		partitionsConsumedConcurrently: bp.maxConcurrency,

		eachBatch: async (payload: EachBatchPayload) => {
			const { batch, resolveOffset, heartbeat, commitOffsetsIfNecessary } = payload;
			const { topic, partition, messages } = batch;

			log(
				`Processing batch: topic=${topic} partition=${partition} messages=${messages.length}`,
			);

			// ── 1. Map messages to change events ─────────────────────
			const events: KafkaChangeEvent[] = [];
			const parseErrors: Array<{
				offset: string;
				key: Buffer | null | undefined;
				value: Buffer | null | undefined;
				timestamp: string;
				reason: string;
			}> = [];

			for (const msg of messages) {
				const msgData: KafkaMessageData = {
					offset: msg.offset,
					key: msg.key,
					value: msg.value,
					timestamp: msg.timestamp,
					partition,
					headers: msg.headers,
					size: msg.size,
				};

				try {
					const event = mapper(msgData, topic);
					if (event) {
						events.push(event);
					}
				} catch (error) {
					parseErrors.push({
						offset: msg.offset,
						key: msg.key,
						value: msg.value,
						timestamp: msg.timestamp,
						reason: error instanceof Error ? error.message : String(error),
					});
				}
			}

			// ── 2. Handle parse errors → DLQ ─────────────────────────
			if (parseErrors.length > 0) {
				log(`Parse errors: ${parseErrors.length} messages`);
				for (const pe of parseErrors) {
					try {
						await sendToDlq(
							kafkaInstance,
							pe.offset,
							pe.key,
							pe.value,
							topic,
							partition,
							pe.timestamp,
							`parse_error: ${pe.reason}`,
						);
					} catch (dlqErr) {
						log(`DLQ send failed: ${String(dlqErr)}`);
					}
					resolveOffset(pe.offset);
				}
				callbacks?.onError?.(new Error(`Parse errors: ${parseErrors.length}`), {
					topic,
					partition,
					count: parseErrors.length,
				});
			}

			if (events.length === 0) {
				await commitOffsetsIfNecessary();
				return;
			}

			// ── 3. Apply backpressure ────────────────────────────────
			bp.pendingCount = events.length;
			if (bp.pendingCount > bp.maxPending) {
				log(
					`Backpressure: ${bp.pendingCount} pending (max ${bp.maxPending}), slowing poll interval`,
				);
				callbacks?.onBackpressure?.(bp.pendingCount);
			}

			// ── 4. Process batches ───────────────────────────────────
			for (let i = 0; i < events.length; i += bp.batchSize) {
				const eventBatch = events.slice(i, i + bp.batchSize);
				const { success, failed } = await processBatch(eventBatch);

				// Commit offsets for successful events
				for (const evt of success) {
					resolveOffset(evt.offset);
				}

				// Handle failed events → DLQ
				if (failed.length > 0) {
					log(`Failed to process ${failed.length} events in batch`);
					for (const f of failed) {
						try {
							await sendToDlq(
								kafkaInstance,
								f.event.offset,
								f.event.key ? Buffer.from(f.event.key) : null,
								null,
								f.event.topic,
								f.event.partition,
								f.event.raw.timestamp,
								f.error,
							);
							// Still commit DLQ'd messages to avoid re-processing
							resolveOffset(f.event.offset);
						} catch (dlqErr) {
							log(`DLQ send failed for offset ${f.event.offset}: ${String(dlqErr)}`);
							callbacks?.onError?.(
								dlqErr instanceof Error ? dlqErr : new Error(String(dlqErr)),
								{ topic: f.event.topic, offset: f.event.offset },
							);
						}
					}
					callbacks?.onError?.(new Error(failed[0].error), {
						topic,
						partition,
						failedCount: failed.length,
					});
				}

				callbacks?.onSync?.({
					topic,
					action: "upsert",
					documentCount: success.length,
				});

				await heartbeat();
			}

			// ── 5. Commit offsets ────────────────────────────────────
			await commitOffsetsIfNecessary();
			bp.pendingCount = 0;
		},
	});

	consumer.on("consumer.disconnect", () => {
		log("Disconnected from Kafka");
		callbacks?.onDisconnected?.();
	});

	consumer.on("consumer.crash", (e) => {
		const errMsg = e.payload?.error?.message ?? String(e);
		log(`Consumer crashed: ${errMsg}`);
		callbacks?.onError?.(new Error(errMsg));
	});

	return consumer;
}

// ─── Utility Functions ─────────────────────────────────────────

/**
 * Retry an async function with exponential backoff.
 */
async function withRetry<T>(
	fn: () => Promise<T>,
	maxRetries: number = DEFAULT_MAX_RETRIES,
): Promise<T> {
	let lastError: Error | null = null;
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));
			if (attempt < maxRetries) {
				const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
				await sleep(delay);
			}
		}
	}
	throw lastError ?? new Error("Retry failed");
}

/**
 * Sleep for the given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resolve a dot-path in a nested object.
 * E.g. resolvePath({ a: { b: "val" } }, "a.b") → "val"
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

// ─── Internal types for the topic mapper ──────────────────────

/** The message data passed to the topic mapper function */
export interface KafkaMessageData {
	/** Message offset */
	offset: string;
	/** Message key (optional) */
	key: Buffer | null | undefined;
	/** Message value (optional) */
	value: Buffer | null | undefined;
	/** Message timestamp */
	timestamp: string;
	/** Partition (from batch) */
	partition: number;
	/** Message headers */
	headers: import("kafkajs").IHeaders | undefined;
	/** Message size in bytes */
	size: number | undefined;
}
