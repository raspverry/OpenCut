import type { MediaAsset } from "@/lib/media/types";
import type { TimelineSpec } from "./types";

const MIN_DURATION_TOLERANCE_SEC = 2;
const DURATION_TOLERANCE_RATIO = 0.005;

export function sourceMatchesTimelineSpec({
	sourceAsset,
	timelineSpec,
}: {
	sourceAsset: MediaAsset | undefined;
	timelineSpec: TimelineSpec | null;
}) {
	if (!sourceAsset || !timelineSpec) return false;

	const sourceDuration = sourceAsset.duration ?? 0;
	if (!Number.isFinite(sourceDuration) || sourceDuration <= 0) return true;

	const expectedDuration = timelineSpec.source_video.duration_sec;
	const tolerance = Math.max(
		MIN_DURATION_TOLERANCE_SEC,
		expectedDuration * DURATION_TOLERANCE_RATIO,
	);
	return Math.abs(sourceDuration - expectedDuration) <= tolerance;
}
