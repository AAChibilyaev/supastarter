/**
 * @aacsearch/kinesis-sync — configuration types for AWS Kinesis streaming connector.
 */

/** AACsearch connection configuration */
export interface AacSearchConfig {
	/** AACsearch API base URL (e.g. https://api.aacsearch.com) */
	baseUrl: string;
	/** Connector bearer token (ss_connector_* prefix) */
	token: string;
	/** Organization/project ID */
	projectId: string;
}

/** AWS region configuration */
export interface AwsConfig {
	/** AWS region (e.g. "us-east-1", "eu-central-1") */
	region: string;
	/** AWS access key ID (optional — falls back to env/instance profile) */
	accessKeyId?: string;
	/** AWS secret access key (optional) */
	secretAccessKey?: string;
	/** Session token for temporary credentials (optional) */
	sessionToken?: string;
}

/** Kinesis record deserialization configuration */
export interface RecordDeserializer {
	/** How to decode the Kinesis Data Blob:
	 * - "base64-json": decode Base64 → parse JSON
	 * - "base64-string": decode Base64 → treat as string
	 * - "json": treat raw Buffer as JSON (CDRC/KPL aggregated format)
	 * Default: "base64-json"
	 */
	format?: "base64-json" | "base64-string" | "json";
	/** JMESPath or dot-path to the document payload within the parsed record */
	path?: string;
	/** Fallback to entire record if path is not found */
	fallbackToFull?: boolean;
}

/** Dead-letter queue configuration */
export interface DlqConfig {
	/** Kinesis stream name to send failed records to */
	streamName: string;
	/** Optional prefix for DLQ records partition key (default: "dlq-") */
	partitionKeyPrefix?: string;
	/** Max retries before sending to DLQ (default: 3) */
	maxRetries?: number;
}

/** Checkpoint configuration */
export interface CheckpointConfig {
	/** How to persist sequence number checkpoints:
	 * - "file": JSON file on disk (default)
	 * - "memory": in-memory only (lost on restart)
	 */
	strategy?: "file" | "memory";
	/** File path for "file" strategy (default: "./.kinesis-checkpoints.json") */
	filePath?: string;
	/** Save checkpoint every N records (default: 100) */
	saveInterval?: number;
}

/** Backpressure configuration */
export interface BackpressureConfig {
	/** Max concurrency for parallel shard processing (default: number of shards) */
	maxShardConcurrency?: number;
	/** Batch size for AACsearch sync call (default: 100) */
	batchSize?: number;
	/** Max records per GetRecords call (default: 10000, Kinesis max) */
	maxRecordsPerCall?: number;
	/** Poll interval in ms between GetRecords calls (default: 1000) */
	pollIntervalMs?: number;
}

/** Kinesis consumer configuration */
export interface KinesisConsumerConfig {
	/** Kinesis Data Stream name */
	streamName: string;
	/** AWS connection settings */
	aws: AwsConfig;
	/** Application name for Kinesis Client Library-like tracking (default: "aacsearch-kinesis-sync") */
	appName?: string;
	/** Only process records after this timestamp (ISO string). Used for catch-up. */
	startingTimestamp?: string;
	/** Use TRIM_HORIZON (earliest) or LATEST (default: "LATEST") */
	iteratorType?: "TRIM_HORIZON" | "LATEST" | "AT_TIMESTAMP";
}

/** Full Kinesis sync connector configuration */
export interface KinesisSyncConfig {
	/** Kinesis connection settings */
	kinesis: KinesisConsumerConfig;
	/** AACsearch connection settings */
	aacsearch: AacSearchConfig;
	/** Record deserialization settings */
	deserializer?: RecordDeserializer;
	/** Dead-letter queue settings */
	dlq?: DlqConfig;
	/** Checkpoint persistence settings */
	checkpoint?: CheckpointConfig;
	/** Backpressure settings */
	backpressure?: BackpressureConfig;
	/** Max retries per record batch (default: 3) */
	maxRetries?: number;
	/** Enable verbose logging */
	debug?: boolean;
}

/** Kinesis change event produced by the connector */
export interface KinesisChangeEvent {
	/** Kinesis stream name */
	streamName: string;
	/** Shard ID */
	shardId: string;
	/** Sequence number */
	sequenceNumber: string;
	/** Partition key */
	partitionKey: string;
	/** Parsed document payload */
	document: Record<string, unknown>;
	/** The external_id for AACsearch (extracted or generated) */
	externalId: string;
	/** The action: upsert or delete */
	action: "upsert" | "delete";
	/** Approximate arrival timestamp */
	approximateArrivalTimestamp: Date;
}

/** Result of a sync operation */
export interface SyncResult {
	synced: number;
	skipped: number;
	errors: string[];
}

/** Sync status callbacks */
export interface SyncCallbacks {
	onSync?: (event: {
		streamName: string;
		action: "upsert" | "delete";
		documentCount: number;
	}) => void;
	onError?: (error: Error, context?: Record<string, unknown>) => void;
	onConnected?: () => void;
	onDisconnected?: () => void;
	onShardAssigned?: (shardId: string) => void;
	onShardRevoked?: (shardId: string) => void;
	onDlq?: (event: { streamName: string; sequenceNumber: string; reason: string }) => void;
	onBackpressure?: (pendingCount: number) => void;
	onCheckpoint?: (shardId: string, sequenceNumber: string) => void;
}
