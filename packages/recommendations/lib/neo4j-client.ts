/**
 * Neo4j client wrapper for AACsearch Recommendations Engine.
 * Supports two modes: internal (shared Neo4j instance) and
 * customer BYO (bring your own Neo4j).
 *
 * Uses neo4j-driver with connection pooling and retry logic.
 */

import neo4j, {
	type Driver,
	type Session,
	type ManagedTransaction,
	type QueryResult,
} from "neo4j-driver";

// Global process declaration for Node.js env vars
declare const process: {
	env: Record<string, string | undefined>;
};

export interface Neo4jConfig {
	uri: string;
	username: string;
	password: string;
	maxConnectionPoolSize?: number;
	connectionTimeout?: number;
}

const DEFAULT_CONFIG: Partial<Neo4jConfig> = {
	maxConnectionPoolSize: 50,
	connectionTimeout: 10_000,
};

let internalDriver: Driver | null = null;

/**
 * Create a new Neo4j driver instance.
 */
export function createDriver(config: Neo4jConfig): Driver {
	const merged = { ...DEFAULT_CONFIG, ...config };
	return neo4j.driver(merged.uri, neo4j.auth.basic(merged.username, merged.password), {
		maxConnectionPoolSize: merged.maxConnectionPoolSize,
		connectionTimeout: merged.connectionTimeout,
	});
}

/**
 * Get the internal (shared) Neo4j driver.
 * Lazy-initialized from environment variables.
 */
export function getDriver(config?: Partial<Neo4jConfig>): Driver {
	if (internalDriver) return internalDriver;

	const uri = config?.uri ?? process.env.NEO4J_URI ?? "bolt://localhost:7687";
	const username = config?.username ?? process.env.NEO4J_USER ?? "neo4j";
	const password = config?.password ?? process.env.NEO4J_PASSWORD ?? "changeme_in_production";

	internalDriver = createDriver({ uri, username, password, ...config });
	return internalDriver;
}

/**
 * Create a customer-specific Neo4j driver (BYO mode).
 */
export function createCustomerDriver(config: Neo4jConfig): Driver {
	return createDriver(config);
}

/**
 * Execute a Cypher query and return records.
 * Handles session lifecycle (acquire → execute → close).
 */
export async function query(
	cypher: string,
	params: Record<string, unknown> = {},
	driver?: Driver,
): Promise<QueryResult> {
	const d = driver ?? getDriver();
	const session: Session = d.session();
	try {
		return await session.executeRead((tx: ManagedTransaction) => tx.run(cypher, params));
	} finally {
		await session.close();
	}
}

/**
 * Execute a write Cypher query transactionally.
 */
export async function executeWrite(
	cypher: string,
	params: Record<string, unknown> = {},
	driver?: Driver,
): Promise<QueryResult> {
	const d = driver ?? getDriver();
	const session: Session = d.session();
	try {
		return await session.executeWrite((tx: ManagedTransaction) => tx.run(cypher, params));
	} finally {
		await session.close();
	}
}

/**
 * Execute multiple Cypher statements in a single transaction.
 */
export async function executeTransaction(
	statements: Array<{ cypher: string; params?: Record<string, unknown> }>,
	driver?: Driver,
): Promise<QueryResult[]> {
	const d = driver ?? getDriver();
	const session: Session = d.session();
	try {
		return await session.executeWrite((tx) => {
			const results = statements.map((s) => tx.run(s.cypher, s.params ?? {}));
			return Promise.all(results);
		});
	} finally {
		await session.close();
	}
}

/**
 * Verify Neo4j connectivity and server version.
 */
export async function verifyConnection(driver?: Driver): Promise<{
	connected: boolean;
	version?: string;
	error?: string;
}> {
	try {
		const d = driver ?? getDriver();
		const result = await query(
			"CALL dbms.components() YIELD name, versions, edition RETURN name, versions, edition",
			{},
			d,
		);
		const record = result.records[0];
		if (record) {
			return {
				connected: true,
				version: `${record.get("name")} ${(record.get("versions") as string[])[0]}`,
			};
		}
		return { connected: true };
	} catch (err) {
		return {
			connected: false,
			error: err instanceof Error ? err.message : String(err),
		};
	}
}

/**
 * Close the internal driver and release resources.
 */
export async function closeDriver(driver?: Driver): Promise<void> {
	const d = driver ?? internalDriver;
	if (d) {
		await d.close();
		if (!driver) internalDriver = null;
	}
}

/**
 * Reset the internal driver (for testing / config changes).
 */
export function resetDriver(): void {
	if (internalDriver) {
		void internalDriver.close();
		internalDriver = null;
	}
}
