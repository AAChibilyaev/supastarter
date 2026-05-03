/**
 * @aacsearch/kafka-sync — Kafka streaming connector for AACsearch Engine.
 *
 * Consume Kafka topics and sync documents to AACsearch with
 * at-least-once delivery, dead-letter queue, backpressure handling,
 * and configurable batch processing.
 *
 * ## Quick start
 *
 * ```typescript
 * import { startKafkaSync } from "@aacsearch/kafka-sync";
 *
 * const consumer = await startKafkaSync({
 *   kafka: {
 *     brokers: ["localhost:9092"],
 *     groupId: "aacsearch-products",
 *     topic: "products.cdc",
 *   },
 *   aacsearch: {
 *     baseUrl: "https://api.aacsearch.com",
 *     token: "ss_connector_xxx",
 *     projectId: "org_xxx",
 *   },
 *   dlq: {
 *     topic: "aacsearch-products-dlq",
 *     maxRetries: 3,
 *   },
 *   backpressure: {
 *     maxConcurrency: 10,
 *     batchSize: 100,
 *     maxPending: 500,
 *   },
 *   debug: true,
 * });
 *
 * // Stop when needed:
 * // await consumer.disconnect();
 * ```
 */
export { startKafkaSync } from "./kafka-sync";
export type { KafkaMessageData } from "./kafka-sync";
export { AacSearchClient } from "./client";
export { chunk, withRetry, sleep } from "./batch";
export type {
	AacSearchConfig,
	KafkaConsumerConfig,
	KafkaSyncConfig,
	MessageFormat,
	ValueExtractor,
	DlqConfig,
	BackpressureConfig,
	KafkaChangeEvent,
	SyncResult,
	SyncCallbacks,
} from "./types";
