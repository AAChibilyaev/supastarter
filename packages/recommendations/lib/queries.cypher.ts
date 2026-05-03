/**
 * Cypher queries for the AACsearch Recommendations Engine.
 *
 * These queries use a graph model where:
 * - (:Product {id, collectionSlug, title, category, ...}) — searchable items
 * - (:User {id}) — identified users
 * - (:Session {id}) — anonymous session
 * - [:VIEWED {timestamp, duration}] — Product ← User/Session
 * - [:PURCHASED {timestamp, quantity, amount}] — Product ← User
 * - [:SIMILAR_TO {score}] — Product → Product (content-based similarity)
 * - [:ALSO_BOUGHT {score, count}] — Product → Product (collaborative)
 * - [:IN_CATEGORY] — Product → Category
 * - [:BELONGS_TO] — Product → Collection
 */

// ─── NODE CREATION ──────────────────────────────────────────────────────────

export const MERGE_PRODUCT = `
MERGE (p:Product {id: $id})
ON CREATE SET
    p.collectionSlug = $collectionSlug,
    p.title = $title,
    p.category = $category,
    p.createdAt = datetime()
ON MATCH SET
    p.title = $title,
    p.category = $category,
    p.updatedAt = datetime()
RETURN p
`;

export const MERGE_USER = `
MERGE (u:User {id: $id})
ON CREATE SET u.createdAt = datetime()
RETURN u
`;

export const MERGE_CATEGORY = `
MERGE (c:Category {name: $name, collectionSlug: $collectionSlug})
ON CREATE SET c.createdAt = datetime()
RETURN c
`;

export const LINK_PRODUCT_TO_CATEGORY = `
MATCH (p:Product {id: $productId})
MATCH (c:Category {name: $categoryName, collectionSlug: $collectionSlug})
MERGE (p)-[:IN_CATEGORY]->(c)
`;

export const LINK_PRODUCT_TO_COLLECTION = `
MATCH (p:Product {id: $productId})
MERGE (c:Collection {slug: $collectionSlug})
ON CREATE SET c.createdAt = datetime()
MERGE (p)-[:BELONGS_TO]->(c)
`;

// ─── VIEW / PURCHASE EVENTS ─────────────────────────────────────────────────

export const RECORD_VIEW = `
MATCH (p:Product {id: $productId})
WITH p
CALL {
    WITH p
    MATCH (u:User {id: $userId})
    MERGE (u)-[v:VIEWED]->(p)
    ON CREATE SET v.timestamp = datetime(), v.count = 1
    ON MATCH SET v.timestamp = datetime(), v.count = coalesce(v.count, 0) + 1
    RETURN v
}
RETURN p
`;

export const RECORD_PURCHASE = `
MATCH (p:Product {id: $productId})
MATCH (u:User {id: $userId})
MERGE (u)-[pur:PURCHASED]->(p)
ON CREATE SET
    pur.timestamp = datetime(),
    pur.quantity = $quantity,
    pur.amount = $amount
ON MATCH SET
    pur.timestamp = datetime(),
    pur.quantity = coalesce(pur.quantity, 0) + $quantity,
    pur.amount = coalesce(pur.amount, 0) + $amount
RETURN pur
`;

// ─── SIMILARITY EDGES ───────────────────────────────────────────────────────

export const MERGE_SIMILAR = `
MATCH (a:Product {id: $productIdA})
MATCH (b:Product {id: $productIdB})
MERGE (a)-[r:SIMILAR_TO {type: $similarityType}]->(b)
ON CREATE SET r.score = $score, r.updatedAt = datetime()
ON MATCH SET r.score = $score, r.updatedAt = datetime()
RETURN r
`;

export const MERGE_ALSO_BOUGHT = `
MATCH (a:Product {id: $productIdA})
MATCH (b:Product {id: $productIdB})
MERGE (a)-[r:ALSO_BOUGHT]->(b)
ON CREATE SET r.count = 1, r.score = 1.0
ON MATCH SET r.count = coalesce(r.count, 0) + 1, r.score = 1.0 / coalesce(r.count, 1)
RETURN r
`;

// ─── RECOMMENDATION QUERIES ─────────────────────────────────────────────────

/**
 * Similar products by content-based SIMILAR_TO edges.
 */
export const SIMILAR_PRODUCTS = `
MATCH (p:Product {id: $productId})-[r:SIMILAR_TO]->(similar:Product)
WHERE similar.id <> $productId
RETURN similar.id AS id, similar.title AS title, r.score AS score, r.type AS similarityType
ORDER BY r.score DESC
LIMIT $limit
`;

/**
 * Also-bought products (collaborative filtering).
 */
export const ALSO_BOUGHT_PRODUCTS = `
MATCH (u:User)-[:PURCHASED]->(:Product {id: $productId})
MATCH (u)-[:PURCHASED]->(also:Product)
WHERE also.id <> $productId
RETURN also.id AS id, also.title AS title, count(*) AS cooccurrence
ORDER BY cooccurrence DESC
LIMIT $limit
`;

/**
 * Personalized recommendations for a user.
 */
export const PERSONALIZED_RECOMMENDATIONS = `
MATCH (u:User {id: $userId})-[:VIEWED|PURCHASED]->(p:Product)
MATCH (p)-[:SIMILAR_TO]->(rec:Product)
WHERE NOT EXISTS {
    MATCH (u)-[:VIEWED|PURCHASED]->(rec)
}
RETURN rec.id AS id, rec.title AS title, avg(coalesce(p.score, 1.0)) AS score, count(*) AS reasonCount
ORDER BY score DESC, reasonCount DESC
LIMIT $limit
`;

