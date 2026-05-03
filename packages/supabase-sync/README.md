# @aacsearch/supabase-sync

Real-time sync connector for Supabase → AACsearch Engine.

Subscribes to Supabase Realtime `postgres_changes` and pushes row-level changes
(INSERT / UPDATE / DELETE) to the AACsearch Connector API.

## Installation

```bash
npm install @aacsearch/supabase-sync
# or
yarn add @aacsearch/supabase-sync
# or
pnpm add @aacsearch/supabase-sync
```

## Quick start

```typescript
import { createRealtimeSubscription } from "@aacsearch/supabase-sync";

const rtClient = createRealtimeSubscription({
  aacsearch: {
    baseUrl: "https://api.aacsearch.com",
    token: "ss_connector_your_token_here",
    projectId: "org_your_project_id",
  },
  supabase: {
    url: "https://your-project.supabase.co",
    apiKey: "your_supabase_anon_or_service_role_key",
  },
  tables: [
    // Sync all columns from the `products` table
    { table: "products", idColumn: "id" },
    // Only sync specific columns from `categories`
    { table: "categories", idColumn: "id", columns: ["name", "slug", "description"] },
    // Use a custom mapper
    {
      table: "reviews",
      idColumn: "id",
      mapper: (row) => ({
        external_id: String(row.id),
        title: row.title,
        content: row.body,
        rating: row.stars,
        product_id: row.product_id,
      }),
    },
  ],
});

// Disconnect when done
// rtClient.disconnect();
```

## Edge Function alternative

For a serverless approach, copy `src/edge-function/index.ts` into your Supabase
project as a Database Webhook handler. Deploy with:

```bash
supabase functions deploy aacsearch-sync --no-verify-jwt
supabase secrets set AACSEARCH_URL=https://api.aacsearch.com
supabase secrets set AACSEARCH_TOKEN=ss_connector_xxx
supabase secrets set AACSEARCH_PROJECT_ID=org_xxx
```

Then in your Supabase Dashboard → Database → Webhooks, create a new webhook
triggering the `aacsearch-sync` function on INSERT/UPDATE/DELETE for your table.

## Configuration

| Option | Type | Description |
|--------|------|-------------|
| `aacsearch.baseUrl` | string | AACsearch API URL |
| `aacsearch.token` | string | Connector bearer token (`ss_connector_*`) |
| `aacsearch.projectId` | string | Your AACsearch organization/project ID |
| `supabase.url` | string | Supabase project URL |
| `supabase.apiKey` | string | Supabase anon or service_role key |
| `tables[].table` | string | Table name to subscribe to |
| `tables[].schema` | string? | Schema (default: `public`) |
| `tables[].idColumn` | string? | Primary key column (default: `id`) |
| `tables[].columns` | string[]? | Columns to include (default: all) |
| `tables[].mapper` | function? | Custom row-to-document transform |
| `tables[].filter` | string? | Realtime filter (e.g. `published=eq.true`) |
| `batchSize` | number? | Documents per API call (default: 50) |
| `debug` | boolean? | Enable verbose logging |

## API

### `createRealtimeSubscription(config, callbacks?)`

Creates a Supabase Realtime subscription. Returns a `RealtimeClient` instance.

**Callbacks:**

```typescript
const rtClient = createRealtimeSubscription(config, {
  onSync: (event) => {
    console.log(`Synced ${event.type} on ${event.table}`);
  },
  onError: (error, context) => {
    console.error(`Sync error on ${context?.table}:`, error);
  },
});
```

### `AacSearchClient`

Low-level client for the AACsearch Connector API.

```typescript
import { AacSearchClient } from "@aacsearch/supabase-sync";

const client = new AacSearchClient({ baseUrl, token, projectId });
await client.syncDocuments([{ external_id: "123", title: "Product" }]);
await client.deleteDocument("123");
```

### Utility mappers

```typescript
import { defaultMapper, pickColumns, flattenJsonColumn } from "@aacsearch/supabase-sync";

defaultMapper(row);                     // Safe map with serialization
pickColumns(row, ["name", "price"]);    // Pick specific columns
flattenJsonColumn(row, "metadata");     // Flatten JSON column into fields
```

## License

MIT
