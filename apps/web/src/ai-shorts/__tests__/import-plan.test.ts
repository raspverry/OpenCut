import { describe, expect, it, mock } from "bun:test";
import type { MediaAsset } from "@/media/types";
import type { AiShortsCaptionCueFile, AiShortsTimelineSpec } from "../types";

mock.module("opencut-wasm", () => ({
	TICKS_PER_SECOND: () => 1000,
	mediaTimeFromSeconds: ({ seconds }: { seconds: number }) => toTicks(seconds),
	mediaTimeToSeconds: ({ time }: { time: number }) => time / 1000,
	lastFrameTime: ({ duration }: { duration: number }) => duration,
	parseTimecode: () => 0,
	roundToFrame: ({ time }: { time: number }) => Math.round(time),
	snappedSeekTime: ({ time }: { time: number }) => Math.round(time),
}));

const { AI_SHORTS_CANVAS_SIZE, buildAiShortsImportPlan } =
	await import("../import-plan");

function toTicks(seconds: number): number {
	return Math.round(seconds * 1000);
}

const sourceAsset: MediaAsset = {
	id: "media-1",
	name: "live.mp4",
	type: "video",
	file: new File([], "live.mp4", { type: "video/mp4" }),
	duration: 120,
	width: 1280,
	height: 720,
	hasAudio: true,
};

const spec: AiShortsTimelineSpec = {
	session_id: "20260708-sale",
	renderer: "opencut",
	language: "ja",
	source_video: {
		file: "raw/recording.mp4",
		duration_sec: 120,
	},
	fingerprint: "sha256:test",
	clips: [
		{
			clip_id: "p01-c01",
			product_id: "p01",
			source_range_sec: [10, 28],
			timeline_start_sec: 0,
			hook_text: "このツヤ見て",
			caption_file: "caption_cues/p01-c01.json",
			caption_style: "ja-shorts-safe-v1",
			score: 90,
			reason: "demo",
		},
		{
			clip_id: "p02-c01",
			product_id: "p02",
			source_range_sec: [54.1, 74.86],
			timeline_start_sec: 18,
			hook_text: "泡が出るクリーム？",
			caption_file: "caption_cues/p02-c01.json",
			caption_style: "ja-shorts-safe-v1",
			score: 86,
			reason: "demo",
		},
	],
};

function captionFile({
	clipId,
	sourceRange,
	text,
	startSec,
	endSec,
}: {
	clipId: string;
	sourceRange: [number, number];
	text: string;
	startSec: number;
	endSec: number;
}): AiShortsCaptionCueFile {
	return {
		clip_id: clipId,
		language: "ja",
		preset: "ja-shorts-safe-v1",
		source_range_sec: sourceRange,
		cues: [
			{
				cue_id: `${clipId}-q001`,
				source_segment_id: 0,
				start_sec: startSec,
				end_sec: endSec,
				text,
				words: [],
			},
		],
		style: {
			format: "word_pop",
			font_family: "Noto Sans CJK JP",
			max_chars_per_line: 13,
			max_lines: 2,
			safe_area: {
				anchor: "bottom",
				margin_px: 640,
			},
		},
	};
}

describe("buildAiShortsImportPlan", () => {
	it("maps sidecar clips to trimmed vertical OpenCut video elements", () => {
		const plan = buildAiShortsImportPlan({
			spec,
			sourceAsset,
			captionsByClipId: new Map([
				[
					"p01-c01",
					captionFile({
						clipId: "p01-c01",
						sourceRange: [10, 28],
						text: "このツヤ見て",
						startSec: 10,
						endSec: 12,
					}),
				],
				[
					"p02-c01",
					captionFile({
						clipId: "p02-c01",
						sourceRange: [54.1, 74.86],
						text: "泡クリーム、手にも",
						startSec: 60.8,
						endSec: 66.8,
					}),
				],
			]),
		});

		expect(plan.sessionId).toBe("20260708-sale");
		expect(plan.canvasSize).toEqual(AI_SHORTS_CANVAS_SIZE);
		expect(plan.videoElements).toHaveLength(2);
		expect(plan.videoElements[0].element.mediaId).toBe("media-1");
		expect(plan.videoElements[0].element.duration).toBe(toTicks(18));
		expect(plan.videoElements[0].element.trimStart).toBe(toTicks(10));
		expect(plan.videoElements[0].element.trimEnd).toBe(toTicks(92));
		expect(
			plan.videoElements[0].element.params["transform.scaleX"],
		).toBeCloseTo(1920 / 720);
	});

	it("converts absolute caption cue times into OpenCut timeline times", () => {
		const plan = buildAiShortsImportPlan({
			spec,
			sourceAsset,
			captionsByClipId: new Map([
				[
					"p01-c01",
					captionFile({
						clipId: "p01-c01",
						sourceRange: [10, 28],
						text: "このツヤ見て",
						startSec: 10,
						endSec: 12,
					}),
				],
				[
					"p02-c01",
					captionFile({
						clipId: "p02-c01",
						sourceRange: [54.1, 74.86],
						text: "泡クリーム、手にも",
						startSec: 60.8,
						endSec: 66.8,
					}),
				],
			]),
		});

		expect(plan.captions).toHaveLength(2);
		expect(plan.captions[0]).toMatchObject({
			text: "このツヤ見て",
			startTime: 0,
			duration: 2,
		});
		expect(plan.captions[1].text).toBe("泡クリーム、手にも");
		expect(plan.captions[1].startTime).toBeCloseTo(24.7);
		expect(plan.captions[1].duration).toBeCloseTo(6);
		expect(plan.captions[1].style?.fontFamily).toBe("Noto Sans CJK JP");
		expect(plan.captions[1].style?.placement?.marginVerticalRatio).toBeCloseTo(
			640 / 1920,
		);
	});

	it("fails when a clip has no caption cues", () => {
		expect(() =>
			buildAiShortsImportPlan({
				spec,
				sourceAsset,
				captionsByClipId: new Map(),
			}),
		).toThrow("Missing caption cues for p01-c01");
	});
});
