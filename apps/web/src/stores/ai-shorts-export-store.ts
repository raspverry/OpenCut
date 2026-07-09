import { create } from "zustand";
import type {
	OpenCutExportArtifact,
	OpenCutExportQaResponse,
} from "@/lib/ai-shorts/types";

export type AiShortsExportTarget = {
	sessionId: string;
	clipId: string;
};

interface AiShortsExportState {
	target: AiShortsExportTarget | null;
	artifacts: Record<string, OpenCutExportArtifact>;
	qaSummary: OpenCutExportQaResponse | null;
	setTarget: (target: AiShortsExportTarget) => void;
	clearTarget: () => void;
	setArtifact: (artifact: OpenCutExportArtifact) => void;
	setQaSummary: (summary: OpenCutExportQaResponse | null) => void;
	resetArtifacts: () => void;
}

export const useAiShortsExportStore = create<AiShortsExportState>()((set) => ({
	target: null,
	artifacts: {},
	qaSummary: null,
	setTarget: (target) => set({ target }),
	clearTarget: () => set({ target: null }),
	setArtifact: (artifact) =>
		set((state) => ({
			artifacts: {
				...state.artifacts,
				[artifact.clip_id]: artifact,
			},
			qaSummary: null,
		})),
	setQaSummary: (summary) => set({ qaSummary: summary }),
	resetArtifacts: () => set({ artifacts: {}, qaSummary: null, target: null }),
}));

