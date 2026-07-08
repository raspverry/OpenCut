"use client";

import { useMemo, useState } from "react";
import {
	CheckCircle2,
	Download,
	ListVideo,
	Sparkles,
	Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
	buildAiShortsImportPlan,
	buildSingleClipAiShortsImportBundle,
} from "@/ai-shorts/import-plan";
import { importAiShortsIntoEditor } from "@/ai-shorts/import-into-editor";
import {
	analyzeAiShortsSession,
	draftAiShortsOpenCutExportManifest,
	fetchAiShortsImportBundle,
	fetchAiShortsTimelineSpec,
	uploadAiShortsOpenCutExportArtifact,
	verifyAiShortsOpenCutExportManifest,
} from "@/ai-shorts/sidecar-client";
import type {
	AiShortsLanguage,
	AiShortsProvider,
	AiShortsSourceLanguage,
	AiShortsTimelineClip,
} from "@/ai-shorts/types";
import { useEditor } from "@/editor/use-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

const DEFAULT_SIDECAR_URL = "http://127.0.0.1:8789";
const SELECT_CLASS =
	"border-border bg-background h-8 rounded-md border px-2 text-xs outline-none";

function providerFromValue(value: string): AiShortsProvider {
	return value === "anthropic" ? "anthropic" : "openai";
}

function sourceLanguageFromValue(value: string): AiShortsSourceLanguage {
	if (value === "ja" || value === "ko" || value === "zh") {
		return value;
	}
	return "zh";
}

function outputLanguageFromValue(value: string): AiShortsLanguage {
	return value === "ko" ? "ko" : "ja";
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) {
		return `${bytes} B`;
	}
	if (bytes < 1024 * 1024) {
		return `${Math.round(bytes / 1024)} KB`;
	}
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function clipLabel(clip: AiShortsTimelineClip): string {
	const [startSec, endSec] = clip.source_range_sec;
	const durationSec = Math.max(endSec - startSec, 0);
	return `${clip.clip_id} ${durationSec.toFixed(1)}s - ${clip.hook_text}`;
}

