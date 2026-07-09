import type { MediaAsset } from "@/lib/media/types";
import type { CreateTimelineElement, CreateVideoElement } from "@/lib/timeline";
import { DEFAULTS } from "@/lib/timeline/defaults";
import { buildTextElement } from "@/lib/timeline/element-utils";
import type { CaptionCueFile, TimelineClip } from "./types";

const MIN_CLIP_SECONDS = 0.1;
const SHORTS_CANVAS_SIZE = { width: 1080, height: 1920 };

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
		transform: buildCoverTransform({ sourceAsset }),
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
						fontSize: 3.2,
						fontFamily: "Noto Sans JP",
						color: "#ffffff",
						background: {
							enabled: true,
							color: "rgba(0, 0, 0, 0.72)",
							cornerRadius: 18,
							paddingX: 100,
							paddingY: 60,
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
							fontSize: 2.7,
							fontFamily,
							color: "#ffffff",
							background: {
								enabled: true,
								color: "rgba(0, 0, 0, 0.68)",
								cornerRadius: 12,
								paddingX: 90,
								paddingY: 55,
							},
							textAlign: "center",
							fontWeight: "bold",
							lineHeight: 1.16,
							wordTimings: cue.words.map((word) => ({
								word: word.w,
								startTime: roundTiming(
									clamp(word.start, cueStart, cueEnd) - cueStart,
								),
								endTime: roundTiming(
									clamp(word.end, cueStart, cueEnd) - cueStart,
								),
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
					fontSize: 2.5,
					fontFamily: "Noto Sans JP",
					color: "#ffffff",
					background: {
						enabled: true,
						color: "rgba(0, 0, 0, 0.72)",
						cornerRadius: 16,
						paddingX: 90,
						paddingY: 55,
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

export function buildFullSubtitleInsertPlan({
	sourceAsset,
	startTime,
	captionCues,
}: {
	sourceAsset: MediaAsset;
	startTime: number;
	captionCues: CaptionCueFile;
}): AiShortsInsertPlan {
	const sourceDuration = getFullSourceDuration({ sourceAsset, captionCues });
	const videoElement: CreateVideoElement = {
		type: "video",
		mediaId: sourceAsset.id,
		name: `${sourceAsset.name} full source`,
		duration: sourceDuration,
		startTime,
		trimStart: 0,
		trimEnd: 0,
		sourceDuration,
		muted: false,
		hidden: false,
		transform: copyDefaultTransform(),
		opacity: DEFAULTS.element.opacity,
		blendMode: DEFAULTS.element.blendMode,
		volume: 1,
	};

	const elements: CreateTimelineElement[] = [videoElement];
	const fontFamily = captionCues.style.font_family || "Noto Sans CJK JP";
	for (const cue of captionCues.cues) {
		const captionText = cue.text.trim();
		if (!captionText) continue;
		const cueStart = clamp(cue.start_sec, 0, sourceDuration);
		const cueEnd = clamp(
			cue.end_sec,
			Math.min(cueStart + MIN_CLIP_SECONDS, sourceDuration),
			sourceDuration,
		);
		const cueDuration = cueEnd - cueStart;
		if (cueDuration <= 0) continue;
		elements.push(
			buildTextElement({
				raw: {
					name: cue.cue_id,
					content: captionText,
					duration: cueDuration,
					fontSize: fullSubtitleFontSize(sourceAsset),
					fontFamily,
					color: "#ffffff",
					background: {
						enabled: true,
						color: "rgba(0, 0, 0, 0.64)",
						cornerRadius: 10,
						paddingX: 70,
						paddingY: 42,
					},
					textAlign: "center",
					fontWeight: "bold",
					lineHeight: 1.16,
					wordTimings: cue.words.map((word) => ({
						word: word.w,
						startTime: roundTiming(
							clamp(word.start, cueStart, cueEnd) - cueStart,
						),
						endTime: roundTiming(clamp(word.end, cueStart, cueEnd) - cueStart),
						confidence: word.confidence,
					})),
					transform: {
						...copyDefaultTransform(),
						position: {
							x: 0,
							y: fullSubtitleSafeAreaY({
								sourceAsset,
								anchor: captionCues.style.safe_area.anchor,
							}),
						},
					},
				},
				startTime: startTime + cueStart,
			}),
		);
	}

	return {
		elements,
		duration: sourceDuration,
		sourceRange: [0, sourceDuration],
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
	return Math.max(
		MIN_CLIP_SECONDS,
		clip.source_range_sec[1],
		clip.source_range_sec[0],
	);
}

function getFullSourceDuration({
	sourceAsset,
	captionCues,
}: {
	sourceAsset: MediaAsset;
	captionCues: CaptionCueFile;
}) {
	if (Number.isFinite(sourceAsset.duration) && sourceAsset.duration) {
		return Math.max(MIN_CLIP_SECONDS, sourceAsset.duration);
	}
	return Math.max(
		MIN_CLIP_SECONDS,
		captionCues.source_range_sec[1],
		...captionCues.cues.map((cue) => cue.end_sec),
	);
}

function copyDefaultTransform() {
	return {
		...DEFAULTS.element.transform,
		position: { ...DEFAULTS.element.transform.position },
	};
}

function buildCoverTransform({ sourceAsset }: { sourceAsset: MediaAsset }) {
	const transform = copyDefaultTransform();
	const sourceWidth = sourceAsset.width ?? 0;
	const sourceHeight = sourceAsset.height ?? 0;
	if (sourceWidth <= 0 || sourceHeight <= 0) return transform;

	const containScale = Math.min(
		SHORTS_CANVAS_SIZE.width / sourceWidth,
		SHORTS_CANVAS_SIZE.height / sourceHeight,
	);
	const coverScale = Math.max(
		SHORTS_CANVAS_SIZE.width / sourceWidth,
		SHORTS_CANVAS_SIZE.height / sourceHeight,
	);
	if (containScale <= 0) return transform;

	const scale = coverScale / containScale;
	return {
		...transform,
		scaleX: scale,
		scaleY: scale,
	};
}

function clamp(value: number, min: number, max: number) {
	if (max < min) return min;
	return Math.min(Math.max(value, min), max);
}

function captionSafeAreaY(
	anchor: CaptionCueFile["style"]["safe_area"]["anchor"],
) {
	if (anchor === "top") return -500;
	if (anchor === "center") return 0;
	return 500;
}

function fullSubtitleSafeAreaY({
	sourceAsset,
	anchor,
}: {
	sourceAsset: MediaAsset;
	anchor: CaptionCueFile["style"]["safe_area"]["anchor"];
}) {
	const sourceHeight =
		sourceAsset.height && sourceAsset.height > 0 ? sourceAsset.height : 720;
	if (anchor === "top") return -Math.round(sourceHeight * 0.34);
	if (anchor === "center") return 0;
	return Math.round(sourceHeight * 0.34);
}

function fullSubtitleFontSize(sourceAsset: MediaAsset) {
	const sourceHeight =
		sourceAsset.height && sourceAsset.height > 0 ? sourceAsset.height : 720;
	if (sourceHeight <= 800) return 4.8;
	if (sourceHeight <= 1200) return 3.9;
	return 2.9;
}

function ctaText(language: CaptionCueFile["language"] | undefined) {
	if (language === "ko") return "TikTok Shop에서 확인";
	return "TikTok Shopでチェック";
}

function roundTiming(seconds: number) {
	return Math.round(seconds * 1000) / 1000;
}
