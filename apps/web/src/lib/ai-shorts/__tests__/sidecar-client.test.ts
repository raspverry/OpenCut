import { describe, expect, test } from "bun:test";
import { createSidecarClient } from "@/lib/ai-shorts/sidecar-client";

describe("createSidecarClient", () => {
	test("creates a sidecar session from an OpenCut slug", async () => {
		const calls: Array<{ url: string; init?: RequestInit }> = [];
		const client = createSidecarClient({
			baseUrl: "http://sidecar.test",
			fetcher: async (input, init) => {
				calls.push({ url: String(input), init });
				return Response.json(
					{
						session_id: "20260709-launch-live",
						path: "/data/sessions/20260709-launch-live",
					},
					{ status: 201 },
				);
			},
		});

		const result = await client.createSession("launch-live");

		expect(result.session_id).toBe("20260709-launch-live");
		expect(calls).toHaveLength(1);
		expect(calls[0].url).toBe("http://sidecar.test/api/sessions");
		expect(calls[0].init?.method).toBe("POST");
		expect(calls[0].init?.body).toBe(JSON.stringify({ slug: "launch-live" }));
	});

	test("loads a sidecar session config", async () => {
		const requests: string[] = [];
		const client = createSidecarClient({
			baseUrl: "http://sidecar.test",
			fetcher: async (input) => {
				requests.push(String(input));
				return Response.json({
					session_id: "s01",
					title: "Live",
					language: "ja",
					source_language: "ko",
					recorded_at: "2026-07-09",
					products: [],
					defaults: {},
				});
			},
		});

		const result = await client.getSessionConfig("s01");

		expect(result.language).toBe("ja");
		expect(requests).toEqual(["http://sidecar.test/api/sessions/s01/config"]);
	});

	test("updates products through the sidecar catalog endpoint", async () => {
		const calls: Array<{ url: string; init?: RequestInit }> = [];
		const products = [
			{
				id: "p01",
				name: "モイストグロウ セラム",
				aliases: ["세럼"],
				price: "¥2,980",
				selling_points: ["塗った瞬間ツヤ肌"],
				tiktok_shop_note: "TikTok Shopの商品タグはp01を選択",
			},
		];
		const client = createSidecarClient({
			baseUrl: "http://sidecar.test",
			fetcher: async (input, init) => {
				calls.push({ url: String(input), init });
				return Response.json({
					session_id: "s01",
					title: "",
					language: "ja",
					source_language: null,
					recorded_at: "",
					products,
					defaults: {},
				});
			},
		});

		const result = await client.updateProducts("s01", products);

		expect(result.products).toEqual(products);
		expect(calls[0].url).toBe("http://sidecar.test/api/sessions/s01/products");
		expect(calls[0].init?.method).toBe("PUT");
		expect(calls[0].init?.body).toBe(JSON.stringify({ products }));
	});

	test("uploads the selected OpenCut source video to ingest", async () => {
		const calls: Array<{ url: string; init?: RequestInit }> = [];
		const file = new File(["video"], "live recording.mp4", {
			type: "video/mp4",
		});
		const client = createSidecarClient({
			baseUrl: "http://sidecar.test",
			fetcher: async (input, init) => {
				calls.push({ url: String(input), init });
				return Response.json({
					session_id: "s01",
					probe: {
						duration_sec: 3600,
						width: 1080,
						height: 1920,
						orientation: "vertical",
					},
				});
			},
		});

		const result = await client.ingestSourceVideo("s01", file, { force: true });
		const headers = calls[0].init?.headers as Record<string, string>;

		expect(result.probe.orientation).toBe("vertical");
		expect(calls[0].url).toBe(
			"http://sidecar.test/api/sessions/s01/ingest?force=true",
		);
		expect(calls[0].init?.method).toBe("POST");
		expect(calls[0].init?.body).toBe(file);
		expect(headers["content-type"]).toBe("video/mp4");
		expect(headers["x-filename"]).toBe("live recording.mp4");
	});

	test("loads timeline spec through the OpenCut contract endpoint", async () => {
		const requests: string[] = [];
		const client = createSidecarClient({
			baseUrl: "http://sidecar.test/",
			fetcher: async (input) => {
				requests.push(String(input));
				return Response.json({
					session_id: "s01",
					renderer: "opencut",
					language: "ja",
					source_video: { file: "raw/recording.mp4", duration_sec: 60 },
					fingerprint:
						"sha256:1111111111111111111111111111111111111111111111111111111111111111",
					clips: [],
				});
			},
		});

		const result = await client.getTimelineSpec("session/id");

		expect(result.renderer).toBe("opencut");
		expect(requests).toEqual([
			"http://sidecar.test/api/sessions/session%2Fid/timeline-spec",
		]);
	});

	test("loads caption cues by clip id", async () => {
		const requests: string[] = [];
		const client = createSidecarClient({
			baseUrl: "http://sidecar.test",
			fetcher: async (input) => {
				requests.push(String(input));
				return Response.json({
					clip_id: "p01-c01",
					language: "ja",
					preset: "ja-shorts-safe-v1",
					source_range_sec: [10, 20],
					cues: [],
					style: {
						format: "word_pop",
						font_family: "Noto Sans CJK JP",
						max_chars_per_line: 13,
						max_lines: 2,
						safe_area: { anchor: "bottom", margin_px: 640 },
					},
				});
			},
		});

		const result = await client.getCaptionCues("s01", "p01/c01");

		expect(result.clip_id).toBe("p01-c01");
		expect(requests).toEqual([
			"http://sidecar.test/api/sessions/s01/caption-cues/p01%2Fc01",
		]);
	});
});
