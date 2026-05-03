# @aacsearch/kafka-sync — Kafka streaming connector for AACsearch

Consume Kafka topics and sync documents to AACsearch Engine with at-least-once
delivery, dead-letter queue, backpressure handling, and configurable batch processing.

## Installation

```bash
npm install @aacsearch/kafka-sync
# or
pnpm add @aacsearch/kafka-sync
```

## Quick Start

```typescript
import { startKafkaSync } from "@aacsearch/kafka-sync";

const consumer = await startKafkaSync({
	kafka: {
		brokers: ["localhost:9092"],
		groupId: "aacsearch-products",
		topic: "products.cdc",
		fromBeginning: false,
	},
	aacsearch: {
		baseUrl: "https://api.aacsearch.com",
		token: "ss_connector_xxx",
		projectId: "org_xxx",
	},
	dlq: {
		topic: "aacsearch-products-dlq",
		maxRetries: 3,
	},
	backpressure: {
		maxConcurrency: 10,
		batchSize: 100,
		maxPending: 500,
	},
});
```

## Features

### Kafka Consumer Groups

Standard Kafka consumer group with configurable session timeout, heartbeat
interval, and rebalance timeout. Supports SASL/SSL authentication.

### At-Least-Once Delivery

Manual offset commit after successful batch processing. Failed messages are
either retried or sent to the dead-letter queue, but offsets are committed
to avoid reprocessing DLQ'd messages.

### Dead-Letter Queue (DLQ)

Failed messages (after max retries) are sent to a configurable DLQ topic
with the original metadata and error reason attached as headers.

### Backpressure

Configurable max concurrency, batch size, and pending queue limit. When the
pending count exceeds the threshold, the consumer slows its poll interval.

### Custom Topic Mapping

Provide a custom `topicMapper` function to transform Kafka messages into
AACsearch change events:

```typescript
import type { KafkaMessage, KafkaChangeEvent } from "@aacsearch/kafka-sync";

const consumer = await startKafkaSync(
  { ... },
  (msg: KafkaMessage, topic: string) => {
    const value = JSON.parse(msg.value!.toString());
    return {
      topic,
      partition: msg.partition,
      offset: msg.offset,
      externalId: value.uuid,
      document: { title: value.name, price: value.cost },
      action: value.deleted ? "delete" : "upsert",
      raw: { timestamp: msg.timestamp, headers: {} },
    };
  },
);
```

### Callbacks

Monitor sync progress with optional callbacks:

```typescript
const consumer = await startKafkaSync(config, undefined, {
	onSync: (event) => console.log(`Synced ${event.documentCount} docs`),
	onError: (error) => console.error(error),
	onConnected: () => console.log("Connected"),
	onDisconnected: () => console.log("Disconnected"),
	onDlq: (event) => console.log(`DLQ: ${event.reason}`),
	onBackpressure: (count) => console.log(`Backpressure: ${count} pending`),
});
```

## Configuration

| Option                        | Default                  | Description                           |
| ----------------------------- | ------------------------ | ------------------------------------- |
| `kafka.brokers`               | —                        | Kafka broker list                     |
| `kafka.groupId`               | —                        | Consumer group ID                     |
| `kafka.topic`                 | —                        | Topic(s) to consume (string or array) |
| `kafka.clientId`              | `"aacsearch-kafka-sync"` | Kafka client ID                       |
| `kafka.fromBeginning`         | `false`                  | Start from earliest offset            |
| `maxRetries`                  | `3`                      | Max retries per message batch         |
| `dlq.topic`                   | —                        | DLQ topic (disabled if unset)         |
| `backpressure.maxConcurrency` | `10`                     | Parallel partition consumers          |
| `backpressure.batchSize`      | `100`                    | Documents per AACsearch API call      |
| `backpressure.maxPending`     | `500`                    | Backpressure threshold                |

## License

MIT
