# @aacsearch/kinesis-sync — AWS Kinesis streaming connector for AACsearch

Consume AWS Kinesis Data Streams and sync records to AACsearch Engine with
at-least-once delivery, checkpointing, dead-letter queue, backpressure handling,
and configurable batch processing.

## Installation

```bash
npm install @aacsearch/kinesis-sync
# or
pnpm add @aacsearch/kinesis-sync
```

## Quick Start

```typescript
import { startKinesisSync } from "@aacsearch/kinesis-sync";

const sync = await startKinesisSync({
  kinesis: {
    streamName: "my-stream",
    aws: { region: "us-east-1" },
    iteratorType: "LATEST",
  },
  aacsearch: {
    baseUrl: "https://api.aacsearch.com",
    token: "ss_connector_xxx",
    projectId: "org_xxx",
  },
  checkpoint: {
    strategy: "file",
    filePath: "./.kinesis-checkpoints.json",
  },
  dlq: {
    streamName: "my-stream-dlq",
  },
  debug: true,
});

// Stop when done:
// await sync.stop();
```

## Features

### Shard-Based Parallel Consumption

The connector discovers all open shards and processes them in parallel with
configurable concurrency. Each shard gets its own polling loop.

### Checkpointing

Sequence numbers are persisted per shard, ensuring at-least-once delivery.
Two strategies:
- **File**: JSON file on disk (default: `./.kinesis-checkpoints.json`)
- **Memory**: in-memory only (lost on restart)

Checkpoints are saved at a configurable interval (default: every 100 records).

### Dead-Letter Queue (DLQ)

Failed records (after max retries) are sent to a configurable DLQ Kinesis stream
with the original record metadata and error reason attached.

### Record Deserialization

Supports multiple data formats:
- **base64-json** (default): Base64-decode → parse JSON
- **base64-string**: Base64-decode → treat as plain string
- **json**: Raw UTF-8 JSON

Nested payload extraction via dot-path (e.g., `payload.data`).

### Backpressure

Configurable batch size, max records per GetRecords call, and shard concurrency.

### Callbacks

Monitor sync progress with optional callbacks:

```typescript
const sync = await startKinesisSync(config, undefined, {
  onSync: (event) => console.log(`Synced ${event.documentCount} docs`),
  onError: (error) => console.error(error),
  onConnected: () => console.log("Connected"),
  onShardAssigned: (shardId) => console.log(`Assigned shard ${shardId}`),
  onShardRevoked: (shardId) => console.log(`Revoked shard ${shardId}`),
  onCheckpoint: (shardId, seq) => console.log(`Checkpoint ${shardId}: ${seq}`),
});
```

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `kinesis.streamName` | — | Kinesis Data Stream name |
| `kinesis.aws.region` | — | AWS region |
| `kinesis.iteratorType` | `"LATEST"` | Start position: LATEST, TRIM_HORIZON, or AT_TIMESTAMP |
| `kinesis.startingTimestamp` | — | ISO timestamp for AT_TIMESTAMP iterator |
| `maxRetries` | `3` | Max retries per record batch |
| `deserializer.format` | `"base64-json"` | Record format |
| `deserializer.path` | — | Dot-path to nested payload |
| `dlq.streamName` | — | DLQ stream (disabled if unset) |
| `checkpoint.strategy` | `"file"` | Checkpoint persistence: file or memory |
| `backpressure.maxShardConcurrency` | `5` | Parallel shard processors |
| `backpressure.batchSize` | `100` | Documents per AACsearch API call |

## AWS Credentials

Credentials are resolved in this order:
1. Explicit `accessKeyId`/`secretAccessKey` in config
2. AWS environment variables (`AWS_ACCESS_KEY_ID`, etc.)
3. EC2 instance profile / ECS task role
4. AWS SSO / default credential chain

## License

MIT
