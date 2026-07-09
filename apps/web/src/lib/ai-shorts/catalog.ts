import type { Product } from "./types";

const PRODUCT_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export function parseProductCatalog(text: string): Product[] {
	const data = parseCatalogJson(text);
	const products = Array.isArray(data)
		? data
		: isRecord(data) && Array.isArray(data.products)
			? data.products
			: null;

	if (!products) {
		throw new Error("product catalog must be a JSON array or { products: [...] }");
	}

	return products.map(normalizeProduct);
}

export function formatProductCatalog(products: Product[]): string {
	return JSON.stringify({ products }, null, 2);
}

function parseCatalogJson(text: string): unknown {
	const trimmed = text.trim();
	if (!trimmed) return { products: [] };
	try {
		return JSON.parse(trimmed);
	} catch {
		throw new Error("product catalog JSON is invalid");
	}
}

function normalizeProduct(value: unknown, index: number): Product {
	if (!isRecord(value)) {
		throw new Error(`product ${index + 1} must be an object`);
	}

	const id = stringValue(value.id).trim();
	if (!PRODUCT_ID_PATTERN.test(id)) {
		throw new Error(
			"product id must start with lowercase alphanumeric and contain only lowercase letters, numbers, or hyphens",
		);
	}

	const name = stringValue(value.name).trim();
	if (!name) {
		throw new Error("product name is required");
	}

	return {
		id,
		name,
		aliases: stringArray(value.aliases),
		price: stringValue(value.price),
		selling_points: stringArray(value.selling_points),
		tiktok_shop_note: stringValue(value.tiktok_shop_note),
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object";
}

function stringValue(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function stringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.filter((item): item is string => typeof item === "string");
}
