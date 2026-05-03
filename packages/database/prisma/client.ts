import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "./generated/client";

const prismaClientSingleton = () => {
	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL is not set");
	}

	const adapter = new PrismaPg({
		connectionString: process.env.DATABASE_URL,
	});

	return new PrismaClient({ adapter });
};

declare global {
	var prisma: PrismaClient | undefined;
}

let prismaModuleCache: PrismaClient | undefined;

function getPrisma(): PrismaClient {
	if (globalThis.prisma) {
		return globalThis.prisma;
	}
	if (prismaModuleCache) {
		return prismaModuleCache;
	}
	const client = prismaClientSingleton();
	prismaModuleCache = client;
	if (process.env.NODE_ENV !== "production") {
		globalThis.prisma = client;
	}
	return client;
}

/**
 * Lazy proxy so importing `@repo/database` does not connect or throw until the first query.
 * Call sites that require a database must still set `DATABASE_URL` before any Prisma use.
 */
export const db: PrismaClient = new Proxy({} as PrismaClient, {
	get(_target, prop, receiver) {
		if (prop === "then" || prop === "catch" || prop === "finally") {
			return undefined;
		}
		return Reflect.get(getPrisma() as object, prop, receiver);
	},
});
