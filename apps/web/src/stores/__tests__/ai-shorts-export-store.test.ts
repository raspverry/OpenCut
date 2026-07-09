import { describe, expect, test } from "bun:test";
import { useAiShortsExportStore } from "../ai-shorts-export-store";

describe("useAiShortsExportStore", () => {
	test("shares the active OpenCut export QA target and artifact", () => {
		useAiShortsExportStore.getState().resetArtifacts();

		useAiShortsExportStore.getState().setTarget({
			sessionId: "s01",
			clipId: "p01-c01",
		});
		useAiShortsExportStore.getState().setArtifact({
			session_id: "s01",
			clip_id: "p01-c01",
			video_file: "final/p01-c01.mp4",
			byte_size: 1024,
		});
		useAiShortsExportStore.getState().setQaSummary({
			session_id: "s01",
			clip_count: 1,
			total_duration_sec: 29.4,
			by_product: { p01: 1 },
		});

		const state = useAiShortsExportStore.getState();
		expect(state.target).toEqual({ sessionId: "s01", clipId: "p01-c01" });
		expect(state.artifacts["p01-c01"].video_file).toBe("final/p01-c01.mp4");
		expect(state.qaSummary?.clip_count).toBe(1);
	});

	test("clears stale QA summary when a newer artifact arrives", () => {
		useAiShortsExportStore.getState().resetArtifacts();
		useAiShortsExportStore.getState().setQaSummary({
			session_id: "s01",
			clip_count: 1,
			total_duration_sec: 29.4,
			by_product: { p01: 1 },
		});

		useAiShortsExportStore.getState().setArtifact({
			session_id: "s01",
			clip_id: "p01-c02",
			video_file: "final/p01-c02.mp4",
			byte_size: 2048,
		});

		const state = useAiShortsExportStore.getState();
		expect(state.artifacts["p01-c02"].byte_size).toBe(2048);
		expect(state.qaSummary).toBeNull();
	});
});

