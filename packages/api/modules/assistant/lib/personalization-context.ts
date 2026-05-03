import { logger } from "@repo/logs";

export interface PersonalizationContext {
	userId?: string;
	sessionId: string;
	segment?: "new" | "regular" | "vip" | "churned";
	bonusBalance?: number;
	availablePromos?: Array<{
		code: string;
		description: string;
		discount: number;
		validUntil?: string;
	}>;
	personalDiscountsByCategory?: Record<string, number>;
	installmentAvailable?: boolean;
	purchaseHistory?: string[];
	viewHistory?: string[];
	region?: string;
	preferredBrands?: string[];
	sizePreferences?: Record<string, string>;
}

export interface PersonalizationConnectors {
	getUserConditions?: (userId: string) => Promise<Partial<PersonalizationContext>>;
	getPurchaseHistory?: (userId: string, limit: number) => Promise<string[]>;
	getViewHistory?: (userId: string, limit: number) => Promise<string[]>;
}

const CONTEXT_BUILD_TIMEOUT_MS = 500;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
	const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), ms));
	return Promise.race([promise, timeout]);
}

/**
 * Builds personalization context at session start. Called once, result cached in conversation metadata.
 * Uses parallel fetching with 500ms timeout — never blocks the first response.
 */
export async function buildPersonalizationContext(
	sessionId: string,
	userId: string | undefined,
	region?: string,
	connectors?: PersonalizationConnectors,
): Promise<PersonalizationContext> {
	const base: PersonalizationContext = { sessionId, region };

	if (!userId || !connectors) {
		return base;
	}

	try {
		const [conditions, purchaseHistory, viewHistory] = await Promise.all([
			connectors.getUserConditions
				? withTimeout(connectors.getUserConditions(userId), CONTEXT_BUILD_TIMEOUT_MS)
				: Promise.resolve(null),
			connectors.getPurchaseHistory
				? withTimeout(connectors.getPurchaseHistory(userId, 20), CONTEXT_BUILD_TIMEOUT_MS)
				: Promise.resolve(null),
			connectors.getViewHistory
				? withTimeout(connectors.getViewHistory(userId, 10), CONTEXT_BUILD_TIMEOUT_MS)
				: Promise.resolve(null),
		]);

		return {
			...base,
			userId,
			...(conditions ?? {}),
			purchaseHistory: purchaseHistory ?? undefined,
			viewHistory: viewHistory ?? undefined,
		};
	} catch (err) {
		logger.warn({ err, userId }, "Failed to build personalization context, using base");
		return { ...base, userId };
	}
}

/**
 * Injects personalization filters into Typesense search parameters.
 */
export function injectPersonalizationIntoSearch(
	params: Record<string, unknown>,
	context: PersonalizationContext,
): Record<string, unknown> {
	const result = { ...params };

	// Region filter for availability
	if (context.region) {
		const existing = typeof result.filter_by === "string" && result.filter_by ? result.filter_by : "";
		result.filter_by = existing
			? `${existing} && region:=[${context.region},all]`
			: `region:=[${context.region},all]`;
	}

	// VIP segment gets different sort priority
	if (context.segment === "vip") {
		result.sort_by = result.sort_by ?? "popularity:desc,price:asc";
	}

	return result;
}
