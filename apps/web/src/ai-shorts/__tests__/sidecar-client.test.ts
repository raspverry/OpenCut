import { describe, expect, it } from "bun:test";
import {
	analyzeAiShortsSession,
	draftAiShortsOpenCutExportManifest,
	uploadAiShortsOpenCutExportArtifact,
	verifyAiShortsOpenCutExportManifest,
} from "../sidecar-client";

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
			Response.json(
				{ detail: "analyze 실패: OPENAI_API_KEY 없음" },
				{ status: 400 },
			);

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

describe("OpenCut export sidecar calls", () => {
	it("uploads browser-rendered mp4 bytes to the selected clip artifact", async () => {
		const requests: Array<{ url: string; init?: RequestInit }> = [];
		const fetcher: typeof fetch = async (...args) => {
			const [url, init] = args;
			requests.push({ url: String(url), init });
			const body = init?.body;
			if (!(body instanceof Blob)) {
				throw new Error("Expected mp4 upload body");
			}
			expect(Array.from(new Uint8Array(await body.arrayBuffer()))).toEqual([
				1, 2, 3,
			]);
			return Response.json(
				{
					session_id: "20260708-sale",
					clip_id: "p01-c01",
					video_file: "final/p01-c01.mp4",
					byte_size: 3,
				},
				{ status: 201 },
			);
		};

		const response = await uploadAiShortsOpenCutExportArtifact({
			baseUrl: "http://127.0.0.1:8789",
			sessionId: "20260708-sale",
			clipId: "p01-c01",
			buffer: new Uint8Array([1, 2, 3]).buffer,
			fetcher,
		});

		expect(response.video_file).toBe("final/p01-c01.mp4");
		expect(response.byte_size).toBe(3);
		expect(requests[0].url).toBe(
			"http://127.0.0.1:8789/api/sessions/20260708-sale/qa/opencut-export/artifacts/p01-c01",
		);
		expect(requests[0].init?.method).toBe("POST");
		expect(requests[0].init?.headers).toEqual({
			"Content-Type": "video/mp4",
		});
	});

	it("drafts and verifies an OpenCut export manifest", async () => {
		const requests: Array<{ url: string; init?: RequestInit }> = [];
		const manifest = {
			session_id: "20260708-sale",
			exported_at: "2026-07-08T00:00:00Z",
			fingerprint: "sha256:abc",
			clips: [{ clip_id: "p01-c01", video_file: "final/p01-c01.mp4" }],
		};
		const fetcher: typeof fetch = async (...args) => {
			const [url, init] = args;
			requests.push({ url: String(url), init });
			if (String(url).endsWith("/manifest/draft")) {
				return Response.json({ manifest, missing_files: [] });
			}
			return Response.json({
				session_id: "20260708-sale",
				clip_count: 1,
				total_duration_sec: 18,
				by_product: { p01: 1 },
			});
		};

		const draft = await draftAiShortsOpenCutExportManifest({
			baseUrl: "http://127.0.0.1:8789",
			sessionId: "20260708-sale",
			clipIds: ["p01-c01"],
			fetcher,
		});
		const qa = await verifyAiShortsOpenCutExportManifest({
			baseUrl: "http://127.0.0.1:8789",
			sessionId: "20260708-sale",
			manifest: draft.manifest,
			fetcher,
		});

		expect(draft.missing_files).toEqual([]);
		expect(qa.by_product).toEqual({ p01: 1 });
		expect(JSON.parse(String(requests[0].init?.body))).toEqual({
			clip_ids: ["p01-c01"],
		});
		expect(JSON.parse(String(requests[1].init?.body))).toEqual(manifest);
	});
});
