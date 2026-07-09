import type { MediaAsset } from "@/lib/media/types";
import type { CreateTimelineElement, CreateVideoElement } from "@/lib/timeline";
import { DEFAULTS } from "@/lib/timeline/defaults";
import { buildTextElement } from "@/lib/timeline/element-utils";
import type { CaptionCueFile, TimelineClip } from "./types";

const MIN_CLIP_SECONDS = 0.1;

export type AiShortsInsertPlan = {
	elements: CreateTimelineElement[];
	duration: number;
	sourceRange: [number, number];
};

export function buildAiShortsInsertPlanFromSpec({
	clip,
	sourceAsset,
	startTime,
	includeText,
	captionCues,
}: {
	clip: TimelineClip;
	sourceAsset: MediaAsset;
	startTime: number;
	includeText: boolean;
	captionCues?: CaptionCueFile | null;
}): AiShortsInsertPlan {
	const sourceDuration = getSourceDuration({ clip, sourceAsset });
	const [requestedStart, requestedEnd] = clip.source_range_sec;
	const sourceStart = clamp(requestedStart, 0, sourceDuration);
	const sourceEnd = clamp(
		requestedEnd,
		Math.min(sourceStart + MIN_CLIP_SECONDS, sourceDuration),
		sourceDuration,
	);
	const duration = Math.max(MIN_CLIP_SECONDS, sourceEnd - sourceStart);

	const videoElement: CreateVideoElement = {
		type: "video",
		mediaId: sourceAsset.id,
		name: `${clip.clip_id} source`,
		duration,
		startTime,
		trimStart: sourceStart,
		trimEnd: Math.max(0, sourceDuration - sourceEnd),
		sourceDuration,
		muted: false,
		hidden: false,
		transform: copyDefaultTransform(),
		opacity: DEFAULTS.element.opacity,
		blendMode: DEFAULTS.element.blendMode,
		volume: 1,
	};

	const elements: CreateTimelineElement[] = [videoElement];
	if (includeText) {
		const hookText = clip.hook_text.trim();
		if (hookText) {
			elements.push(
				buildTextElement({
					raw: {
						name: `${clip.clip_id} hook`,
						content: hookText,
						duration: Math.min(3, duration),
						fontSize: 58,
						fontFamily: "Noto Sans JP",
						color: "#ffffff",
						background: {
							enabled: true,
							color: "rgba(0, 0, 0, 0.72)",
							cornerRadius: 18,
							paddingX: 28,
							paddingY: 14,
						},
						textAlign: "center",
						fontWeight: "bold",
						lineHeight: 1.12,
						transform: {
							...copyDefaultTransform(),
							position: { x: 0, y: -500 },
						},
					},
					startTime,
				}),
			);
		}

		if (captionCues) {
			const fontFamily = captionCues.style.font_family || "Noto Sans CJK JP";
			for (const cue of captionCues.cues) {
				const captionText = cue.text.trim();
				if (!captionText) continue;
				const cueStart = clamp(cue.start_sec, sourceStart, sourceEnd);
				const cueEnd = clamp(
					cue.end_sec,
					Math.min(cueStart + MIN_CLIP_SECONDS, sourceEnd),
					sourceEnd,
				);
				const cueDuration = cueEnd - cueStart;
				if (cueDuration <= 0) continue;
				elements.push(
					buildTextElement({
						raw: {
							name: cue.cue_id,
							content: captionText,
							duration: cueDuration,
							fontSize: 46,
							fontFamily,
							color: "#ffffff",
							background: {
								enabled: true,
								color: "rgba(0, 0, 0, 0.68)",
								cornerRadius: 12,
								paddingX: 22,
								paddingY: 10,
							},
							textAlign: "center",
							fontWeight: "bold",
							lineHeight: 1.16,
							wordTimings: cue.words.map((word) => ({
								word: word.w,
								startTime: roundTiming(clamp(word.start, cueStart, cueEnd) - cueStart),
								endTime: roundTiming(clamp(word.end, cueStart, cueEnd) - cueStart),
								confidence: word.confidence,
							})),
							transform: {
								...copyDefaultTransform(),
								position: {
									x: 0,
									y: captionSafeAreaY(captionCues.style.safe_area.anchor),
								},
							},
						},
						startTime: startTime + cueStart - sourceStart,
					}),
				);
			}
		}

		const ctaDuration = Math.min(3, duration);
		elements.push(
			buildTextElement({
				raw: {
					name: `${clip.clip_id} cta`,
					content: ctaText(captionCues?.language),
					duration: ctaDuration,
					fontSize: 44,
					fontFamily: "Noto Sans JP",
					color: "#ffffff",
					background: {
						enabled: true,
						color: "rgba(0, 0, 0, 0.72)",
						cornerRadius: 16,
						paddingX: 24,
						paddingY: 12,
					},
					textAlign: "center",
					fontWeight: "bold",
					lineHeight: 1.12,
					transform: {
						...copyDefaultTransform(),
						position: { x: 0, y: -500 },
					},
				},
				startTime: startTime + duration - ctaDuration,
			}),
		);
	}

	return {
		elements,
		duration,
		sourceRange: [sourceStart, sourceEnd],
	};
}

function getSourceDuration({
	clip,
	sourceAsset,
}: {
	clip: TimelineClip;
	sourceAsset: MediaAsset;
}) {
	if (Number.isFinite(sourceAsset.duration) && sourceAsset.duration) {
		return Math.max(MIN_CLIP_SECONDS, sourceAsset.duration);
	}
	return Math.max(MIN_CLIP_SECONDS, clip.source_range_sec[1], clip.source_range_sec[0]);
}

function copyDefaultTransform() {
	return {
		...DEFAULTS.element.transform,
		position: { ...DEFAULTS.element.transform.position },
	};
}

function clamp(value: number, min: number, max: number) {
	if (max < min) return min;
	return Math.min(Math.max(value, min), max);
}

function captionSafeAreaY(anchor: CaptionCueFile["style"]["safe_area"]["anchor"]) {
	if (anchor === "top") return -500;
	if (anchor === "center") return 0;
	return 500;
}

function ctaText(language: CaptionCueFile["language"] | undefined) {
	if (language === "ko") return "TikTok Shop에서 확인";
	return "TikTok Shopでチェック";
}

function roundTiming(seconds: number) {
	return Math.round(seconds * 1000) / 1000;
}
