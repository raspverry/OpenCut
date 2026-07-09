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
import { createSidecarClient } from "@/lib/ai-shorts/sidecar-client";
import { buildAiShortsInsertPlan } from "@/lib/ai-shorts/timeline";
import type {
	CandidateClip,
	LanguageCode,
	SidecarProvider,
	SourceLanguageCode,
} from "@/lib/ai-shorts/types";
import type { MediaAsset } from "@/lib/media/types";
import { cn } from "@/utils/ui";
import { toast } from "sonner";

type LoadState = "idle" | "loading" | "analyzing" | "inserting";

export function AiShortsView() {
	const editor = useEditor();
	const mediaAssets = useEditor((e) => e.media.getAssets());
	const videoAssets = useMemo(
		() => mediaAssets.filter(isVideoAsset),
		[mediaAssets],
	);
	const sidecar = useMemo(() => createSidecarClient(), []);

	const [sessionId, setSessionId] = useState("");
	const [selectedMediaId, setSelectedMediaId] = useState("");
	const [provider, setProvider] = useState<SidecarProvider>("openai");
	const [sourceLanguage, setSourceLanguage] =
		useState<SourceLanguageCode>("ko");
	const [language, setLanguage] = useState<LanguageCode>("ja");
	const [maxClipSec, setMaxClipSec] = useState("30");
	const [maxClips, setMaxClips] = useState("5");
	const [includeText, setIncludeText] = useState(true);
	const [clips, setClips] = useState<CandidateClip[]>([]);
	const [state, setState] = useState<LoadState>("idle");

	useEffect(() => {
		if (!selectedMediaId && videoAssets[0]) {
			setSelectedMediaId(videoAssets[0].id);
		}
	}, [selectedMediaId, videoAssets]);

	const selectedAsset = videoAssets.find((asset) => asset.id === selectedMediaId);
	const isBusy = state !== "idle";

	const loadCandidates = async () => {
		const normalizedSessionId = sessionId.trim();
		if (!normalizedSessionId) {
			toast.error("Enter a sidecar session id");
			return;
		}
		setState("loading");
		try {
			const result = await sidecar.getCandidates(normalizedSessionId);
			setClips(result.clips);
			toast.success(`Loaded ${result.clips.length} candidate clips`);
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
			const result = await sidecar.analyze(normalizedSessionId, {
				provider,
				source_language: sourceLanguage,
				language,
				max_clip_sec: positiveInteger(maxClipSec, 30),
				max_clips: positiveInteger(maxClips, 5),
				force: true,
			});
			setClips(result.candidates.clips);
			toast.success(
				`Analyzed ${result.candidates.clips.length} candidate clips`,
			);
		} catch (error) {
			toast.error(errorMessage(error));
		} finally {
			setState("idle");
		}
	};

	const insertClip = (clip: CandidateClip, startTime?: number) => {
		if (!selectedAsset) {
			toast.error("Import and select a source video first");
			return 0;
		}
		const insertStartTime = startTime ?? editor.playback.getCurrentTime();
		const plan = buildAiShortsInsertPlan({
			clip,
			sourceAsset: selectedAsset,
			startTime: insertStartTime,
			includeText,
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

	const insertOne = (clip: CandidateClip) => {
		setState("inserting");
		try {
			insertClip(clip);
			toast.success(`Inserted ${clip.clip_id}`);
		} finally {
			setState("idle");
		}
	};

	const insertAll = () => {
		if (clips.length === 0) return;
		setState("inserting");
		try {
			let nextStartTime = editor.playback.getCurrentTime();
			for (const clip of clips) {
				const duration = insertClip(clip, nextStartTime);
				nextStartTime += duration;
			}
			toast.success(`Inserted ${clips.length} clips`);
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
					disabled={clips.length === 0 || !selectedAsset || isBusy}
				>
					Insert all
				</Button>
			}
			contentClassName="space-y-3 pb-3"
		>
			<div className="space-y-2 rounded-md border bg-accent/25 p-2">
				<Field label="Source video">
					<Select
						value={selectedMediaId}
						onValueChange={setSelectedMediaId}
						disabled={videoAssets.length === 0}
					>
						<SelectTrigger className="h-8 w-full bg-background">
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
				</Field>
				{videoAssets.length === 0 && (
					<p className="text-muted-foreground text-xs">
						Use the Media tab to import the original video, then return here.
					</p>
				)}
				<Field label="Sidecar session id">
					<Input
						value={sessionId}
						onChange={(event) => setSessionId(event.target.value)}
						placeholder="sample-session"
						size="sm"
					/>
				</Field>
				<div className="grid grid-cols-2 gap-2">
					<Field label="Provider">
						<Select
							value={provider}
							onValueChange={(value) => setProvider(value as SidecarProvider)}
						>
							<SelectTrigger className="h-8 w-full bg-background">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="openai">OpenAI</SelectItem>
								<SelectItem value="anthropic">Claude</SelectItem>
							</SelectContent>
						</Select>
					</Field>
					<Field label="Max seconds">
						<Input
							value={maxClipSec}
							onChange={(event) => setMaxClipSec(event.target.value)}
							inputMode="numeric"
							size="sm"
						/>
					</Field>
					<Field label="Source language">
						<Select
							value={sourceLanguage}
							onValueChange={(value) =>
								setSourceLanguage(value as SourceLanguageCode)
							}
						>
							<SelectTrigger className="h-8 w-full bg-background">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ko">Korean</SelectItem>
								<SelectItem value="zh">Chinese</SelectItem>
								<SelectItem value="ja">Japanese</SelectItem>
							</SelectContent>
						</Select>
					</Field>
					<Field label="Caption language">
						<Select
							value={language}
							onValueChange={(value) => setLanguage(value as LanguageCode)}
						>
							<SelectTrigger className="h-8 w-full bg-background">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ja">Japanese</SelectItem>
								<SelectItem value="ko">Korean</SelectItem>
							</SelectContent>
						</Select>
					</Field>
				</div>
				<div className="flex items-center justify-between gap-2">
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
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={loadCandidates}
							disabled={isBusy}
						>
							Load
						</Button>
						<Button size="sm" onClick={analyze} disabled={isBusy}>
							Analyze
						</Button>
					</div>
				</div>
				<Field label="Max clips">
					<Input
						value={maxClips}
						onChange={(event) => setMaxClips(event.target.value)}
						inputMode="numeric"
						size="sm"
					/>
				</Field>
			</div>

			<div className="space-y-2">
				{clips.length === 0 ? (
					<div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
						Load or analyze a sidecar session to create editable OpenCut clips.
					</div>
				) : (
					clips.map((clip) => (
						<CandidateCard
							key={clip.clip_id}
							clip={clip}
							disabled={!selectedAsset || isBusy}
							onInsert={() => insertOne(clip)}
						/>
					))
				)}
			</div>
		</PanelView>
	);
}

function CandidateCard({
	clip,
	disabled,
	onInsert,
}: {
	clip: CandidateClip;
	disabled: boolean;
	onInsert: () => void;
}) {
	return (
		<div className="space-y-2 rounded-md border bg-background p-2">
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0">
					<div className="text-sm font-medium">{clip.clip_id}</div>
					<div className="text-muted-foreground text-xs">
						{formatRange(clip.start_sec, clip.end_sec)} · score{" "}
						{Math.round(clip.score)}
					</div>
				</div>
				<Button size="sm" variant="outline" onClick={onInsert} disabled={disabled}>
					Insert
				</Button>
			</div>
			{clip.reason && (
				<p className="text-muted-foreground line-clamp-2 text-xs">
					{clip.reason}
				</p>
			)}
			<Textarea
				value={clip.caption || clip.hook_text}
				readOnly
				className={cn(
					"min-h-14 bg-accent/40 text-xs",
					!clip.caption && "text-muted-foreground",
				)}
			/>
		</div>
	);
}

function Field({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="space-y-1">
			<Label className="text-muted-foreground text-xs">{label}</Label>
			{children}
		</div>
	);
}

function isVideoAsset(asset: MediaAsset): asset is MediaAsset & { type: "video" } {
	return asset.type === "video" && !asset.ephemeral;
}

function positiveInteger(value: string, fallback: number) {
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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

function errorMessage(error: unknown) {
	return error instanceof Error ? error.message : "Unexpected sidecar error";
}
