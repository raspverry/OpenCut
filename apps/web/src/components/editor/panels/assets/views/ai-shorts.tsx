"use client";

import { useEffect, useMemo, useState } from "react";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useEditor } from "@/hooks/use-editor";
import {
	defaultModelForProvider,
	nextModelForProvider,
} from "@/lib/ai-shorts/models";
import {
	formatProductCatalog,
	parseProductCatalog,
} from "@/lib/ai-shorts/catalog";
import { createSidecarClient } from "@/lib/ai-shorts/sidecar-client";
import { sourceMatchesTimelineSpec } from "@/lib/ai-shorts/source-match";
import { buildAiShortsInsertPlanFromSpec } from "@/lib/ai-shorts/timeline";
import type {
	LanguageCode,
	SidecarProvider,
	SourceLanguageCode,
	TimelineClip,
	TimelineSpec,
} from "@/lib/ai-shorts/types";
import type { MediaAsset } from "@/lib/media/types";
import { useAiShortsExportStore } from "@/stores/ai-shorts-export-store";
import { Target } from "lucide-react";
import { toast } from "sonner";

type LoadState = "idle" | "loading" | "ingesting" | "analyzing" | "inserting";
const TIKTOK_CANVAS_SIZE = { width: 1080, height: 1920 };

export function AiShortsView() {
	const editor = useEditor();
	const mediaAssets = useEditor((e) => e.media.getAssets());
	const videoAssets = useMemo(
		() => mediaAssets.filter(isVideoAsset),
		[mediaAssets],
	);
	const sidecar = useMemo(() => createSidecarClient(), []);

	const [sessionId, setSessionId] = useState("");
	const [sessionSlug, setSessionSlug] = useState("opencut-live");
	const [catalogText, setCatalogText] = useState(formatProductCatalog([]));
	const [selectedMediaId, setSelectedMediaId] = useState("");
	const [provider, setProvider] = useState<SidecarProvider>("openai");
	const [model, setModel] = useState(defaultModelForProvider("openai"));
	const [sourceLanguage, setSourceLanguage] =
		useState<SourceLanguageCode>("ko");
	const [language, setLanguage] = useState<LanguageCode>("ja");
	const [maxClipSec, setMaxClipSec] = useState("30");
	const [maxClips, setMaxClips] = useState("5");
	const [includeText, setIncludeText] = useState(true);
	const [refreshAnalysis, setRefreshAnalysis] = useState(false);
	const [timelineSpec, setTimelineSpec] = useState<TimelineSpec | null>(null);
	const [clips, setClips] = useState<TimelineClip[]>([]);
	const exportTarget = useAiShortsExportStore((store) => store.target);
	const uploadedExportArtifacts = useAiShortsExportStore(
		(store) => store.artifacts,
	);
	const exportQaSummary = useAiShortsExportStore((store) => store.qaSummary);
	const setExportTarget = useAiShortsExportStore((store) => store.setTarget);
	const setExportArtifact = useAiShortsExportStore(
		(store) => store.setArtifact,
	);
	const setExportQaSummary = useAiShortsExportStore(
		(store) => store.setQaSummary,
	);
	const resetExportArtifacts = useAiShortsExportStore(
		(store) => store.resetArtifacts,
	);
	const [state, setState] = useState<LoadState>("idle");

	useEffect(() => {
		if (!selectedMediaId && videoAssets[0]) {
			setSelectedMediaId(videoAssets[0].id);
		}
	}, [selectedMediaId, videoAssets]);

	const selectedAsset = videoAssets.find(
		(asset) => asset.id === selectedMediaId,
	);
	const isBusy = state !== "idle";
	const sourceMatchesSpec = sourceMatchesTimelineSpec({
		sourceAsset: selectedAsset,
		timelineSpec,
	});

	const applyTimelineSpec = (spec: TimelineSpec) => {
		setTimelineSpec(spec);
		setClips(spec.clips);
		setLanguage(spec.language);
		resetExportArtifacts();
	};

	const fetchTimelineSpec = async (normalizedSessionId: string) => {
		const spec = await sidecar.getTimelineSpec(normalizedSessionId);
		applyTimelineSpec(spec);
		return spec;
	};

	const createSession = async () => {
		const normalizedSlug = normalizeSlug(sessionSlug);
		if (!normalizedSlug) {
			toast.error("Enter a session slug");
			return;
		}
		setState("loading");
		try {
			const session = await sidecar.createSession(normalizedSlug);
			setSessionSlug(normalizedSlug);
			setSessionId(session.session_id);
			toast.success(`Created ${session.session_id}`);
		} catch (error) {
			toast.error(errorMessage(error));
		} finally {
			setState("idle");
		}
	};

	const loadSessionConfig = async () => {
		const normalizedSessionId = sessionId.trim();
		if (!normalizedSessionId) {
			toast.error("Enter a sidecar session id");
			return;
		}
		setState("loading");
		try {
			const config = await sidecar.getSessionConfig(normalizedSessionId);
			setLanguage(config.language);
			if (config.source_language) {
				setSourceLanguage(config.source_language);
			}
			setCatalogText(formatProductCatalog(config.products));
			toast.success(`Loaded ${config.products.length} products`);
		} catch (error) {
			toast.error(errorMessage(error));
		} finally {
			setState("idle");
		}
	};

	const saveProducts = async () => {
		const normalizedSessionId = sessionId.trim();
		if (!normalizedSessionId) {
			toast.error("Enter a sidecar session id");
			return;
		}
		setState("loading");
		try {
			const products = parseProductCatalog(catalogText);
			const config = await sidecar.updateProducts(
				normalizedSessionId,
				products,
			);
			setCatalogText(formatProductCatalog(config.products));
			toast.success(`Saved ${config.products.length} products`);
		} catch (error) {
			toast.error(errorMessage(error));
		} finally {
			setState("idle");
		}
	};

	const ingestSource = async () => {
		const normalizedSessionId = sessionId.trim();
		if (!normalizedSessionId) {
			toast.error("Enter a sidecar session id");
			return;
		}
		if (!selectedAsset) {
			toast.error("Import and select a source video first");
			return;
		}
		setState("ingesting");
		try {
			const result = await sidecar.ingestSourceVideo(
				normalizedSessionId,
				selectedAsset.file,
				{ force: true },
			);
			toast.success(`Ingested ${formatProbe(result.probe)}`);
		} catch (error) {
			toast.error(errorMessage(error));
		} finally {
			setState("idle");
		}
	};

	const loadTimelineSpec = async () => {
		const normalizedSessionId = sessionId.trim();
		if (!normalizedSessionId) {
			toast.error("Enter a sidecar session id");
			return;
		}
		setState("loading");
		try {
			const spec = await fetchTimelineSpec(normalizedSessionId);
			toast.success(`Loaded ${spec.clips.length} timeline clips`);
		} catch (error) {
			toast.error(errorMessage(error));
		} finally {
			setState("idle");
		}
	};

	const analyze = async () => {
		const normalizedSessionId = sessionId.trim();
		if (!normalizedSessionId) {
			toast.error("Enter a sidecar session id");
			return;
		}
		setState("analyzing");
		try {
			await sidecar.analyze(normalizedSessionId, {
				provider,
				model: model.trim() || undefined,
				source_language: sourceLanguage,
				language,
				max_clip_sec: positiveInteger(maxClipSec, 30),
				max_clips: positiveInteger(maxClips, 5),
				force: refreshAnalysis,
			});
			const spec = await fetchTimelineSpec(normalizedSessionId);
			toast.success(`Analyzed ${spec.clips.length} timeline clips`);
		} catch (error) {
			toast.error(errorMessage(error));
		} finally {
			setState("idle");
		}
	};

	const changeProvider = (nextProvider: SidecarProvider) => {
		setModel(
			nextModelForProvider({
				currentModel: model,
				currentProvider: provider,
				nextProvider,
			}),
		);
		setProvider(nextProvider);
	};

	const insertClip = async (clip: TimelineClip, startTime?: number) => {
		if (!selectedAsset) {
			toast.error("Import and select a source video first");
			return 0;
		}
		if (!sourceMatchesSpec) {
			toast.error("Selected source video does not match the timeline spec");
			return 0;
		}
		const normalizedSessionId = sessionId.trim();
		if (!normalizedSessionId) {
			toast.error("Enter a sidecar session id");
			return 0;
		}
		const insertStartTime = startTime ?? editor.playback.getCurrentTime();
		const captionCues = includeText
			? await sidecar.getCaptionCues(normalizedSessionId, clip.clip_id)
			: null;
		const plan = buildAiShortsInsertPlanFromSpec({
			clip,
			sourceAsset: selectedAsset,
			startTime: insertStartTime,
			includeText,
			captionCues,
		});
		for (const element of plan.elements) {
			editor.timeline.insertElement({
				element,
				placement: {
					mode: "auto",
					trackType: element.type === "text" ? "text" : "video",
				},
			});
		}
		return plan.duration;
	};

	const insertOne = async (clip: TimelineClip) => {
		setState("inserting");
		try {
			await insertClip(clip);
			toast.success(`Inserted ${clip.clip_id}`);
		} catch (error) {
			toast.error(errorMessage(error));
		} finally {
			setState("idle");
		}
	};

	const createSceneForClip = async (clip: TimelineClip) => {
		const normalizedSessionId = sessionId.trim();
		if (!normalizedSessionId) {
			toast.error("Enter a sidecar session id");
			return;
		}
		setState("inserting");
		try {
			const sceneId = await editor.scenes.createScene({
				name: clip.clip_id,
				isMain: false,
			});
			await editor.scenes.switchToScene({ sceneId });
			await insertClip(clip, 0);
			await editor.project.updateSettings({
				settings: {
					canvasSize: TIKTOK_CANVAS_SIZE,
					canvasSizeMode: "preset",
				},
				pushHistory: false,
			});
			setExportTarget({
				sessionId: normalizedSessionId,
				clipId: clip.clip_id,
			});
			toast.success(`Created scene for ${clip.clip_id}`);
		} catch (error) {
			toast.error(errorMessage(error));
		} finally {
			setState("idle");
		}
	};

	const insertAll = async () => {
		if (clips.length === 0) return;
		setState("inserting");
		try {
			let nextStartTime = editor.playback.getCurrentTime();
			for (const clip of clips) {
				const duration = await insertClip(clip, nextStartTime);
				nextStartTime += duration;
			}
			toast.success(`Inserted ${clips.length} clips`);
		} catch (error) {
			toast.error(errorMessage(error));
		} finally {
			setState("idle");
		}
	};

	const uploadExportArtifact = async (
		clip: TimelineClip,
		file: File | null,
	) => {
		if (!file) return;
		const normalizedSessionId = sessionId.trim();
		if (!normalizedSessionId) {
			toast.error("Enter a sidecar session id");
			return;
		}
		setState("loading");
		try {
			const artifact = await sidecar.uploadOpenCutExportArtifact(
				normalizedSessionId,
				clip.clip_id,
				file,
			);
			setExportArtifact(artifact);
			setExportQaSummary(null);
			toast.success(`Uploaded ${clip.clip_id} export`);
		} catch (error) {
			toast.error(errorMessage(error));
		} finally {
			setState("idle");
		}
	};

	const runExportQa = async () => {
		const normalizedSessionId = sessionId.trim();
		if (!normalizedSessionId) {
			toast.error("Enter a sidecar session id");
			return;
		}
		const clipIds = clips
			.map((clip) => clip.clip_id)
			.filter((clipId) => uploadedExportArtifacts[clipId]);
		if (clipIds.length === 0) {
			toast.error("Upload at least one OpenCut export first");
			return;
		}
		setState("loading");
		try {
			const draft = await sidecar.draftOpenCutExportManifest(
				normalizedSessionId,
				clipIds,
			);
			if (draft.missing_files.length > 0) {
				toast.error(`Missing exports: ${draft.missing_files.join(", ")}`);
				return;
			}
			const summary = await sidecar.verifyOpenCutExportManifest(
				normalizedSessionId,
				draft.manifest,
			);
			setExportQaSummary(summary);
			toast.success(`QA passed for ${summary.clip_count} clips`);
		} catch (error) {
			toast.error(errorMessage(error));
		} finally {
			setState("idle");
		}
	};

	return (
		<PanelView
			title="AI Shorts"
			actions={
				<Button
					variant="outline"
					size="sm"
					onClick={insertAll}
					disabled={clips.length === 0 || !sourceMatchesSpec || isBusy}
				>
					Insert all
				</Button>
			}
			contentClassName="space-y-3 pb-3"
		>
			<div className="space-y-2 rounded-md border bg-accent/25 p-2">
				<Field label="Source video" htmlFor="ai-shorts-source-video">
					<div className="flex gap-2">
						<Select
							value={selectedMediaId}
							onValueChange={setSelectedMediaId}
							disabled={videoAssets.length === 0}
						>
							<SelectTrigger
								id="ai-shorts-source-video"
								className="h-8 min-w-0 flex-1 bg-background"
							>
								<SelectValue placeholder="Import a video in Media first" />
							</SelectTrigger>
							<SelectContent>
								{videoAssets.map((asset) => (
									<SelectItem key={asset.id} value={asset.id}>
										{asset.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Button
							variant="outline"
							size="sm"
							onClick={ingestSource}
							disabled={!selectedAsset || isBusy}
						>
							Ingest source
						</Button>
					</div>
				</Field>
				{videoAssets.length === 0 && (
					<p className="text-muted-foreground text-xs">
						Use the Media tab to import the original video, then return here.
					</p>
				)}
				<Field label="Sidecar session id" htmlFor="ai-shorts-session-id">
					<div className="flex gap-2">
						<Input
							id="ai-shorts-session-id"
							name="ai-shorts-session-id"
							className="min-w-0"
							value={sessionId}
							onChange={(event) => setSessionId(event.target.value)}
							placeholder="sample-session"
							size="sm"
						/>
						<Button
							variant="outline"
							size="sm"
							onClick={loadSessionConfig}
							disabled={isBusy}
						>
							Load config
						</Button>
					</div>
				</Field>
				<Field label="Session slug" htmlFor="ai-shorts-session-slug">
					<div className="flex gap-2">
						<Input
							id="ai-shorts-session-slug"
							name="ai-shorts-session-slug"
							className="min-w-0"
							value={sessionSlug}
							onChange={(event) => setSessionSlug(event.target.value)}
							placeholder="live-20260709"
							size="sm"
						/>
						<Button
							variant="outline"
							size="sm"
							onClick={createSession}
							disabled={isBusy}
						>
							New
						</Button>
					</div>
				</Field>
				<Field label="Product catalog JSON" htmlFor="ai-shorts-product-catalog">
					<Textarea
						id="ai-shorts-product-catalog"
						name="ai-shorts-product-catalog"
						value={catalogText}
						onChange={(event) => setCatalogText(event.target.value)}
						className="min-h-28 resize-y bg-background font-mono text-xs"
						spellCheck={false}
					/>
				</Field>
				<div className="flex justify-end">
					<Button
						variant="outline"
						size="sm"
						onClick={saveProducts}
						disabled={isBusy}
					>
						Save products
					</Button>
				</div>
				<div className="grid grid-cols-2 gap-2">
					<Field label="Provider" htmlFor="ai-shorts-provider">
						<Select
							value={provider}
							onValueChange={(value) =>
								changeProvider(value as SidecarProvider)
							}
						>
							<SelectTrigger
								id="ai-shorts-provider"
								className="h-8 w-full bg-background"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="openai">OpenAI</SelectItem>
								<SelectItem value="anthropic">Claude</SelectItem>
							</SelectContent>
						</Select>
					</Field>
					<Field label="Model" htmlFor="ai-shorts-model">
						<Input
							id="ai-shorts-model"
							name="ai-shorts-model"
							value={model}
							onChange={(event) => setModel(event.target.value)}
							placeholder={defaultModelForProvider(provider)}
							size="sm"
						/>
					</Field>
					<Field label="Max seconds" htmlFor="ai-shorts-max-seconds">
						<Input
							id="ai-shorts-max-seconds"
							name="ai-shorts-max-seconds"
							value={maxClipSec}
							onChange={(event) => setMaxClipSec(event.target.value)}
							inputMode="numeric"
							size="sm"
						/>
					</Field>
					<Field label="Source language" htmlFor="ai-shorts-source-language">
						<Select
							value={sourceLanguage}
							onValueChange={(value) =>
								setSourceLanguage(value as SourceLanguageCode)
							}
						>
							<SelectTrigger
								id="ai-shorts-source-language"
								className="h-8 w-full bg-background"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ko">Korean</SelectItem>
								<SelectItem value="zh">Chinese</SelectItem>
								<SelectItem value="ja">Japanese</SelectItem>
							</SelectContent>
						</Select>
					</Field>
					<Field label="Caption language" htmlFor="ai-shorts-caption-language">
						<Select
							value={language}
							onValueChange={(value) => setLanguage(value as LanguageCode)}
						>
							<SelectTrigger
								id="ai-shorts-caption-language"
								className="h-8 w-full bg-background"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ja">Japanese</SelectItem>
								<SelectItem value="ko">Korean</SelectItem>
							</SelectContent>
						</Select>
					</Field>
				</div>
				<div className="space-y-2">
					<div className="flex items-center gap-2">
						<Checkbox
							id="ai-shorts-include-text"
							checked={includeText}
							onCheckedChange={(checked) => setIncludeText(checked === true)}
						/>
						<Label
							htmlFor="ai-shorts-include-text"
							className="text-muted-foreground text-xs"
						>
							Add editable text layers
						</Label>
					</div>
					<div className="flex items-center gap-2">
						<Checkbox
							id="ai-shorts-refresh-analysis"
							checked={refreshAnalysis}
							onCheckedChange={(checked) =>
								setRefreshAnalysis(checked === true)
							}
						/>
						<Label
							htmlFor="ai-shorts-refresh-analysis"
							className="text-muted-foreground text-xs"
						>
							Refresh cached outputs
						</Label>
					</div>
				</div>
				<div className="flex items-center justify-between gap-2">
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={loadTimelineSpec}
							disabled={isBusy}
						>
							Load spec
						</Button>
						<Button size="sm" onClick={analyze} disabled={isBusy}>
							Analyze
						</Button>
					</div>
				</div>
				<Field label="Max clips" htmlFor="ai-shorts-max-clips">
					<Input
						id="ai-shorts-max-clips"
						name="ai-shorts-max-clips"
						value={maxClips}
						onChange={(event) => setMaxClips(event.target.value)}
						inputMode="numeric"
						size="sm"
					/>
				</Field>
			</div>

			<div className="space-y-2">
				{timelineSpec && (
					<p className="text-muted-foreground text-xs">
						{timelineSpec.source_video.file} · {clips.length} clips ·{" "}
						{timelineSpec.language.toUpperCase()}
					</p>
				)}
				{timelineSpec && selectedAsset && !sourceMatchesSpec && (
					<p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-amber-600 text-xs dark:text-amber-300">
						Selected source duration {formatTime(selectedAsset.duration ?? 0)}{" "}
						does not match {formatTime(timelineSpec.source_video.duration_sec)}.
					</p>
				)}
				{clips.length > 0 && (
					<div className="flex items-center justify-between gap-2 rounded-md border bg-accent/25 p-2">
						<p className="text-muted-foreground text-xs">
							Export QA {Object.keys(uploadedExportArtifacts).length}/
							{clips.length}
							{exportQaSummary
								? ` · passed ${exportQaSummary.clip_count} clips`
								: ""}
						</p>
						<Button
							size="sm"
							variant="outline"
							onClick={runExportQa}
							disabled={
								Object.keys(uploadedExportArtifacts).length === 0 || isBusy
							}
						>
							Run QA
						</Button>
					</div>
				)}
				{clips.length === 0 ? (
					<div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
						Load a timeline spec or analyze a sidecar session to create editable
						OpenCut clips.
					</div>
				) : (
					clips.map((clip) => (
						<TimelineClipCard
							key={clip.clip_id}
							clip={clip}
							artifact={uploadedExportArtifacts[clip.clip_id]}
							isExportTarget={
								exportTarget?.sessionId === sessionId.trim() &&
								exportTarget.clipId === clip.clip_id
							}
							insertDisabled={!sourceMatchesSpec || isBusy}
							uploadDisabled={isBusy}
							onInsert={() => insertOne(clip)}
							onCreateScene={() => createSceneForClip(clip)}
							onUseAsExportTarget={() => {
								const normalizedSessionId = sessionId.trim();
								if (!normalizedSessionId) {
									toast.error("Enter a sidecar session id");
									return;
								}
								setExportTarget({
									sessionId: normalizedSessionId,
									clipId: clip.clip_id,
								});
								toast.success(
									`${clip.clip_id} is the OpenCut export QA target`,
								);
							}}
							onUploadExport={(file) => uploadExportArtifact(clip, file)}
						/>
					))
				)}
			</div>
		</PanelView>
	);
}

function TimelineClipCard({
	clip,
	artifact,
	isExportTarget,
	insertDisabled,
	uploadDisabled,
	onInsert,
	onCreateScene,
	onUseAsExportTarget,
	onUploadExport,
}: {
	clip: TimelineClip;
	artifact?: { video_file: string; byte_size: number };
	isExportTarget: boolean;
	insertDisabled: boolean;
	uploadDisabled: boolean;
	onInsert: () => void;
	onCreateScene: () => void;
	onUseAsExportTarget: () => void;
	onUploadExport: (file: File | null) => void;
}) {
	return (
		<div className="space-y-2 rounded-md border bg-background p-2">
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0">
					<div className="text-sm font-medium">{clip.clip_id}</div>
					<div className="text-muted-foreground text-xs">
						{formatRange(clip.source_range_sec[0], clip.source_range_sec[1])} ·
						score {Math.round(clip.score)}
					</div>
				</div>
				<div className="flex shrink-0 gap-1">
					<Button
						size="icon"
						variant={isExportTarget ? "default" : "outline"}
						onClick={onUseAsExportTarget}
						disabled={uploadDisabled}
						title="Use for OpenCut export QA"
						aria-label={`Use ${clip.clip_id} for OpenCut export QA`}
					>
						<Target className="size-4" />
					</Button>
					<Button
						size="sm"
						variant="outline"
						onClick={onInsert}
						disabled={insertDisabled}
					>
						Insert
					</Button>
				</div>
			</div>
			<Button
				size="sm"
				variant="secondary"
				className="w-full"
				onClick={onCreateScene}
				disabled={insertDisabled}
			>
				Create scene
			</Button>
			{clip.reason && (
				<p className="text-muted-foreground line-clamp-2 text-xs">
					{clip.reason}
				</p>
			)}
			<Textarea
				value={clip.hook_text || clip.caption_file}
				readOnly
				className="min-h-14 bg-accent/40 text-xs"
			/>
			<div className="space-y-1">
				<Input
					type="file"
					accept="video/mp4,video/webm"
					className="h-8 text-xs"
					disabled={uploadDisabled}
					onChange={(event) => {
						onUploadExport(event.target.files?.[0] ?? null);
						event.currentTarget.value = "";
					}}
				/>
				{artifact && (
					<p className="text-muted-foreground text-xs">
						Uploaded {artifact.video_file} · {formatBytes(artifact.byte_size)}
					</p>
				)}
			</div>
		</div>
	);
}

function Field({
	label,
	htmlFor,
	children,
}: {
	label: string;
	htmlFor?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="space-y-1">
			<Label htmlFor={htmlFor} className="text-muted-foreground text-xs">
				{label}
			</Label>
			{children}
		</div>
	);
}

function isVideoAsset(
	asset: MediaAsset,
): asset is MediaAsset & { type: "video" } {
	return asset.type === "video" && !asset.ephemeral;
}

function positiveInteger(value: string, fallback: number) {
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeSlug(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9-]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function formatRange(start: number, end: number) {
	return `${formatTime(start)}-${formatTime(end)}`;
}

function formatTime(seconds: number) {
	const total = Math.max(0, Math.floor(seconds));
	const minutes = Math.floor(total / 60);
	const rest = total % 60;
	return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

function formatProbe(probe: {
	duration_sec: number;
	width: number;
	height: number;
	orientation: string;
}) {
	return `${probe.orientation} ${probe.width}x${probe.height} ${formatTime(probe.duration_sec)}`;
}

function formatBytes(bytes: number) {
	if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function errorMessage(error: unknown) {
	return error instanceof Error ? error.message : "Unexpected sidecar error";
}
