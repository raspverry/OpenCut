import { describe, expect, test } from "bun:test";
import {
	buildFullSubtitleTrackSnapshot,
	sourceMatchesFullSubtitleCues,
} from "@/lib/ai-shorts/full-subtitles";
import type { CaptionCueFile } from "@/lib/ai-shorts/types";
import type { MediaAsset } from "@/lib/media/types";
import type { CreateTimelineElement, TimelineTrack } from "@/lib/timeline";

const sourceAsset: MediaAsset = {
	id: "source-video",
	name: "source.mp4",
	type: "video",
	width: 1280,
	height: 720,
	duration: 4201.19,
	size: 1024,
	lastModified: 0,
	file: new File([], "source.mp4", { type: "video/mp4" }),
};

const cueFile: CaptionCueFile = {
	clip_id: "full-ja",
	language: "ja",
	preset: "ja-shorts-safe-v1",
	source_range_sec: [0, 4201.2],
	source_video: {
		file: "raw/recording.mp4",
		duration_sec: 4201.2,
		width: 1280,
		height: 720,
		orientation: "horizontal",
	},
	fingerprint: `sha256:${"1".repeat(64)}`,
	style: {
		format: "word_pop",
		font_family: "Noto Sans CJK JP",
		max_chars_per_line: 13,
		max_lines: 2,
		safe_area: { anchor: "bottom", margin_px: 640 },
	},
	cues: [
		{
			cue_id: "full-ja-q001",
			source_segment_id: 1,
			start_sec: 43.54,
			end_sec: 45,
			text: "今日やってみた後、",
			words: [],
		},
	],
};

const videoElement: CreateTimelineElement = {
	type: "video",
	mediaId: "source-video",
	name: "source.mp4 full source",
	startTime: 0,
	duration: 4201.19,
	trimStart: 0,
	trimEnd: 0,
	sourceDuration: 4201.19,
	muted: false,
	hidden: false,
	transform: { scaleX: 1, scaleY: 1, position: { x: 0, y: 0 }, rotate: 0 },
	opacity: 1,
	blendMode: "normal",
	volume: 1,
};

const textElement: CreateTimelineElement = {
	type: "text",
	name: "full-ja-q001",
	content: "今日やってみた後、",
	startTime: 43.54,
	duration: 1.46,
	trimStart: 0,
	trimEnd: 0,
	fontSize: 4.8,
	fontFamily: "Noto Sans CJK JP",
	color: "#ffffff",
	background: { enabled: true, color: "rgba(0, 0, 0, 0.64)" },
	textAlign: "center",
	fontWeight: "bold",
	fontStyle: "normal",
	textDecoration: "none",
	letterSpacing: 0,
	lineHeight: 1.16,
	transform: { scaleX: 1, scaleY: 1, position: { x: 0, y: 245 }, rotate: 0 },
	opacity: 1,
	blendMode: "normal",
};

describe("sourceMatchesFullSubtitleCues", () => {
	test("accepts the original source duration within probe tolerance", () => {
		expect(
			sourceMatchesFullSubtitleCues({ sourceAsset, captionCues: cueFile }),
		).toBe(true);
	});

	test("rejects a different video duration", () => {
		expect(
			sourceMatchesFullSubtitleCues({
				sourceAsset: { ...sourceAsset, duration: 72.5 },
				captionCues: cueFile,
			}),
		).toBe(false);
	});

	test("rejects a different source resolution when cue metadata is present", () => {
		expect(
			sourceMatchesFullSubtitleCues({
				sourceAsset: { ...sourceAsset, width: 1920, height: 1080 },
				captionCues: cueFile,
			}),
		).toBe(false);
	});

	test("falls back to duration matching for legacy cue files without source metadata", () => {
		const {
			source_video: _sourceVideo,
			fingerprint: _fingerprint,
			...legacyCueFile
		} = cueFile;

		expect(
			sourceMatchesFullSubtitleCues({
				sourceAsset: { ...sourceAsset, width: 1920, height: 1080 },
				captionCues: legacyCueFile,
			}),
		).toBe(true);
	});
});

describe("buildFullSubtitleTrackSnapshot", () => {
	test("replaces existing full subtitle tracks instead of duplicating source audio/video", () => {
		const existingTracks: TimelineTrack[] = [
			{
				id: "old-subtitles",
				name: "full-ja subtitles",
				type: "text",
				hidden: false,
				elements: [{ ...textElement, id: "old-text" }],
			},
			{
				id: "old-source",
				name: "full-ja source",
				type: "video",
				hidden: false,
				muted: false,
				isMain: false,
				elements: [{ ...videoElement, id: "old-video" }],
			},
			{
				id: "manual-track",
				name: "Manual overlay",
				type: "text",
				hidden: false,
				elements: [],
			},
		];

		const tracks = buildFullSubtitleTrackSnapshot({
			beforeTracks: existingTracks,
			elements: [videoElement, textElement],
			clipId: "full-ja",
		});

		expect(tracks.map((track) => track.name)).toEqual([
			"full-ja subtitles",
			"full-ja source",
			"Manual overlay",
		]);
		expect(
			tracks.filter((track) => track.name === "full-ja source"),
		).toHaveLength(1);
		expect(tracks[1].elements[0].id).not.toBe("old-video");
	});
});
