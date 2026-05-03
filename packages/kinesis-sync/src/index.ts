/**
 * @aacsearch/kinesis-sync — AWS Kinesis streaming connector for AACsearch Engine.
 *
 * Consume Kinesis Data Streams and sync records to AACsearch with
 * at-least-once delivery, checkpointing, dead-letter queue, backpressure
 * handling, and configurable batch processing.
 *
 * ## Quick start
 *
 * ```typescript
 * import { startKinesisSync } from "@aacsearch/kinesis-sync";
 *
 * const sync = await startKinesisSync({
 *   kinesis: {
 *     streamName: "my-stream",
 *     aws: { region: "us-east-1" },
 *     iteratorType: "LATEST",
 *   },
 *   aacsearch: {
 *     baseUrl: "https://api.aacsearch.com",
 *     token: "ss_connector_xxx",
 *     projectId: "org_xxx",
 *   },
 *   checkpoint: {
 *     strategy: "file",
 *     filePath: "./.kinesis-checkpoints.json",
 *   },
 *   dlq: {
 *     streamName: "my-stream-dlq",
 *   },
 *   debug: true,
 * });
 *
 * // Stop when needed:
 * // await sync.stop();
 * ```
 */
export { startKinesisSync } from "./kinesis-sync";
export type { KinesisRecordData } from "./kinesis-sync";
export { AacSearchClient } from "./client";
export { chunk, withRetry, sleep } from "./batch";
export type {
	AacSearchConfig,
	AwsConfig,
	KinesisConsumerConfig,
	KinesisSyncConfig,
	RecordDeserializer,
	DlqConfig,
	CheckpointConfig,
	BackpressureConfig,
	KinesisChangeEvent,
	SyncResult,
	SyncCallbacks,
} from "./types";
