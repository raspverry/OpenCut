import { describe, expect, it } from "bun:test";
import { analyzeAiShortsSession } from "../sidecar-client";

describe("analyzeAiShortsSession", () => {
	it("posts provider and language choices to the sidecar", async () => {
		const requests: Array<{ url: string; init?: RequestInit }> = [];
		const fetcher: typeof fetch = async (...args) => {
			const [url, init] = args;
			requests.push({ url: String(url), init });
			return Response.json({
				session_id: "20260708-sale",
				provider: "openai",
				source_language: "zh",
				language: "ja",
				max_clip_sec: 30,
				candidates: {
					clips: [{ clip_id: "p01-c01" }, { clip_id: "p02-c01" }],
				},
			});
		};

		const response = await analyzeAiShortsSession({
			baseUrl: "http://127.0.0.1:8789",
			sessionId: "20260708-sale",
			fetcher,
			request: {
				provider: "openai",
				source_language: "zh",
				language: "ja",
				max_clip_sec: 30,
				max_clips: 12,
				force: true,
			},
		});

		expect(response.clip_count).toBe(2);
		expect(requests[0].url).toBe(
			"http://127.0.0.1:8789/api/sessions/20260708-sale/analyze",
		);
		expect(requests[0].init?.method).toBe("POST");
		expect(JSON.parse(String(requests[0].init?.body))).toEqual({
			provider: "openai",
			source_language: "zh",
			language: "ja",
			max_clip_sec: 30,
			max_clips: 12,
			force: true,
		});
	});

	it("throws sidecar error details", async () => {
		const fetcher = async () =>
			Response.json({ detail: "analyze 실패: OPENAI_API_KEY 없음" }, { status: 400 });

		await expect(
			analyzeAiShortsSession({
				baseUrl: "http://127.0.0.1:8789",
				sessionId: "20260708-sale",
				fetcher,
				request: {
					provider: "openai",
					source_language: "zh",
					language: "ja",
					max_clip_sec: 30,
					force: false,
				},
			}),
		).rejects.toThrow("OPENAI_API_KEY");
	});
});
