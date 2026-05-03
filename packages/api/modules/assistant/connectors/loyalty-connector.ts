import { type PersonalizationContext } from "../lib/personalization-context";

export type UserConditions = Pick<
	PersonalizationContext,
	| "segment"
	| "bonusBalance"
	| "availablePromos"
	| "personalDiscountsByCategory"
	| "installmentAvailable"
	| "preferredBrands"
	| "sizePreferences"
>;

export interface LoyaltyConnector {
	getUserConditions(
		userId: string,
		context?: { productId?: string; categoryId?: string },
	): Promise<UserConditions>;
	getPurchaseHistory(userId: string, limit: number): Promise<string[]>;
	getViewHistory(userId: string, limit: number): Promise<string[]>;
}

export class MockLoyaltyConnector implements LoyaltyConnector {
	async getUserConditions(
		_userId: string,
		_context?: { productId?: string; categoryId?: string },
	): Promise<UserConditions> {
		return {
			segment: "regular",
			bonusBalance: 1250,
			availablePromos: [
				{
					code: "SPORT10",
					description: "Скидка 10% на спортивную одежду",
					discount: 10,
					validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(
						"ru-RU",
					),
				},
			],
			personalDiscountsByCategory: {},
			installmentAvailable: true,
			preferredBrands: [],
			sizePreferences: {},
		};
	}

	async getPurchaseHistory(_userId: string, limit: number): Promise<string[]> {
		return Array.from({ length: Math.min(limit, 3) }, (_, i) => `mock-product-${i + 1}`);
	}

	async getViewHistory(_userId: string, limit: number): Promise<string[]> {
		return Array.from({ length: Math.min(limit, 5) }, (_, i) => `mock-product-view-${i + 1}`);
	}
}

export interface HttpLoyaltyConfig {
	baseUrl: string;
	apiKey: string;
	timeoutMs?: number;
}

export class HttpLoyaltyConnector implements LoyaltyConnector {
	private readonly config: Required<HttpLoyaltyConfig>;

	constructor(config: HttpLoyaltyConfig) {
		this.config = { timeoutMs: 500, ...config };
	}

	private async fetch<T>(path: string): Promise<T | null> {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
		try {
			const res = await fetch(`${this.config.baseUrl}${path}`, {
				headers: { Authorization: `Bearer ${this.config.apiKey}` },
				signal: controller.signal,
			});
			if (!res.ok) return null;
			return (await res.json()) as T;
		} catch {
			return null;
		} finally {
			clearTimeout(timeout);
		}
	}

	async getUserConditions(
		userId: string,
		context?: { productId?: string; categoryId?: string },
	): Promise<UserConditions> {
		const params = new URLSearchParams();
		if (context?.productId) params.set("productId", context.productId);
		if (context?.categoryId) params.set("categoryId", context.categoryId);
		return (
			(await this.fetch<UserConditions>(
				`/users/${encodeURIComponent(userId)}/conditions?${params.toString()}`,
			)) ?? {
				segment: "new",
				installmentAvailable: false,
			}
		);
	}

	async getPurchaseHistory(userId: string, limit: number): Promise<string[]> {
		return (
			(await this.fetch<string[]>(
				`/users/${encodeURIComponent(userId)}/purchases?limit=${limit}`,
			)) ?? []
		);
	}

	async getViewHistory(userId: string, limit: number): Promise<string[]> {
		return (
			(await this.fetch<string[]>(
				`/users/${encodeURIComponent(userId)}/views?limit=${limit}`,
			)) ?? []
		);
	}
}
