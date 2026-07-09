import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import type { MediaAsset } from "@/lib/media/types";
import type { CaptionCueFile } from "@/lib/ai-shorts/types";
import type {
	CreateTimelineElement,
	TimelineElement,
	TimelineTrack,
} from "@/lib/timeline";
import { buildEmptyTrack } from "@/lib/timeline/track-utils";
import { generateUUID } from "@/utils/id";

const FULL_SUBTITLE_DURATION_TOLERANCE_SEC = 2;

export function sourceMatchesFullSubtitleCues({
	sourceAsset,
	captionCues,
	toleranceSec = FULL_SUBTITLE_DURATION_TOLERANCE_SEC,
}: {
	sourceAsset: MediaAsset;
	captionCues: CaptionCueFile;
	toleranceSec?: number;
}) {
	if (!Number.isFinite(sourceAsset.duration) || !sourceAsset.duration) {
		return false;
	}
	const expectedSource = captionCues.source_video;
	const expectedDuration =
		expectedSource?.duration_sec ?? fullSubtitleCueDuration(captionCues);
	if (Math.abs(sourceAsset.duration - expectedDuration) > toleranceSec) {
		return false;
	}
	if (!expectedSource) {
		return true;
	}
	return (
		sourceDimensionMatches(sourceAsset.width, expectedSource.width) &&
		sourceDimensionMatches(sourceAsset.height, expectedSource.height)
	);
}

export function buildFullSubtitleTrackSnapshot({
	beforeTracks,
	elements,
	clipId,
}: {
	beforeTracks: TimelineTrack[];
	elements: CreateTimelineElement[];
	clipId: string;
}) {
	const { subtitleTrackName, sourceTrackName } = fullSubtitleTrackNames(clipId);
	const videoElements: TimelineElement[] = [];
	const textElements: TimelineElement[] = [];

	for (const element of elements) {
		const timelineElement = materializeTimelineElement(element);
		if (timelineElement.type === "text") {
			textElements.push(timelineElement);
		} else if (timelineElement.type === "video") {
			videoElements.push(timelineElement);
		}
	}

	const insertedTracks: TimelineTrack[] = [];
	if (textElements.length > 0) {
		insertedTracks.push({
			...buildEmptyTrack({
				id: generateUUID(),
				type: "text",
				name: subtitleTrackName,
			}),
			elements: textElements,
		} as TimelineTrack);
	}
	if (videoElements.length > 0) {
		insertedTracks.push({
			...buildEmptyTrack({
				id: generateUUID(),
				type: "video",
				name: sourceTrackName,
			}),
			elements: videoElements,
		} as TimelineTrack);
	}

	const retainedTracks = beforeTracks.filter(
		(track) =>
			track.name !== subtitleTrackName && track.name !== sourceTrackName,
	);
	return [...insertedTracks, ...retainedTracks];
}

function fullSubtitleCueDuration(captionCues: CaptionCueFile) {
	return Math.max(
		captionCues.source_range_sec[1],
		...captionCues.cues.map((cue) => cue.end_sec),
	);
}

function sourceDimensionMatches(
	actual: number | null | undefined,
	expected: number | null | undefined,
) {
	if (expected == null) {
		return true;
	}
	return actual === expected;
}

function fullSubtitleTrackNames(clipId: string) {
	return {
		subtitleTrackName: `${clipId} subtitles`,
		sourceTrackName: `${clipId} source`,
	};
}

function materializeTimelineElement(
	element: CreateTimelineElement,
): TimelineElement {
	return {
		...element,
		id: generateUUID(),
		startTime: element.startTime,
		trimStart: element.trimStart ?? 0,
		trimEnd: element.trimEnd ?? 0,
		duration: element.duration ?? TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION,
	} as TimelineElement;
}
