import "server-only";
import { Client } from "typesense";

import { getTypesenseEnv } from "./env";

let cachedClient: Client | null = null;

export function getTypesenseClient(): Client {
	if (cachedClient) {
		return cachedClient;
	}

	const env = getTypesenseEnv();

	cachedClient = new Client({
		nodes: [
			{
				host: env.host,
				port: env.port,
				protocol: env.protocol,
			},
		],
		apiKey: env.adminApiKey,
		connectionTimeoutSeconds: 5,
		retryIntervalSeconds: 1,
		numRetries: 2,
	});

	return cachedClient;
}
