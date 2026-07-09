import { describe, expect, test } from "bun:test";
import { createSidecarClient } from "@/lib/ai-shorts/sidecar-client";

describe("createSidecarClient", () => {
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
