import type { MediaAsset } from "@/lib/media/types";
import type { CreateTimelineElement, CreateVideoElement } from "@/lib/timeline";
import { DEFAULTS } from "@/lib/timeline/defaults";
import { buildTextElement } from "@/lib/timeline/element-utils";
import type { CandidateClip } from "./types";

const MIN_CLIP_SECONDS = 0.1;

export type AiShortsInsertPlan = {
	elements: CreateTimelineElement[];
	duration: number;
	sourceRange: [number, number];
};

export function buildAiShortsInsertPlan({
	clip,
	sourceAsset,
	startTime,
	includeText,
}: {
	clip: CandidateClip;
	sourceAsset: MediaAsset;
	startTime: number;
	includeText: boolean;
}): AiShortsInsertPlan {
	const sourceDuration = getSourceDuration({ clip, sourceAsset });
	const sourceStart = clamp(clip.start_sec, 0, sourceDuration);
	const sourceEnd = clamp(
		clip.end_sec,
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

		const captionText = clip.caption.trim();
		if (captionText) {
			elements.push(
				buildTextElement({
					raw: {
						name: `${clip.clip_id} caption`,
						content: captionText,
						duration,
						fontSize: 42,
						fontFamily: "Noto Sans JP",
						color: "#ffffff",
						background: {
							enabled: true,
							color: "rgba(0, 0, 0, 0.64)",
							cornerRadius: 16,
							paddingX: 24,
							paddingY: 12,
						},
						textAlign: "center",
						fontWeight: "bold",
						lineHeight: 1.16,
						transform: {
							...copyDefaultTransform(),
							position: { x: 0, y: 500 },
						},
					},
					startTime,
				}),
			);
		}
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
	clip: CandidateClip;
	sourceAsset: MediaAsset;
}) {
	if (Number.isFinite(sourceAsset.duration) && sourceAsset.duration) {
		return Math.max(MIN_CLIP_SECONDS, sourceAsset.duration);
	}
	return Math.max(MIN_CLIP_SECONDS, clip.end_sec, clip.start_sec);
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
