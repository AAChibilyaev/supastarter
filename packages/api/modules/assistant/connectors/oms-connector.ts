export interface OrderStatus {
	orderId: string;
	status: string;
	lastUpdate: string;
	estimatedDelivery?: string;
	trackingUrl?: string;
	items: Array<{
		productId: string;
		title: string;
		quantity: number;
		price: number;
	}>;
}

export interface ReturnStatus {
	returnId: string;
	orderId: string;
	status: string;
	amount?: number;
	estimatedDate?: string;
	instructions?: string;
}

export interface OrderSummary {
	orderId: string;
	status: string;
	createdAt: string;
	totalAmount: number;
}

export interface OmsConnector {
	getOrderStatus(orderId: string, userId: string): Promise<OrderStatus | null>;
	getReturnStatus(returnId: string, userId: string): Promise<ReturnStatus | null>;
	getOrderHistory(userId: string, limit: number): Promise<OrderSummary[]>;
}

/** Mock connector for pilot/testing. Returns realistic-looking fake data. */
export class MockOmsConnector implements OmsConnector {
	async getOrderStatus(orderId: string, _userId: string): Promise<OrderStatus | null> {
		return {
			orderId,
			status: "in_transit",
			lastUpdate: new Date().toISOString(),
			estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString("ru-RU"),
			trackingUrl: `https://example.com/track/${orderId}`,
			items: [{ productId: "mock-product-1", title: "Тестовый товар", quantity: 1, price: 4990 }],
		};
	}

	async getReturnStatus(returnId: string, _userId: string): Promise<ReturnStatus | null> {
		return {
			returnId,
			orderId: "mock-order-123",
			status: "processing",
			amount: 4990,
			estimatedDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString("ru-RU"),
			instructions: "Возврат будет зачислен на вашу карту в течение 5 рабочих дней.",
		};
	}

	async getOrderHistory(_userId: string, limit: number): Promise<OrderSummary[]> {
		return Array.from({ length: Math.min(limit, 3) }, (_, i) => ({
			orderId: `mock-order-${i + 1}`,
			status: i === 0 ? "in_transit" : "delivered",
			createdAt: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString(),
			totalAmount: 4990 + i * 1000,
		}));
	}
}

export interface HttpOmsConfig {
	baseUrl: string;
	apiKey: string;
	timeoutMs?: number;
}

/** HTTP connector for production OMS integration. */
export class HttpOmsConnector implements OmsConnector {
	private readonly config: Required<HttpOmsConfig>;

	constructor(config: HttpOmsConfig) {
		this.config = { timeoutMs: 3000, ...config };
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

	async getOrderStatus(orderId: string, userId: string): Promise<OrderStatus | null> {
		return this.fetch<OrderStatus>(`/orders/${orderId}?userId=${encodeURIComponent(userId)}`);
	}

	async getReturnStatus(returnId: string, userId: string): Promise<ReturnStatus | null> {
		return this.fetch<ReturnStatus>(`/returns/${returnId}?userId=${encodeURIComponent(userId)}`);
	}

	async getOrderHistory(userId: string, limit: number): Promise<OrderSummary[]> {
		return (await this.fetch<OrderSummary[]>(`/users/${encodeURIComponent(userId)}/orders?limit=${limit}`)) ?? [];
	}
}
