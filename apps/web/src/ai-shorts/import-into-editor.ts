import {
	AddTrackCommand,
	BatchCommand,
	InsertElementCommand,
} from "@/commands";
import type { EditorCore } from "@/core";
import { buildSubtitleTextElement } from "@/subtitles/build-subtitle-text-element";
import type { AiShortsImportPlan } from "./import-plan";

export interface AiShortsImportResult {
	videoTrackId: string;
	textTrackId: string;
	clipCount: number;
	captionCount: number;
}

export async function importAiShortsIntoEditor({
	editor,
	plan,
}: {
	editor: EditorCore;
	plan: AiShortsImportPlan;
}): Promise<AiShortsImportResult> {
	const activeProject = editor.project.getActiveOrNull();
	if (!activeProject) {
		throw new Error("No active project");
	}

	await editor.project.updateSettings({
		settings: {
			canvasSize: plan.canvasSize,
			canvasSizeMode: "preset",
			originalCanvasSize: plan.canvasSize,
		},
		pushHistory: false,
	});

	const addTextTrack = new AddTrackCommand({ type: "text", index: 0 });
	const addVideoTrack = new AddTrackCommand({ type: "video", index: 1 });
	const textTrackId = addTextTrack.getTrackId();
	const videoTrackId = addVideoTrack.getTrackId();

	const captionCommands = plan.captions.map(
		(caption, index) =>
			new InsertElementCommand({
				placement: { mode: "explicit", trackId: textTrackId },
				element: buildSubtitleTextElement({
					index,
					caption,
					canvasSize: plan.canvasSize,
				}),
			}),
	);
	const videoCommands = plan.videoElements.map(
		({ element }) =>
			new InsertElementCommand({
				placement: { mode: "explicit", trackId: videoTrackId },
				element,
			}),
	);

	editor.command.execute({
		command: new BatchCommand([
			addTextTrack,
			addVideoTrack,
			...captionCommands,
			...videoCommands,
		]),
	});

	return {
		videoTrackId,
		textTrackId,
		clipCount: plan.videoElements.length,
		captionCount: plan.captions.length,
	};
}
