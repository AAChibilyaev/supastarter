# @aacsearch/firebase-sync

Firebase/Firestore real-time sync connector for AACsearch Engine.

Sync Firestore collections to AACsearch in real-time using Firebase Cloud Functions.

## Installation

```bash
npm install @aacsearch/firebase-sync
```

## Two deployment options

### Option 1: Cloud Function (recommended)

Create `functions/index.ts` in your Firebase project:

```typescript
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { createFirestoreSyncHandler } from "@aacsearch/firebase-sync";

const config = {
  aacsearch: {
    baseUrl: process.env.AACSEARCH_URL!,
    token: process.env.AACSEARCH_TOKEN!,
    projectId: process.env.AACSEARCH_PROJECT_ID!,
  },
  collectionPath: "products",
  indexSlug: "products",
  fieldMapping: {
    name: "title",
    description: "body",
    price: "price",
  },
};

export const syncProducts = onDocumentWritten(
  "products/{docId}",
  createFirestoreSyncHandler(config)
);
```

Deploy:

```bash
firebase deploy --only functions
```

### Option 2: Firebase Extension

Package as a Firebase Extension for one-click install from the Firebase Console:

```bash
firebase ext:install . --project=<project-id>
```

Or publish to the Firebase Extensions marketplace.

## CLI for initial sync

First-time full sync of existing documents:

```bash
# Create a config file
cat > firebase-config.json <<EOF
{
  "aacsearch": {
    "baseUrl": "https://api.aacsearch.com",
    "token": "ss_connector_xxx",
    "projectId": "org_xxx"
  },
  "collections": [
    {
      "collectionPath": "products",
      "indexSlug": "products",
      "fieldMapping": { "name": "title", "price": "price" }
    },
    {
      "collectionPath": "categories",
      "indexSlug": "categories"
    }
  ]
}
EOF

# Run initial sync
npx aacsearch-firebase-sync index --config=firebase-config.json
```

## Field mapping

Control how Firestore fields map to AACsearch fields:

```typescript
const config = {
  collectionPath: "products",
  indexSlug: "products_index",
  fieldMapping: {
    name: "title",
    "details.description": "body",
    "pricing.usd": "price",
  },
};
```

## Document transformation

Custom transform for complex logic:

```typescript
const config = {
  collectionPath: "users",
  indexSlug: "users",
  transform: (doc, docId) => ({
    id: docId,
    full_name: `${doc.first_name} ${doc.last_name}`,
    email: doc.email,
    is_active: doc.status === "active",
    created_at: doc.created_at?.toDate?.()?.toISOString() ?? doc.created_at,
  }),
};
```

## Extension parameters

When installed as a Firebase Extension, configure via:

| Parameter | Description |
|-----------|-------------|
| COLLECTION_PATH | Firestore collection path to watch |
| AACSEARCH_URL | Your AACsearch instance URL |
| AACSEARCH_TOKEN | Connector API token (secret) |
| AACSEARCH_PROJECT_ID | AACsearch organization ID |
| INDEX_SLUG | Target index slug |
| FIELD_MAPPING | Optional JSON field mapping |
| LOCATION | Cloud Functions region |

## License

MIT
