export interface AvailabilityResult {
	productId: string;
	available: boolean;
	stock?: number;
	deliveryDate?: string;
	pickupAvailable?: boolean;
	sizesAvailable?: string[];
}

export interface InventoryConnector {
	getAvailability(
		productId: string,
		size?: string,
		color?: string,
		region?: string,
	): Promise<AvailabilityResult>;
	getBulkAvailability(
		productIds: string[],
		region?: string,
	): Promise<Map<string, AvailabilityResult>>;
}

export class TypesenseInventoryConnector implements InventoryConnector {
	private readonly typesenseGetDoc: (
		indexSlug: string,
		docId: string,
	) => Promise<Record<string, unknown> | null>;
	private readonly indexSlug: string;

	constructor(
		indexSlug: string,
		typesenseGetDoc: (
			indexSlug: string,
			docId: string,
		) => Promise<Record<string, unknown> | null>,
	) {
		this.indexSlug = indexSlug;
		this.typesenseGetDoc = typesenseGetDoc;
	}

	async getAvailability(
		productId: string,
		size?: string,
		_color?: string,
		_region?: string,
	): Promise<AvailabilityResult> {
		const doc = await this.typesenseGetDoc(this.indexSlug, productId);
		if (!doc) return { productId, available: false };

		const stock = typeof doc.stock === "number" ? doc.stock : 0;
		const sizesAvailable = Array.isArray(doc.sizes_available)
			? (doc.sizes_available as string[])
			: undefined;
		const available = size ? (sizesAvailable?.includes(size) ?? stock > 0) : stock > 0;

		return {
			productId,
			available,
			stock,
			sizesAvailable,
			pickupAvailable:
				typeof doc.pickup_available === "boolean" ? doc.pickup_available : undefined,
		};
	}

	async getBulkAvailability(
		productIds: string[],
		region?: string,
	): Promise<Map<string, AvailabilityResult>> {
		const results = await Promise.all(
			productIds.map((id) => this.getAvailability(id, undefined, undefined, region)),
		);
		return new Map(results.map((r) => [r.productId, r]));
	}
}

export class MockInventoryConnector implements InventoryConnector {
	async getAvailability(
		productId: string,
		size?: string,
		_color?: string,
		_region?: string,
	): Promise<AvailabilityResult> {
		return {
			productId,
			available: true,
			stock: 5,
			deliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString(
				"ru-RU",
			),
			pickupAvailable: true,
			sizesAvailable: size ? [size, "M", "L", "XL"] : ["S", "M", "L", "XL"],
		};
	}

	async getBulkAvailability(
		productIds: string[],
		region?: string,
	): Promise<Map<string, AvailabilityResult>> {
		const results = await Promise.all(
			productIds.map((id) => this.getAvailability(id, undefined, undefined, region)),
		);
		return new Map(results.map((r) => [r.productId, r]));
	}
}