/**
 * Trending products (most viewed/purchased in time window).
 */
export const TRENDING_PRODUCTS = `
MATCH (u:User)-[r:VIEWED|PURCHASED]->(p:Product)
WHERE r.timestamp >= datetime() - duration($window)
RETURN p.id AS id, p.title AS title, count(*) AS activityCount
ORDER BY activityCount DESC
LIMIT $limit
`;

/**
 * Frequently bought together.
 */
export const FREQUENTLY_BOUGHT_TOGETHER = `
MATCH (u:User)-[:PURCHASED]->(:Product {id: $productId})
MATCH (u)-[:PURCHASED]->(fbt:Product)
WHERE fbt.id <> $productId
RETURN fbt.id AS id, fbt.title AS title, count(*) AS cooccurrence
ORDER BY cooccurrence DESC
LIMIT $limit
`;

/**
 * Also-viewed products (view-based collaborative).
 */
export const ALSO_VIEWED_PRODUCTS = `
MATCH (u:User)-[:VIEWED]->(:Product {id: $productId})
MATCH (u)-[:VIEWED]->(av:Product)
WHERE av.id <> $productId
RETURN av.id AS id, av.title AS title, count(*) AS cooccurrence
ORDER BY cooccurrence DESC
LIMIT $limit
`;

/**
 * Products in the same category, filtered by similarity.
 */
export const CATEGORY_RECOMMENDATIONS = `
MATCH (p:Product {id: $productId})-[:IN_CATEGORY]->(c:Category)<-[:IN_CATEGORY]-(related:Product)
WHERE related.id <> $productId
OPTIONAL MATCH (p)-[s:SIMILAR_TO]-(related)
RETURN related.id AS id, related.title AS title, coalesce(s.score, 0.5) AS score
ORDER BY score DESC
LIMIT $limit
`;

// ─── BULK OPERATIONS ────────────────────────────────────────────────────────

/**
 * Delete all nodes and edges for a collection.
 */
export const DELETE_COLLECTION = `
MATCH (p:Product {collectionSlug: $collectionSlug})
DETACH DELETE p
`;

/**
 * Get graph statistics for a collection.
 */
export const COLLECTION_STATS = `
MATCH (p:Product {collectionSlug: $collectionSlug})
OPTIONAL MATCH (p)-[r]->()
RETURN
    count(DISTINCT p) AS productCount,
    count(DISTINCT r) AS edgeCount
`;

/**
 * Remove stale products (not updated in N days).
 */
export const REMOVE_STALE_PRODUCTS = `
MATCH (p:Product)
WHERE p.updatedAt < datetime() - duration($staleAge)
DETACH DELETE p
`;

// ─── GRAPHRAG QUERIES ──────────────────────────────────────────────────────────

/**
 * Full graph neighborhood for a product — used by GraphRAG to build
 * enriched context for LLM-powered recommendations.
 * Returns: similar products, also-bought, category mates, product details.
 */
export const GRAPH_RAG_CONTEXT = `
MATCH (p:Product {id: $productId})
OPTIONAL MATCH (p)-[sim:SIMILAR_TO]->(similar:Product)
OPTIONAL MATCH (p)-[:IN_CATEGORY]->(c:Category)<-[:IN_CATEGORY]-(categoryMate:Product)
  WHERE categoryMate.id <> $productId
OPTIONAL MATCH (p)<-[ab:ALSO_BOUGHT]-(alsoBought:Product)
WITH p, c, similar, categoryMate, alsoBought,
     collect(DISTINCT {id: similar.id, title: similar.title, score: sim.score, type: sim.type, relation: "similar"}) AS similarList,
     collect(DISTINCT {id: categoryMate.id, title: categoryMate.title, relation: "same_category"}) AS sameCategoryList,
     collect(DISTINCT {id: alsoBought.id, title: alsoBought.title, score: ab.score, relation: "also_bought"}) AS alsoBoughtList
RETURN
    p.id AS productId,
    p.title AS title,
    p.category AS category,
    labels(p) AS labels,
    [sim IN similarList WHERE sim.id IS NOT NULL | sim] AS similarProducts,
    [catMate IN sameCategoryList WHERE catMate.id IS NOT NULL | catMate] AS sameCategory,
    [abItem IN alsoBoughtList WHERE abItem.id IS NOT NULL | abItem] AS alsoBought
`;

/**
 * Cross-product graph context for multiple product seeds.
 * Used when GraphRAG is seeded from multiple products (e.g. user's viewed history).
 */
export const GRAPH_RAG_MULTI_SEED = `
MATCH (p:Product)
WHERE p.id IN $productIds
OPTIONAL MATCH (p)-[sim:SIMILAR_TO]->(similar:Product)
  WHERE NOT similar.id IN $productIds
OPTIONAL MATCH (p)-[:IN_CATEGORY]->(c:Category)<-[:IN_CATEGORY]-(catMate:Product)
  WHERE NOT catMate.id IN $productIds
OPTIONAL MATCH (p)<-[ab:ALSO_BOUGHT]-(alsoBought:Product)
  WHERE NOT alsoBought.id IN $productIds
WITH p, similar, c, catMate, alsoBought
RETURN
    p.id AS seedProductId,
    p.title AS seedTitle,
    collect(DISTINCT {id: similar.id, title: similar.title, score: sim.score, relation: "similar"}) +
    collect(DISTINCT {id: catMate.id, title: catMate.title, relation: "same_category"}) +
    collect(DISTINCT {id: alsoBought.id, title: alsoBought.title, score: ab.score, relation: "also_bought"})
  AS recommendations
LIMIT 100
`;
