# @aacsearch/strapi-plugin

Strapi v5 plugin for AACsearch — sync your Strapi content to AACsearch Engine in real-time.

## Features

- **Automatic sync** — Lifecycle hooks (`afterCreate`, `afterUpdate`, `afterDelete`) sync changes to AACsearch
- **Admin panel** — Configure connection, manage content type mappings, manual reindex
- **Field mapping** — Choose which Strapi fields to index, rename fields
- **Manual reindex** — One-click reindex of all entries for any content type
- **Connection testing** — Validate your AACsearch configuration

## Installation

```bash
npm install @aacsearch/strapi-plugin
```

## Configuration

1. Go to **Settings → AACsearch Sync** in your Strapi admin panel
2. Enter your **AACsearch API URL** (e.g., `https://api.aacsearch.com`)
3. Enter your **Connector Token** (`ss_connector_...`)
4. Click **Test Connection** to verify
5. Add content types you want to sync and set their **Index Slug**
6. Click **Save**

## Usage

Once configured, the plugin automatically:

- Creates/updates AACsearch documents when you **create or update** Strapi entries
- Deletes AACsearch documents when you **delete** Strapi entries
- Provides a **Reindex** button per content type to re-sync all entries

## Field mapping

For advanced field mapping, configure in your Strapi config:

```javascript
// config/plugins.js or config/plugins.ts
module.exports = {
	aacsearch: {
		enabled: true,
		config: {
			baseUrl: process.env.AACSEARCH_URL,
			token: process.env.AACSEARCH_TOKEN,
			collections: {
				"api::product.product": {
					indexSlug: "products",
					fieldMapping: {
						name: "title",
						description: "body",
						price: "price",
					},
					excludeFields: ["createdBy", "updatedBy"],
				},
				"api::category.category": {
					indexSlug: "categories",
				},
			},
		},
	},
};
```

## API

The plugin exposes these admin API endpoints:

| Endpoint                             | Method | Description                      |
| ------------------------------------ | ------ | -------------------------------- |
| `/aacsearch/get-config`              | GET    | Get current plugin configuration |
| `/aacsearch/update-config`           | POST   | Update plugin configuration      |
| `/aacsearch/test-connection`         | GET    | Test AACsearch connection        |
| `/aacsearch/reindex/:contentTypeUid` | POST   | Full reindex of a content type   |

## Development

```bash
cd packages/strapi-plugin
pnpm install
pnpm build
```

Symlink or copy to your Strapi project:

```bash
# In your Strapi project
npm link @aacsearch/strapi-plugin
# Or install from local path
npm install /path/to/packages/strapi-plugin
```

## License

MIT
