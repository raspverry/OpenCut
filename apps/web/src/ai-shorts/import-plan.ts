import type { MediaAsset } from "@/media/types";
import type { CreateVideoElement } from "@/timeline";
import { buildElementFromMedia } from "@/timeline/element-utils";
import type { SubtitleCue, SubtitleStyleOverrides } from "@/subtitles/types";
import { mediaTimeFromSeconds } from "@/wasm";
import type {
	AiShortsCaptionCueFile,
	AiShortsTimelineClip,
	AiShortsTimelineSpec,
} from "./types";

export const AI_SHORTS_CANVAS_SIZE = { width: 1080, height: 1920 } as const;

export interface AiShortsImportPlan {
	sessionId: string;
	fingerprint: string;
	canvasSize: typeof AI_SHORTS_CANVAS_SIZE;
	videoElements: AiShortsVideoElementPlan[];
	captions: SubtitleCue[];
}

export interface AiShortsVideoElementPlan {
	clipId: string;
	element: CreateVideoElement;
}

export function buildAiShortsImportPlan({
	spec,
	captionsByClipId,
	sourceAsset,
	canvasSize = AI_SHORTS_CANVAS_SIZE,
}: {
	spec: AiShortsTimelineSpec;
	captionsByClipId: Map<string, AiShortsCaptionCueFile>;
	sourceAsset: MediaAsset;
	canvasSize?: typeof AI_SHORTS_CANVAS_SIZE;
}): AiShortsImportPlan {
	if (sourceAsset.type !== "video") {
		throw new Error("AI Shorts import requires a video source asset");
	}

	const sourceDurationSec =
		sourceAsset.duration ?? spec.source_video.duration_sec;
	const sourceWidth = sourceAsset.width ?? canvasSize.width;
	const sourceHeight = sourceAsset.height ?? canvasSize.height;
	const coverScale = Math.max(
		canvasSize.width / sourceWidth,
		canvasSize.height / sourceHeight,
	);
	const videoElements = spec.clips.map((clip) =>
		buildVideoElementPlan({
			clip,
			sourceAsset,
			sourceDurationSec,
			coverScale,
		}),
	);
	const captions = spec.clips.flatMap((clip) => {
		const captionFile = captionsByClipId.get(clip.clip_id);
		if (!captionFile) {
			throw new Error(`Missing caption cues for ${clip.clip_id}`);
		}
		return buildSubtitleCues({ clip, captionFile, canvasSize });
	});

	return {
		sessionId: spec.session_id,
		fingerprint: spec.fingerprint,
		canvasSize,
		videoElements,
		captions,
	};
}

function buildVideoElementPlan({
	clip,
	sourceAsset,
	sourceDurationSec,
	coverScale,
}: {
	clip: AiShortsTimelineClip;
	sourceAsset: MediaAsset;
	sourceDurationSec: number;
	coverScale: number;
}): AiShortsVideoElementPlan {
	const [sourceStartSec, sourceEndSec] = clip.source_range_sec;
	const durationSec = sourceEndSec - sourceStartSec;
	if (durationSec <= 0) {
		throw new Error(`Invalid source range for ${clip.clip_id}`);
	}

	const baseElement = buildElementFromMedia({
		mediaId: sourceAsset.id,
		mediaType: "video",
		name: `${clip.clip_id} ${clip.hook_text}`.trim(),
		duration: mediaTimeFromSeconds({ seconds: durationSec }),
		startTime: mediaTimeFromSeconds({ seconds: clip.timeline_start_sec }),
	});
	if (baseElement.type !== "video") {
		throw new Error("Expected video element");
	}

	return {
		clipId: clip.clip_id,
		element: {
			...baseElement,
			sourceDuration: mediaTimeFromSeconds({ seconds: sourceDurationSec }),
			trimStart: mediaTimeFromSeconds({ seconds: sourceStartSec }),
			trimEnd: mediaTimeFromSeconds({
				seconds: Math.max(sourceDurationSec - sourceEndSec, 0),
			}),
			params: {
				...baseElement.params,
				"transform.scaleX": coverScale,
				"transform.scaleY": coverScale,
			},
		},
	};
}

function buildSubtitleCues({
	clip,
	captionFile,
	canvasSize,
}: {
	clip: AiShortsTimelineClip;
	captionFile: AiShortsCaptionCueFile;
	canvasSize: typeof AI_SHORTS_CANVAS_SIZE;
}): SubtitleCue[] {
	const [sourceStartSec] = clip.source_range_sec;
	return captionFile.cues.map((cue) => ({
		text: cue.text,
		startTime:
			clip.timeline_start_sec + Math.max(cue.start_sec - sourceStartSec, 0),
		duration: Math.max(cue.end_sec - cue.start_sec, 0.05),
		style: captionStyleForOpenCut({ captionFile, canvasSize }),
	}));
}

function captionStyleForOpenCut({
	captionFile,
	canvasSize,
}: {
	captionFile: AiShortsCaptionCueFile;
	canvasSize: typeof AI_SHORTS_CANVAS_SIZE;
}): SubtitleStyleOverrides {
	const anchor = captionFile.style.safe_area.anchor;
	const verticalAlign =
		anchor === "top" ? "top" : anchor === "center" ? "middle" : "bottom";

	return {
		fontFamily: captionFile.style.font_family,
		color: "#ffffff",
		fontWeight: "bold",
		textAlign: "center",
		placement: {
			verticalAlign,
			marginVerticalRatio:
				captionFile.style.safe_area.margin_px / canvasSize.height,
		},
	};
}
