# @aacsearch/postgres-sync

PostgreSQL real-time sync connector for AACsearch Engine.

Sync your PostgreSQL tables to AACsearch in real-time using one of three strategies:

1. **pg_notify** — trigger-based `LISTEN`/`NOTIFY` (recommended, low latency)
2. **Polling cursor** — periodic query on a cursor column (e.g. `updated_at`)
3. **Sequin CDC** — logical replication via [Sequin](https://sequin.io) streams

## Installation

```bash
npm install @aacsearch/postgres-sync
```

## Quick start (pg_notify — recommended)

### 1. Create a trigger function

```sql
CREATE OR REPLACE FUNCTION notify_aacsearch()
RETURNS trigger AS $$ BEGIN
  PERFORM pg_notify('aacsearch_sync', row_to_json(NEW)::text);
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER products_aacsearch_trigger
AFTER INSERT OR UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION notify_aacsearch();
```

### 2. Connect

```typescript
import { startPgNotifyListener } from "@aacsearch/postgres-sync";

const pg = await startPgNotifyListener({
	aacsearch: {
		baseUrl: process.env.AACSEARCH_URL!,
		token: process.env.AACSEARCH_TOKEN!,
		projectId: process.env.AACSEARCH_PROJECT_ID!,
	},
	connectionString: process.env.DATABASE_URL!,
	table: "products",
	idColumn: "id",
	initialFullSync: true,
	debug: true,
});

process.on("SIGTERM", () => pg.end());
```

## Quick start (polling)

For tables where you can't add triggers:

```typescript
import { startPollingSync } from "@aacsearch/postgres-sync";

const poller = startPollingSync({
	aacsearch: { baseUrl, token, projectId },
	connectionString: process.env.DATABASE_URL!,
	table: "orders",
	cursorColumn: "updated_at",
	pollIntervalMs: 5000,
});

// Stop later:
// poller.stop();
```

## Quick start (Sequin CDC)

For logical replication via Sequin:

```typescript
import { startSequinCdcSync } from "@aacsearch/postgres-sync";

const sequin = startSequinCdcSync({
	aacsearch: { baseUrl, token, projectId },
	streamUrl: "https://api.sequin.io/streams/YOUR_STREAM_ID",
	accessToken: "seq_xxx",
	table: "products",
});
```

## Custom mapper

```typescript
startPgNotifyListener(
	{
		...config,
		table: "reviews",
	},
	(row) => ({
		external_id: String(row.id),
		title: row.title,
		content: row.body,
		rating: row.stars,
		product_id: row.product_id,
	}),
	{
		onSync: (event) => console.log(`Synced ${event.action} on ${event.table}`),
		onError: (error, ctx) => console.error(`Error on ${ctx?.table}:`, error),
	},
);
```

## Strategies comparison

| Strategy       | Latency | Requires trigger | Overhead                  |
| -------------- | ------- | ---------------- | ------------------------- |
| pg_notify      | ~100ms  | Yes              | Minimal (NOTIFY is async) |
| Polling cursor | ~5-60s  | No               | SELECT per interval       |
| Sequin CDC     | ~1-5s   | No               | Logical replication slot  |

## License

MIT
