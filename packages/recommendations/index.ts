/**
 * @repo/recommendations — Neo4j graph infrastructure for recommendations engine.
 *
 * Provides:
 * - Neo4j driver (internal + BYO customer mode)
 * - Graph sync from Prisma to Neo4j
 * - Cypher queries for similarity, recommendations, trending
 * - Connection health checks and lifecycle management
 */

export {
	createDriver,
	getDriver,
	createCustomerDriver,
	query,
	executeWrite,
	executeTransaction,
	verifyConnection,
	closeDriver,
	resetDriver,
} from "./lib/neo4j-client";

export type { Neo4jConfig } from "./lib/neo4j-client";

export {
	syncProduct,
	syncProductsBatch,
	syncSimilarities,
	recordAlsoBought,
	fullCollectionSync,
	deleteProduct,
	removeStaleProducts,
} from "./lib/graph-sync";

export type { ProductInput, SimilarityInput } from "./lib/graph-sync";

export { getGraphRagRecommendations, getMultiSeedGraphRagRecommendations } from "./lib/graphrag";

export type { GraphRagInput, GraphRagResult, GraphRagMultiSeedResult } from "./lib/graphrag";

export * as CypherQueries from "./lib/queries.cypher";
