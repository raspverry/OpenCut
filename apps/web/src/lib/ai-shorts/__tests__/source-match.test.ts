import { describe, expect, test } from "bun:test";
import { sourceMatchesTimelineSpec } from "@/lib/ai-shorts/source-match";
import type { MediaAsset } from "@/lib/media/types";
import type { TimelineSpec } from "@/lib/ai-shorts/types";

const sourceAsset: MediaAsset = {
	id: "source",
	name: "source.mp4",
	type: "video",
	duration: 4201.1,
	size: 1024,
	lastModified: 0,
	file: new File([], "source.mp4", { type: "video/mp4" }),
};

const timelineSpec: TimelineSpec = {
	session_id: "s01",
	renderer: "opencut",
	language: "ja",
	source_video: {
		file: "raw/recording.mp4",
		duration_sec: 4201.2,
	},
	fingerprint:
		"sha256:1111111111111111111111111111111111111111111111111111111111111111",
	clips: [],
};

describe("sourceMatchesTimelineSpec", () => {
	test("accepts the imported source when durations match within tolerance", () => {
		expect(
			sourceMatchesTimelineSpec({
				sourceAsset,
				timelineSpec,
			}),
		).toBe(true);
	});

	test("rejects a short smoke clip for a long live recording spec", () => {
		expect(
			sourceMatchesTimelineSpec({
				sourceAsset: { ...sourceAsset, duration: 61 },
				timelineSpec,
			}),
		).toBe(false);
	});

	test("allows assets without duration metadata so OpenCut can still try", () => {
		expect(
			sourceMatchesTimelineSpec({
				sourceAsset: { ...sourceAsset, duration: undefined },
				timelineSpec,
			}),
		).toBe(true);
	});
});
