// Seed script using raw SQL to avoid Prisma v7 client issues in CLI context
const { Pool } = require("pg");

const pool = new Pool({
	connectionString:
		process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/supastarter",
});

const seedItems = [
	{
		key: "searchCore",
		title: "Search core v0.x",
		description:
			"Single-doc upsert, multi-search, browser SDK, scoped tokens, origin allow-list, rate-limit, quota, zero-downtime reindex, DB-first ingest.",
		status: "shipped",
		quarter: "Q1 2026",
		iconName: "CheckCircleIcon",
		voteCount: 142,
		sortOrder: 1,
		changelogSlug: "search-core-v0",
	},
	{
		key: "marketing",
		title: "Marketing site v0.5",
		description:
			"Public marketing site with pricing, features, integrations, use cases, case studies, blog, changelog, About page, and legal pages.",
		status: "shipped",
		quarter: "Q2 2026",
		iconName: "MegaphoneIcon",
		voteCount: 68,
		sortOrder: 2,
		changelogSlug: "marketing-site-v05",
	},
	{
		key: "connectors",
		title: "CMS connectors R2",
		description:
			"PrestaShop 8.x and 1C-Bitrix modules. Connector API for custom integrations. Event-driven product export with full catalog support.",
		status: "shipped",
		quarter: "Q2 2026",
		iconName: "LinkIcon",
		voteCount: 95,
		sortOrder: 3,
		changelogSlug: "connectors-r2",
	},
	{
		key: "knowledge",
		title: "Knowledge module R2.5",
		description:
			"RAG and GraphRAG over documents. 9 oRPC procedures covering upload, indexing, search, graph exploration, and ingestion scheduling.",
		status: "shipped",
		quarter: "Q2 2026",
		iconName: "BrainCircuitIcon",
		voteCount: 127,
		sortOrder: 4,
		changelogSlug: "knowledge-r25",
	},
	{
		key: "metering",
		title: "Search-units metering v0.6",
		description:
			"Tochka wallet top-up, per-plan search-unit billing, overage limits, usage dashboard, promo codes, and automated payment retries.",
		status: "inProgress",
		quarter: "Q2 2026",
		iconName: "GaugeIcon",
		voteCount: 89,
		sortOrder: 5,
		changelogSlug: null,
	},
	{
		key: "billing",
		title: "Billing & payments",
		description:
			"Stripe subscriptions, customer portal, invoices, metered billing, usage-based pricing, and multi-currency support.",
		status: "shipped",
		quarter: "Q1 2026",
		iconName: "CreditCardIcon",
		voteCount: 73,
		sortOrder: 6,
		changelogSlug: "billing-payments",
	},
	{
		key: "analytics",
		title: "Analytics & dashboards",
		description:
			"Real-time query analytics, usage metrics, failed query monitoring, popularity-based ranking, and customizable dashboards.",
		status: "inProgress",
		quarter: "Q2 2026",
		iconName: "BarChart3Icon",
		voteCount: 81,
		sortOrder: 7,
		changelogSlug: null,
	},
	{
		key: "aiNlp",
		title: "NLP & AI search",
		description:
			"Spell correction, intent detection, AI query rewriting, synonym expansion, and natural language query parser.",
		status: "planned",
		quarter: "Q3 2026",
		iconName: "SparklesIcon",
		voteCount: 112,
		sortOrder: 9,
		changelogSlug: null,
	},
	{
		key: "docs",
		title: "Public docs site v0.7",
		description:
			"Full documentation site with API reference, quick-start guides, migration guides, and interactive playground.",
		status: "planned",
		quarter: "Q3 2026",
		iconName: "BookOpenIcon",
		voteCount: 113,
		sortOrder: 10,
		changelogSlug: null,
	},
	{
		key: "selfHost",
		title: "Enterprise deployment v1.0",
		description:
			"Dedicated cluster deployment, custom data residency, SOC 2 compliance reports, SLA guarantees, and priority support.",
		status: "planned",
		quarter: "Q3 2026",
		iconName: "CloudIcon",
		voteCount: 156,
		sortOrder: 11,
		changelogSlug: null,
	},
	{
		key: "vectorSearch",
		title: "Vector & hybrid search",
		description:
			"Semantic search via OpenAI embeddings. Hybrid BM25 + vector ranking. Multi-modal document indexing and cross-encoder re-ranking.",
		status: "shipped",
		quarter: "Q2 2026",
		iconName: "SearchIcon",
		voteCount: 78,
		sortOrder: 12,
		changelogSlug: "vector-hybrid-search",
	},
	{
		key: "widget",
		title: "Widget & embed SDK",
		description:
			"Drop-in search widget with Cmd+K modal, floating button, custom theme engine, and React/Vanilla SDK. Visual Builder with Configurator, Filters, Autocomplete, and Install tabs.",
		status: "shipped",
		quarter: "Q2 2026",
		iconName: "MonitorIcon",
		voteCount: 64,
		sortOrder: 8,
		changelogSlug: "widget-builder-v1",
	},
	{
		key: "shopify",
		title: "Shopify Integration",
		description:
			"Full Shopify app with product & variant sync, inventory tracking, real-time webhooks via Google Pub/Sub, multi-store support, and dashboard UI with connector settings.",
		status: "shipped",
		quarter: "Q2 2026",
		iconName: "LinkIcon",
		voteCount: 95,
		sortOrder: 13,
		changelogSlug: "shopify-integration",
	},
	{
		key: "embeddingProviders",
		title: "Azure & GCP Embedding Providers",
		description:
			"Azure OpenAI and GCP Vertex AI embedding providers alongside existing OpenAI support. OpenAI-compatible API provider for custom endpoints. Configurable via dashboard settings.",
		status: "shipped",
		quarter: "Q2 2026",
		iconName: "CloudIcon",
		voteCount: 67,
		sortOrder: 14,
		changelogSlug: "embedding-providers",
	},
	{
		key: "searchConfigurator",
		title: "Search Configurator",
		description:
			"Visual wizard for configuring search collections, schema fields, ranking settings, and facet configuration. Widget Builder with Configurator, Filters, Install, and Autocomplete tabs.",
		status: "shipped",
		quarter: "Q2 2026",
		iconName: "MonitorIcon",
		voteCount: 72,
		sortOrder: 15,
		changelogSlug: "search-configurator",
	},
	{
		key: "upgradeFlows",
		title: "Upgrade & Downgrade Flows",
		description:
			"Streamlined plan upgrade modal with proration preview and plan comparison table. Downgrade flow with data loss warnings and confirmation dialog.",
		status: "shipped",
		quarter: "Q2 2026",
		iconName: "CreditCardIcon",
		voteCount: 58,
		sortOrder: 16,
		changelogSlug: "upgrade-downgrade",
	},
];

async function main() {
	console.log("Seeding roadmap items...");

	const client = await pool.connect();
	try {
		for (const item of seedItems) {
			const id = require("crypto").randomUUID();
			await client.query(
				`INSERT INTO roadmap_item (id, key, title, description, status, quarter, "iconName", "voteCount", "sortOrder", "changelogSlug", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5::"RoadmapItemStatus", $6, $7, $8, $9, $10, NOW(), NOW())
         ON CONFLICT (key) DO UPDATE SET
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           status = EXCLUDED.status,
           quarter = EXCLUDED.quarter,
           "iconName" = EXCLUDED."iconName",
           "voteCount" = EXCLUDED."voteCount",
           "sortOrder" = EXCLUDED."sortOrder",
           "changelogSlug" = EXCLUDED."changelogSlug",
           "updatedAt" = NOW()`,
				[
					id,
					item.key,
					item.title,
					item.description,
					item.status,
					item.quarter,
					item.iconName,
					item.voteCount,
					item.sortOrder,
					item.changelogSlug,
				],
			);
			console.log(`  ✓ ${item.key}`);
		}
		console.log("Seeding complete.");
	} finally {
		client.release();
		await pool.end();
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
