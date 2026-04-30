import "server-only";

interface TypesenseEnv {
	host: string;
	port: number;
	protocol: "http" | "https";
	adminApiKey: string;
}

let cached: TypesenseEnv | null = null;

export function getTypesenseEnv(): TypesenseEnv {
	if (cached) {
		return cached;
	}

	const host = process.env.TYPESENSE_HOST;
	const adminApiKey = process.env.TYPESENSE_ADMIN_API_KEY;

	if (!host) {
		throw new Error("TYPESENSE_HOST is not set");
	}
	if (!adminApiKey) {
		throw new Error("TYPESENSE_ADMIN_API_KEY is not set");
	}

	const protocolRaw = (process.env.TYPESENSE_PROTOCOL ?? "http").toLowerCase();
	if (protocolRaw !== "http" && protocolRaw !== "https") {
		throw new Error("TYPESENSE_PROTOCOL must be 'http' or 'https'");
	}

	const portRaw = process.env.TYPESENSE_PORT ?? (protocolRaw === "https" ? "443" : "8108");
	const port = Number.parseInt(portRaw, 10);
	if (!Number.isFinite(port)) {
		throw new Error("TYPESENSE_PORT must be a number");
	}

	cached = { host, port, protocol: protocolRaw, adminApiKey };
	return cached;
}
