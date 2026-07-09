import { describe, expect, test } from "bun:test";
import { buildAiShortsInsertPlan } from "@/lib/ai-shorts/timeline";
import type { CandidateClip } from "@/lib/ai-shorts/types";
import type { MediaAsset } from "@/lib/media/types";

const baseClip: CandidateClip = {
	clip_id: "p01-c01",
	product_id: null,
	start_sec: 10,
	end_sec: 30,
	segment_range: [0, 1],
	score: 86,
	reason: "Clear product demonstration",
	hook_text: "ここがポイント",
	caption: "自然な日本語字幕",
	transcript_preview: "source transcript",
	hashtags: ["#test"],
};

const sourceAsset: MediaAsset = {
	id: "source-video",
	name: "source.mp4",
	type: "video",
	duration: 100,
	size: 1024,
	lastModified: 0,
	file: new File([], "source.mp4", { type: "video/mp4" }),
};

describe("buildAiShortsInsertPlan", () => {
	test("maps a sidecar source range to an editable OpenCut video element", () => {
		const plan = buildAiShortsInsertPlan({
			clip: baseClip,
			sourceAsset,
			startTime: 5,
			includeText: true,
		});

		expect(plan.duration).toBe(20);
		expect(plan.sourceRange).toEqual([10, 30]);
		expect(plan.elements).toHaveLength(3);
		expect(plan.elements[0]).toMatchObject({
			type: "video",
			mediaId: "source-video",
			startTime: 5,
			duration: 20,
			trimStart: 10,
			trimEnd: 70,
			sourceDuration: 100,
			volume: 1,
		});
	});

	test("can insert only the video element and keep captions user-controlled", () => {
		const plan = buildAiShortsInsertPlan({
			clip: baseClip,
			sourceAsset,
			startTime: 0,
			includeText: false,
		});

		expect(plan.elements).toHaveLength(1);
		expect(plan.elements[0].type).toBe("video");
	});

	test("clamps candidate ranges to the imported media duration", () => {
		const plan = buildAiShortsInsertPlan({
			clip: { ...baseClip, start_sec: 95, end_sec: 140 },
			sourceAsset,
			startTime: 0,
			includeText: false,
		});

		expect(plan.duration).toBe(5);
		expect(plan.sourceRange).toEqual([95, 100]);
		expect(plan.elements[0]).toMatchObject({
			trimStart: 95,
			trimEnd: 0,
			sourceDuration: 100,
		});
	});
});
