/**
 * @aacsearch/kafka-sync — configuration types for Kafka streaming connector.
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

/**
 * Kafka message deserialization format.
 * - "json": parse message.value as UTF-8 JSON
 * - "string": use raw UTF-8 string value
 * - "avro": decode using Avro schema (requires avro-js or schema registry config)
 */
export type MessageFormat = "json" | "string" | "avro";

/** Message value extraction strategy for nested payloads */
export interface ValueExtractor {
	/** JMESPath or dot-path to the document payload within a Kafka message value */
	path: string;
	/** Fallback to entire value if path is not found */
	fallbackToFull?: boolean;
}

/** Dead-letter queue configuration */
export interface DlqConfig {
	/** Kafka topic to publish failed messages to */
	topic: string;
	/** Max retries before sending to DLQ (default: 3) */
	maxRetries?: number;
	/** Whether to include original message metadata in DLQ output (default: true) */
	includeMetadata?: boolean;
}

/** Backpressure configuration */
export interface BackpressureConfig {
	/** Max concurrency for parallel message processing (default: 10) */
	maxConcurrency?: number;
	/** Batch size for AACsearch sync call (default: 100) */
	batchSize?: number;
	/** Max pending messages in queue before applying backpressure (default: 500) */
	maxPending?: number;
	/** Poll interval when backpressure is active in ms (default: 1000) */
	pollIntervalMs?: number;
}

/** Kafka consumer configuration */
export interface KafkaConsumerConfig {
	/** Kafka broker list (e.g. ["localhost:9092"]) */
	brokers: string[];
	/** Consumer group ID */
	groupId: string;
	/** Source Kafka topic(s) to consume */
	topic: string | string[];
	/** SASL authentication (optional) */
	sasl?: {
		mechanism: "plain" | "scram-sha-256" | "scram-sha-512";
		username: string;
		password: string;
	};
	/** TLS/SSL configuration (optional) */
	ssl?: boolean | { rejectUnauthorized: boolean; ca?: string[]; cert?: string; key?: string };
	/** Client ID for Kafka (default: "aacsearch-kafka-sync") */
	clientId?: string;
	/** Start consumer position: "earliest" or "latest" (default: "latest") */
	fromBeginning?: boolean;
	/** Session timeout in ms (default: 30000) */
	sessionTimeout?: number;
	/** Heartbeat interval in ms (default: 3000) */
	heartbeatInterval?: number;
	/** Rebalance timeout in ms (default: 60000) */
	rebalanceTimeout?: number;
}

/** Full Kafka sync connector configuration */
export interface KafkaSyncConfig {
	/** Kafka connection settings */
	kafka: KafkaConsumerConfig;
	/** AACsearch connection settings */
	aacsearch: AacSearchConfig;
	/** Message format (default: "json") */
	messageFormat?: MessageFormat;
	/** Value extraction for nested payloads */
	valueExtractor?: ValueExtractor;
	/** Dead-letter queue settings */
	dlq?: DlqConfig;
	/** Backpressure settings */
	backpressure?: BackpressureConfig;
	/** Max retries per individual message (default: 3) */
	maxRetries?: number;
	/** Enable verbose logging */
	debug?: boolean;
}

/** Kafka change event produced by the connector */
export interface KafkaChangeEvent {
	/** Kafka topic */
	topic: string;
	/** Kafka partition */
	partition: number;
	/** Kafka offset */
	offset: string;
	/** Message key (if any) */
	key?: string;
	/** Parsed document payload */
	document: Record<string, unknown>;
	/** The external_id for AACsearch (extracted or generated) */
	externalId: string;
	/** The action: upsert or delete */
	action: "upsert" | "delete";
	/** Raw Kafka message metadata */
	raw: {
		timestamp: string;
		headers?: Record<string, string>;
	};
}

/** Result of a sync operation */
export interface SyncResult {
	synced: number;
	skipped: number;
	errors: string[];
}

/** Sync status callbacks */
export interface SyncCallbacks {
	onSync?: (event: { topic: string; action: "upsert" | "delete"; documentCount: number }) => void;
	onError?: (error: Error, context?: Record<string, unknown>) => void;
	onConnected?: () => void;
	onDisconnected?: () => void;
	onDlq?: (event: { topic: string; offset: string; reason: string }) => void;
	onBackpressure?: (pendingCount: number) => void;
}
