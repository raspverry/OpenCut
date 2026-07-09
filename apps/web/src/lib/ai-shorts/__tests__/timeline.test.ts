import { describe, expect, test } from "bun:test";
import { buildAiShortsInsertPlanFromSpec } from "@/lib/ai-shorts/timeline";
import type { CaptionCueFile, TimelineClip } from "@/lib/ai-shorts/types";
import type { MediaAsset } from "@/lib/media/types";

const baseClip: TimelineClip = {
	clip_id: "p01-c01",
	product_id: "p01",
	source_range_sec: [10, 30],
	timeline_start_sec: 0,
	score: 86,
	reason: "Clear product demonstration",
	hook_text: "ここがポイント",
	caption_file: "caption_cues/p01-c01.json",
	caption_style: "ja-shorts-safe-v1",
};

const cueFile: CaptionCueFile = {
	clip_id: "p01-c01",
	language: "ja",
	preset: "ja-shorts-safe-v1",
	source_range_sec: [10, 30],
	style: {
		format: "word_pop",
		font_family: "Noto Sans CJK JP",
		max_chars_per_line: 13,
		max_lines: 2,
		safe_area: { anchor: "bottom", margin_px: 640 },
	},
	cues: [
		{
			cue_id: "p01-c01-q001",
			source_segment_id: 0,
			start_sec: 10,
			end_sec: 13,
			text: "半顔だけ塗ってみます",
			words: [
				{ w: "半顔だけ", start: 11.7, end: 12.3, confidence: 0.94 },
				{ w: "塗ってみます", start: 12.3, end: 13, confidence: 0.94 },
			],
		},
		{
			cue_id: "p01-c01-q002",
			source_segment_id: 1,
			start_sec: 13,
			end_sec: 18,
			text: "このツヤがすぐ出ます",
			words: [],
		},
	],
};

const sourceAsset: MediaAsset = {
	id: "source-video",
	name: "source.mp4",
	type: "video",
	width: 1920,
	height: 1080,
	duration: 100,
	size: 1024,
	lastModified: 0,
	file: new File([], "source.mp4", { type: "video/mp4" }),
};

describe("buildAiShortsInsertPlanFromSpec", () => {
	test("maps a timeline spec source range to an editable OpenCut video element", () => {
		const plan = buildAiShortsInsertPlanFromSpec({
			clip: baseClip,
			sourceAsset,
			startTime: 5,
			includeText: true,
			captionCues: cueFile,
		});

		expect(plan.duration).toBe(20);
		expect(plan.sourceRange).toEqual([10, 30]);
		expect(plan.elements).toHaveLength(5);
		expect(plan.elements[0]).toMatchObject({
			type: "video",
			mediaId: "source-video",
			startTime: 5,
			duration: 20,
			trimStart: 10,
			trimEnd: 70,
			sourceDuration: 100,
			volume: 1,
			transform: {
				scaleX: 3.1604938271604937,
				scaleY: 3.1604938271604937,
			},
		});
	});

	test("creates caption text elements from cue timing instead of one baked caption", () => {
		const plan = buildAiShortsInsertPlanFromSpec({
			clip: baseClip,
			sourceAsset,
			startTime: 5,
			includeText: true,
			captionCues: cueFile,
		});

		expect(plan.elements[2]).toMatchObject({
			type: "text",
			name: "p01-c01-q001",
			content: "半顔だけ塗ってみます",
			startTime: 5,
			duration: 3,
			fontSize: 2.7,
			fontFamily: "Noto Sans CJK JP",
			wordTimings: [
				{
					word: "半顔だけ",
					startTime: 1.7,
					endTime: 2.3,
					confidence: 0.94,
				},
				{
					word: "塗ってみます",
					startTime: 2.3,
					endTime: 3,
					confidence: 0.94,
				},
			],
		});
		expect(plan.elements[3]).toMatchObject({
			type: "text",
			name: "p01-c01-q002",
			content: "このツヤがすぐ出ます",
			startTime: 8,
			duration: 5,
		});
	});

	test("adds an editable CTA text element at the end of the clip", () => {
		const plan = buildAiShortsInsertPlanFromSpec({
			clip: baseClip,
			sourceAsset,
			startTime: 5,
			includeText: true,
			captionCues: cueFile,
		});

		expect(plan.elements[4]).toMatchObject({
			type: "text",
			name: "p01-c01 cta",
			content: "TikTok Shopでチェック",
			startTime: 22,
			duration: 3,
			fontSize: 2.5,
			fontFamily: "Noto Sans JP",
		});
	});

	test("uses OpenCut text size units instead of pixel-sized subtitle values", () => {
		const plan = buildAiShortsInsertPlanFromSpec({
			clip: baseClip,
			sourceAsset,
			startTime: 0,
			includeText: true,
			captionCues: cueFile,
		});

		const textElements = plan.elements.filter(
			(element) => element.type === "text",
		);
		expect(textElements.map((element) => element.fontSize)).toEqual([
			3.2, 2.7, 2.7, 2.5,
		]);
	});

	test("can insert only the video element and keep captions user-controlled", () => {
		const plan = buildAiShortsInsertPlanFromSpec({
			clip: baseClip,
			sourceAsset,
			startTime: 0,
			includeText: false,
			captionCues: cueFile,
		});

		expect(plan.elements).toHaveLength(1);
		expect(plan.elements[0].type).toBe("video");
	});

	test("clamps timeline spec ranges to the imported media duration", () => {
		const plan = buildAiShortsInsertPlanFromSpec({
			clip: { ...baseClip, source_range_sec: [95, 140] },
			sourceAsset,
			startTime: 0,
			includeText: false,
			captionCues: cueFile,
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
