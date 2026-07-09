import { describe, expect, test } from "bun:test";
import {
	formatProductCatalog,
	parseProductCatalog,
} from "@/lib/ai-shorts/catalog";

describe("product catalog helpers", () => {
	test("parses either a products wrapper or a bare product array", () => {
		const wrapped = parseProductCatalog(
			JSON.stringify({
				products: [
					{
						id: "p01",
						name: "モイストグロウ セラム",
						aliases: ["세럼"],
						price: "¥2,980",
						selling_points: ["塗った瞬間ツヤ肌"],
						tiktok_shop_note: "TikTok Shopの商品タグはp01を選択",
					},
				],
			}),
		);
		const bare = parseProductCatalog(JSON.stringify(wrapped));

		expect(wrapped).toEqual(bare);
		expect(wrapped[0].id).toBe("p01");
	});

	test("rejects products without safe ids or names", () => {
		expect(() =>
			parseProductCatalog(JSON.stringify([{ id: "P 01", name: "Bad" }])),
		).toThrow("product id");
		expect(() =>
			parseProductCatalog(JSON.stringify([{ id: "p01", name: "" }])),
		).toThrow("product name");
	});

	test("formats an editable catalog template", () => {
		const formatted = formatProductCatalog([
			{
				id: "p01",
				name: "美容液",
				aliases: [],
				price: "",
				selling_points: [],
				tiktok_shop_note: "",
			},
		]);

		expect(formatted).toContain('"products"');
		expect(formatted).toContain('"美容液"');
	});
});
