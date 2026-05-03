# @aacsearch/mongodb-sync

MongoDB real-time sync connector for AACsearch Engine.

Sync MongoDB collections to AACsearch in real-time using MongoDB Change Streams.

> **Requires MongoDB replica set** — Change Streams need the oplog, which is only available on
> replica set members. Single-node replica sets work fine for development (`rs.initiate()`).

## Installation

```bash
npm install @aacsearch/mongodb-sync
```

## Quick start

### 1. Set up MongoDB replica set (if not already)

```javascript
// In mongosh:
rs.initiate()
```

### 2. Connect and sync

```typescript
import {
  startChangeStreamListener,
  initialFullSync,
} from "@aacsearch/mongodb-sync";

const config = {
  aacsearch: {
    baseUrl: process.env.AACSEARCH_URL!,
    token: process.env.AACSEARCH_TOKEN!,
    projectId: process.env.AACSEARCH_PROJECT_ID!,
  },
  mongoUri: process.env.MONGO_URI!,
  dbName: "myapp",
  collections: [
    {
      collection: "products",
      indexSlug: "products",
      fieldMapping: {
        _id: "id",
        name: "title",
        description: "body",
        price: "price",
        category: "category",
      },
    },
  ],
  debug: true,
};

// Step 1: Initial full sync (load all existing documents)
await initialFullSync(config, config.collections[0]);

// Step 2: Real-time change stream
const listener = await startChangeStreamListener(config, config.collections[0]);
await listener.start();

// Graceful shutdown
process.on("SIGTERM", async () => {
  await listener.stop();
  process.exit(0);
});
```

## Multiple collections

```typescript
import { MongoSyncManager } from "@aacsearch/mongodb-sync";

const manager = new MongoSyncManager(config);

// Sync all configured collections
await manager.startAll();

// Or sync individual collections
await manager.startCollection("products");
await manager.startCollection("reviews");
```

## Field mapping

Control how MongoDB fields map to AACsearch document fields:

```typescript
const config = {
  collection: "products",
  indexSlug: "products_index",
  fieldMapping: {
    _id: "external_id",
    name: "title",
    description: "body",
    "metadata.price": "price",  // Nested field access
    "metadata.tags": "tags",
  },
};
```

## Document transformation

Custom transform function for complex logic:

```typescript
const config = {
  collection: "users",
  indexSlug: "users",
  transform: (doc) => ({
    external_id: String(doc._id),
    full_name: `${doc.first_name} ${doc.last_name}`,
    email: doc.email,
    is_active: doc.status === "active",
    created_at: doc.created_at instanceof Date
      ? doc.created_at.toISOString()
      : doc.created_at,
  }),
};
```

## Resume tokens

The connector automatically tracks resume tokens for at-least-once delivery.
To persist tokens across restarts:

```typescript
const config = {
  ...baseConfig,
  resumeTokenFile: "/var/lib/aacsearch/mongo-resume-tokens.json",
};

// Resume token is automatically loaded on start and saved periodically
const listener = await startChangeStreamListener(config, collectionConfig);
```

## Error handling

```typescript
const listener = await startChangeStreamListener(config, collectionConfig, {
  onSync: (event) => {
    console.log(`Synced ${event.action} on ${event.collection} → ${event.indexSlug}`);
  },
  onError: (error, context) => {
    console.error(`Error on ${context?.collection}:`, error.message);
    // Optionally send to monitoring
  },
  onConnected: () => {
    console.log("Connected to MongoDB change stream");
  },
  onDisconnected: () => {
    console.log("Disconnected from MongoDB change stream");
  },
  onInitialSyncProgress: ({ collection, indexSlug, total, synced }) => {
    console.log(`Initial sync ${collection}: ${synced}/${total}`);
  },
});
```

## API Reference

### `startChangeStreamListener(config, collectionConfig, callbacks?, pipeline?)`

Start listening to MongoDB Change Stream for a single collection.

**Returns**: `ChangeStreamController`

| Method | Description |
|--------|-------------|
| `start()` | Connect to MongoDB and begin listening |
| `stop()` | Stop listening, flush pending, close connection |
| `status()` | Get current status (running, pendingCount, errorCount) |
| `getResumeToken()` | Get current resume token |
| `flushBatch()` | Manually flush pending changes |

### `initialFullSync(config, collectionConfig, callbacks?)`

Read all documents from a collection and push via full sync.

### `AacSearchClient`

Low-level client for the AACsearch Connector API.

## License

MIT
