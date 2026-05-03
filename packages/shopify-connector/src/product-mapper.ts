/**
 * Shopify → AACsearch document mapper.
 *
 * Converts Shopify Product + Variant objects into the standard AACsearch
 * product document schema used by all CMS connectors.
 *
 * Strategy: flatten each variant into a separate AACsearch document so
 * that users can search by SKU, price, inventory, etc. at the variant level.
 * The parent product's metadata (title, description, images, categories) is
 * repeated on each variant document for searchability.
 */
import type { ShopifyImage, ShopifyOption, ShopifyProduct, ShopifyVariant } from "./client";

// ─── Document schema ─────────────────────────────────────────

export interface AacSearchProductDocument {
	external_id: string;
	title: string;
	description: string;
	sku: string;
	brand: string;
	categories: string[];
	category_ids: string[];
	tags: string[];
	price: number;
	sale_price: number;
	currency: string;
	image_url: string;
	product_url: string;
	availability: "in_stock" | "out_of_stock" | "preorder";
	stock_quantity: number;
	attributes: Record<string, unknown>;
	locale: string;
	created_at: number;
	updated_at: number;
}

// ─── Option combination helpers ─────────────────────────────

interface VariantOptionMap {
	[name: string]: string;
}

function buildOptionMap(product: ShopifyProduct, variant: ShopifyVariant): VariantOptionMap {
	const map: VariantOptionMap = {};
	if (!product.options) return map;

	for (const option of product.options) {
		const key = option.name.toLowerCase().replace(/\s+/g, "_");
		const value = variant[`option${option.position}` as keyof ShopifyVariant];
		if (value !== undefined) {
			map[key] = String(value);
		}
	}
	return map;
}

// ─── Image URL extractor ────────────────────────────────────

function getPrimaryImageUrl(images: ShopifyImage[], variant?: ShopifyVariant): string {
	if (variant?.image_id) {
		const variantImage = images.find((img) => img.id === variant.image_id);
		if (variantImage?.src) return variantImage.src;
	}
	return images[0]?.src ?? "";
}

// ─── Product URL builder ────────────────────────────────────

function buildProductUrl(shop: string, handle: string): string {
	const cleanShop = shop.replace(/^https?:\/\//, "").replace(/\/$/, "");
	return `https://${cleanShop}/products/${handle}`;
}

// ─── Status mapping ─────────────────────────────────────────

type StockStatus = "in_stock" | "out_of_stock" | "preorder";

function mapAvailability(product: ShopifyProduct, variant: ShopifyVariant): StockStatus {
	if (variant.inventory_management === null) {
		return "in_stock";
	}
	if (variant.inventory_quantity > 0) {
		return "in_stock";
	}
	if (product.status === "active" && variant.inventory_quantity <= 0) {
		return "out_of_stock";
	}
	return "out_of_stock";
}

// ─── Main mapper ────────────────────────────────────────────

/**
 * Flatten a Shopify product into AACsearch documents — one per variant.
 */
export function flattenProductToDocuments(
	product: ShopifyProduct,
	shop: string,
	vendorMetadata?: Record<string, unknown>,
): AacSearchProductDocument[] {
	const now = Math.floor(Date.now() / 1000);
	const createdAt = product.created_at
		? Math.floor(new Date(product.created_at).getTime() / 1000)
		: now;
	const updatedAt = product.updated_at
		? Math.floor(new Date(product.updated_at).getTime() / 1000)
		: now;

	const variants: ShopifyVariant[] =
		product.variants.length > 0
			? product.variants
			: [
					{
						id: product.id,
						product_id: product.id,
						title: "Default",
						sku: "",
						price: "0.00",
						inventory_quantity: 0,
						inventory_item_id: undefined,
						requires_shipping: undefined,
						taxable: undefined,
						barcode: undefined,
						weight: undefined,
						weight_unit: undefined,
						created_at: product.created_at,
						updated_at: product.updated_at,
					} as ShopifyVariant,
				];

	return variants.map((variant) => {
		const optionMap = buildOptionMap(product, variant);
		const imageUrl = getPrimaryImageUrl(product.images ?? [], variant);
		const productUrl = buildProductUrl(shop, product.handle ?? "");
		const stockQty = variant.inventory_quantity ?? -1;
		const compareAtPrice = variant.compare_at_price
			? Number.parseFloat(variant.compare_at_price)
			: undefined;

		const attributes: Record<string, unknown> = {
			shopify_product_id: String(product.id),
			shopify_variant_id: String(variant.id),
			product_type: product.product_type ?? "",
			vendor: product.vendor ?? "",
			handle: product.handle ?? "",
			status: product.status ?? "active",
			...optionMap,
			...(vendorMetadata ?? {}),
		};

		if (variant.barcode) attributes.barcode = variant.barcode;
		if (variant.weight !== undefined) {
			attributes.weight = variant.weight;
			attributes.weight_unit = variant.weight_unit ?? "kg";
		}
		if (variant.requires_shipping !== undefined) {
			attributes.requires_shipping = variant.requires_shipping;
		}
		if (variant.taxable !== undefined) {
			attributes.taxable = variant.taxable;
		}

		const price = Number.parseFloat(variant.price);
		const salePrice = compareAtPrice ?? price;

		const categories: string[] = [];
		if (product.product_type) {
			categories.push(product.product_type);
		}

		if (product.images && product.images.length > 1) {
			attributes.all_images = product.images.map((img) => img.src);
		}

		const allSkus = product.variants.map((v) => v.sku).filter((s): s is string => Boolean(s));
		if (allSkus.length > 1) {
			attributes.all_variant_skus = allSkus;
		}

		return {
			external_id: `shopify_${product.id}_v${variant.id}`,
			title:
				variant.title === "Default" ? product.title : `${product.title} - ${variant.title}`,
			description: product.body_html?.replace(/<[^>]*>/g, "") ?? "",
			sku: variant.sku ?? "",
			brand: product.vendor ?? "",
			categories,
			category_ids: [],
			tags: product.tags
				? product.tags
						.split(",")
						.map((t: string) => t.trim())
						.filter(Boolean)
				: [],
			price,
			sale_price: salePrice,
			currency: "USD",
			image_url: imageUrl,
			product_url: productUrl,
			availability: mapAvailability(product, variant),
			stock_quantity: stockQty,
			attributes,
			locale: "en",
			created_at: createdAt,
			updated_at: updatedAt,
		};
	});
}

/**
 * Convert a flattened AACsearch document back to a Shopify-style product
 * reference for deletion or identification.
 */
export function documentToExternalId(variantId: number, productId: number): string {
	return `shopify_${productId}_v${variantId}`;
}

/**
 * Parse a Shopify external_id back into product and variant IDs.
 */
export function parseExternalId(
	externalId: string,
): { productId: number; variantId: number } | null {
	const match = externalId.match(/^shopify_(\d+)_v(\d+)$/);
	if (!match) return null;
	return {
		productId: Number.parseInt(match[1], 10),
		variantId: Number.parseInt(match[2], 10),
	};
}