export function AiShortsButton() {
	const editor = useEditor();
	const videoAssets = useEditor((e) =>
		e.media.getAssets().filter((asset) => asset.type === "video"),
	);
	const [open, setOpen] = useState(false);
	const [baseUrl, setBaseUrl] = useState(DEFAULT_SIDECAR_URL);
	const [sessionId, setSessionId] = useState("");
	const [sourceAssetId, setSourceAssetId] = useState("");
	const [provider, setProvider] = useState<AiShortsProvider>("openai");
	const [sourceLanguage, setSourceLanguage] =
		useState<AiShortsSourceLanguage>("zh");
	const [outputLanguage, setOutputLanguage] = useState<AiShortsLanguage>("ja");
	const [maxClips, setMaxClips] = useState("12");
	const [forceAnalyze, setForceAnalyze] = useState(false);
	const [timelineClips, setTimelineClips] = useState<AiShortsTimelineClip[]>(
		[],
	);
	const [selectedClipId, setSelectedClipId] = useState("");
	const [status, setStatus] = useState("Ready");
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [isLoadingClips, setIsLoadingClips] = useState(false);
	const [isImporting, setIsImporting] = useState(false);
	const [isExporting, setIsExporting] = useState(false);
	const [isVerifying, setIsVerifying] = useState(false);
	const isBusy =
		isAnalyzing || isLoadingClips || isImporting || isExporting || isVerifying;
	const selectedSourceAssetId = sourceAssetId || videoAssets[0]?.id || "";
	const activeClipId = selectedClipId || timelineClips[0]?.clip_id || "";
	const sourceAsset = useMemo(
		() =>
			videoAssets.find((asset) => asset.id === selectedSourceAssetId) ?? null,
		[videoAssets, selectedSourceAssetId],
	);

	function requireSessionId(): string | null {
		const trimmed = sessionId.trim();
		if (!trimmed) {
			setStatus("Session ID is required");
		}
		return trimmed || null;
	}

	function requireClipId(): string | null {
		const trimmed = activeClipId.trim();
		if (!trimmed) {
			setStatus("Load and select a clip first");
		}
		return trimmed || null;
	}

	function selectedMaxClips(): number | undefined {
		const trimmed = maxClips.trim();
		if (!trimmed) {
			return undefined;
		}
		const value = Number(trimmed);
		if (!Number.isInteger(value) || value < 1) {
			throw new Error("Max clips must be a positive integer");
		}
		return value;
	}

	function setLoadedClips(clips: AiShortsTimelineClip[]) {
		setTimelineClips(clips);
		setSelectedClipId((current) => {
			if (current && clips.some((clip) => clip.clip_id === current)) {
				return current;
			}
			return clips[0]?.clip_id ?? "";
		});
	}

	async function loadTimelineClips(session: string): Promise<number> {
		const spec = await fetchAiShortsTimelineSpec({
			baseUrl: baseUrl.trim(),
			sessionId: session,
		});
		setLoadedClips(spec.clips);
		return spec.clips.length;
	}

	async function importTimeline({
		session,
		clipId,
	}: {
		session: string;
		clipId?: string;
	}) {
		if (!sourceAsset) {
			setStatus("Import the source video first");
			return;
		}

		setIsImporting(true);
		setStatus(clipId ? `Importing ${clipId}...` : "Importing timeline...");
		try {
			const bundle = await fetchAiShortsImportBundle({
				baseUrl: baseUrl.trim(),
				sessionId: session,
			});
			setLoadedClips(bundle.spec.clips);
			const importBundle = clipId
				? buildSingleClipAiShortsImportBundle({ bundle, clipId })
				: bundle;
			const plan = buildAiShortsImportPlan({
				spec: importBundle.spec,
				captionsByClipId: importBundle.captionsByClipId,
				sourceAsset,
			});
			const result = await importAiShortsIntoEditor({ editor, plan });
			setStatus(
				clipId
					? `Imported ${clipId}, ${result.captionCount} captions`
					: `Imported ${result.clipCount} clips, ${result.captionCount} captions`,
			);
			toast.success("AI Shorts imported");
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "AI Shorts import failed";
			setStatus(message);
			toast.error("AI Shorts import failed", { description: message });
		} finally {
			setIsImporting(false);
		}
	}

	async function handleLoadClips() {
		const session = requireSessionId();
		if (!session) {
			return;
		}

		setIsLoadingClips(true);
		setStatus("Loading sidecar clips...");
		try {
			const count = await loadTimelineClips(session);
			setStatus(`Loaded ${count} clips`);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "AI Shorts clips load failed";
			setStatus(message);
			toast.error("AI Shorts clips load failed", { description: message });
		} finally {
			setIsLoadingClips(false);
		}
	}

	async function handleAnalyze() {
		const session = requireSessionId();
		if (!session) {
			return;
		}

		setIsAnalyzing(true);
		setStatus("Analyzing sidecar session...");
		try {
			const response = await analyzeAiShortsSession({
				baseUrl: baseUrl.trim(),
				sessionId: session,
				request: {
					provider,
					source_language: sourceLanguage,
					language: outputLanguage,
					max_clip_sec: 30,
					max_clips: selectedMaxClips(),
					force: forceAnalyze,
				},
			});
			const loadedCount = await loadTimelineClips(session);
			setStatus(`Analyzed ${response.clip_count} clips, loaded ${loadedCount}`);
			toast.success("AI Shorts analyzed");
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "AI Shorts analyze failed";
			setStatus(message);
			toast.error("AI Shorts analyze failed", { description: message });
		} finally {
			setIsAnalyzing(false);
		}
	}

	async function handleImportSelected() {
		const session = requireSessionId();
		const clipId = requireClipId();
		if (!session || !clipId) {
			return;
		}
		await importTimeline({ session, clipId });
	}

	async function handleImportAll() {
		const session = requireSessionId();
		if (!session) {
			return;
		}
		await importTimeline({ session });
	}

	async function handleExportSelected() {
		const session = requireSessionId();
		const clipId = requireClipId();
		const activeProject = editor.project.getActiveOrNull();
		if (!session || !clipId) {
			return;
		}
		if (!activeProject) {
			setStatus("No active project");
			return;
		}

		setIsExporting(true);
		setStatus(`Exporting ${clipId}...`);
		try {
			const result = await editor.project.export({
				options: {
					format: "mp4",
					quality: "high",
					fps: activeProject.settings.fps,
					includeAudio: true,
				},
			});
			if (result.cancelled) {
				setStatus("Export cancelled");
				return;
			}
			if (!result.success || !result.buffer) {
				throw new Error(result.error || "OpenCut export failed");
			}

			setStatus(`Uploading ${clipId}...`);
			const artifact = await uploadAiShortsOpenCutExportArtifact({
				baseUrl: baseUrl.trim(),
				sessionId: session,
				clipId,
				buffer: result.buffer,
			});
			setStatus(
				`Uploaded ${artifact.video_file} (${formatBytes(artifact.byte_size)})`,
			);
			toast.success("OpenCut export uploaded", {
				description: artifact.video_file,
			});
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "OpenCut export upload failed";
			setStatus(message);
			toast.error("OpenCut export upload failed", { description: message });
		} finally {
			editor.project.clearExportState();
			setIsExporting(false);
		}
	}

	async function handleVerifySelected() {
		const session = requireSessionId();
		const clipId = requireClipId();
		if (!session || !clipId) {
			return;
		}

		setIsVerifying(true);
		setStatus(`Verifying ${clipId}...`);
		try {
			const draft = await draftAiShortsOpenCutExportManifest({
				baseUrl: baseUrl.trim(),
				sessionId: session,
				clipIds: [clipId],
			});
			if (draft.missing_files.length > 0) {
				throw new Error(
					`Missing export files: ${draft.missing_files.join(", ")}`,
				);
			}
			const qa = await verifyAiShortsOpenCutExportManifest({
				baseUrl: baseUrl.trim(),
				sessionId: session,
				manifest: draft.manifest,
			});
			setStatus(
				`Verified ${qa.clip_count} clip, ${qa.total_duration_sec.toFixed(1)}s`,
			);
			toast.success("OpenCut export verified");
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "OpenCut export QA failed";
			setStatus(message);
			toast.error("OpenCut export QA failed", { description: message });
		} finally {
			setIsVerifying(false);
		}
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button variant="secondary" size="sm" className="gap-1.5">
					<Sparkles className="size-3.5" />
					AI Shorts
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-96 p-3">
				<div className="flex flex-col gap-3">
					<div className="flex items-center justify-between gap-3">
						<h3 className="text-sm font-medium">AI Shorts</h3>
						<span className="text-muted-foreground text-xs">
							{videoAssets.length} video assets
						</span>
					</div>
					<label
						className="grid gap-1.5 text-xs"
						htmlFor="ai-shorts-sidecar-url"
					>
						<span className="text-muted-foreground">Sidecar URL</span>
						<Input
							id="ai-shorts-sidecar-url"
							size="sm"
							value={baseUrl}
							onChange={(event) => setBaseUrl(event.currentTarget.value)}
						/>
					</label>
					<label
						className="grid gap-1.5 text-xs"
						htmlFor="ai-shorts-session-id"
					>
						<span className="text-muted-foreground">Session ID</span>
						<Input
							id="ai-shorts-session-id"
							size="sm"
							placeholder="20260708-schwanengarten-zh-ja"
							value={sessionId}
							onChange={(event) => setSessionId(event.currentTarget.value)}
						/>
					</label>
					<div className="grid grid-cols-2 gap-2">
						<label
							className="grid gap-1.5 text-xs"
							htmlFor="ai-shorts-provider"
						>
							<span className="text-muted-foreground">Provider</span>
							<select
								id="ai-shorts-provider"
								className={SELECT_CLASS}
								value={provider}
								onChange={(event) =>
									setProvider(providerFromValue(event.currentTarget.value))
								}
							>
								<option value="openai">OpenAI</option>
								<option value="anthropic">Anthropic</option>
							</select>
						</label>
						<label
							className="grid gap-1.5 text-xs"
							htmlFor="ai-shorts-source-language"
						>
							<span className="text-muted-foreground">Source</span>
							<select
								id="ai-shorts-source-language"
								className={SELECT_CLASS}
								value={sourceLanguage}
								onChange={(event) =>
									setSourceLanguage(
										sourceLanguageFromValue(event.currentTarget.value),
									)
								}
							>
								<option value="zh">Chinese</option>
								<option value="ja">Japanese</option>
								<option value="ko">Korean</option>
							</select>
						</label>
						<label
							className="grid gap-1.5 text-xs"
							htmlFor="ai-shorts-output-language"
						>
							<span className="text-muted-foreground">Output</span>
							<select
								id="ai-shorts-output-language"
								className={SELECT_CLASS}
								value={outputLanguage}
								onChange={(event) =>
									setOutputLanguage(
										outputLanguageFromValue(event.currentTarget.value),
									)
								}
							>
								<option value="ja">Japanese</option>
								<option value="ko">Korean</option>
							</select>
						</label>
						<label
							className="grid gap-1.5 text-xs"
							htmlFor="ai-shorts-max-clips"
						>
							<span className="text-muted-foreground">Max clips</span>
							<Input
								id="ai-shorts-max-clips"
								size="sm"
								type="number"
								min={1}
								value={maxClips}
								onChange={(event) => setMaxClips(event.currentTarget.value)}
							/>
						</label>
					</div>
					<label
						className="grid gap-1.5 text-xs"
						htmlFor="ai-shorts-source-asset"
					>
						<span className="text-muted-foreground">Source video asset</span>
						<select
							id="ai-shorts-source-asset"
							className={SELECT_CLASS}
							value={selectedSourceAssetId}
							onChange={(event) => setSourceAssetId(event.currentTarget.value)}
						>
							{videoAssets.length === 0 ? (
								<option value="">No video assets</option>
							) : null}
							{videoAssets.map((asset) => (
								<option key={asset.id} value={asset.id}>
									{asset.name}
								</option>
							))}
						</select>
					</label>
					<label className="grid gap-1.5 text-xs" htmlFor="ai-shorts-clip">
						<span className="text-muted-foreground">Clip</span>
						<select
							id="ai-shorts-clip"
							className={SELECT_CLASS}
							value={activeClipId}
							onChange={(event) => setSelectedClipId(event.currentTarget.value)}
						>
							{timelineClips.length === 0 ? (
								<option value="">No clips loaded</option>
							) : null}
							{timelineClips.map((clip) => (
								<option key={clip.clip_id} value={clip.clip_id}>
									{clipLabel(clip)}
								</option>
							))}
						</select>
					</label>
					<label className="flex items-center gap-2 text-xs">
						<input
							type="checkbox"
							checked={forceAnalyze}
							onChange={(event) => setForceAnalyze(event.currentTarget.checked)}
						/>
						<span className="text-muted-foreground">Force re-analyze</span>
					</label>
					<div className="grid grid-cols-2 gap-2">
						<Button
							size="sm"
							className="gap-1.5"
							disabled={isBusy}
							onClick={handleAnalyze}
						>
							<Sparkles className="size-3.5" />
							{isAnalyzing ? "Analyzing..." : "Analyze"}
						</Button>
						<Button
							size="sm"
							variant="secondary"
							className="gap-1.5"
							disabled={isBusy}
							onClick={handleLoadClips}
						>
							<ListVideo className="size-3.5" />
							{isLoadingClips ? "Loading..." : "Load Clips"}
						</Button>
						<Button
							size="sm"
							variant="secondary"
							className="gap-1.5"
							disabled={isBusy}
							onClick={handleImportSelected}
						>
							<Download className="size-3.5" />
							{isImporting ? "Importing..." : "Import Selected"}
						</Button>
						<Button
							size="sm"
							variant="secondary"
							className="gap-1.5"
							disabled={isBusy}
							onClick={handleImportAll}
						>
							<Download className="size-3.5" />
							Import All
						</Button>
						<Button
							size="sm"
							variant="secondary"
							className="gap-1.5"
							disabled={isBusy}
							onClick={handleExportSelected}
						>
							<Upload className="size-3.5" />
							{isExporting ? "Exporting..." : "Export Selected"}
						</Button>
						<Button
							size="sm"
							variant="secondary"
							className="gap-1.5"
							disabled={isBusy}
							onClick={handleVerifySelected}
						>
							<CheckCircle2 className="size-3.5" />
							{isVerifying ? "Verifying..." : "Verify Selected"}
						</Button>
					</div>
					<p className="text-muted-foreground min-w-0 truncate text-xs">
						{status}
					</p>
				</div>
			</PopoverContent>
		</Popover>
	);
}
