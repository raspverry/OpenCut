"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { buildAiShortsImportPlan } from "@/ai-shorts/import-plan";
import { importAiShortsIntoEditor } from "@/ai-shorts/import-into-editor";
import { fetchAiShortsImportBundle } from "@/ai-shorts/sidecar-client";
import { useEditor } from "@/editor/use-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

const DEFAULT_SIDECAR_URL = "http://127.0.0.1:8789";

export function AiShortsButton() {
	const editor = useEditor();
	const videoAssets = useEditor((e) =>
		e.media.getAssets().filter((asset) => asset.type === "video"),
	);
	const [open, setOpen] = useState(false);
	const [baseUrl, setBaseUrl] = useState(DEFAULT_SIDECAR_URL);
	const [sessionId, setSessionId] = useState("");
	const [sourceAssetId, setSourceAssetId] = useState("");
	const [status, setStatus] = useState("Ready");
	const [isImporting, setIsImporting] = useState(false);
	const selectedSourceAssetId = sourceAssetId || videoAssets[0]?.id || "";
	const sourceAsset = useMemo(
		() =>
			videoAssets.find((asset) => asset.id === selectedSourceAssetId) ?? null,
		[videoAssets, selectedSourceAssetId],
	);

	async function handleImport() {
		if (!sessionId.trim()) {
			setStatus("Session ID is required");
			return;
		}
		if (!sourceAsset) {
			setStatus("Import the source video first");
			return;
		}

		setIsImporting(true);
		setStatus("Loading sidecar timeline...");
		try {
			const bundle = await fetchAiShortsImportBundle({
				baseUrl: baseUrl.trim(),
				sessionId: sessionId.trim(),
			});
			const plan = buildAiShortsImportPlan({
				spec: bundle.spec,
				captionsByClipId: bundle.captionsByClipId,
				sourceAsset,
			});
			const result = await importAiShortsIntoEditor({ editor, plan });
			setStatus(
				`Imported ${result.clipCount} clips, ${result.captionCount} captions`,
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
					<label
						className="grid gap-1.5 text-xs"
						htmlFor="ai-shorts-source-asset"
					>
						<span className="text-muted-foreground">Source video asset</span>
						<select
							id="ai-shorts-source-asset"
							className="border-border bg-background h-8 rounded-md border px-2 text-xs outline-none"
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
					<div className="flex items-center gap-3">
						<Button
							size="sm"
							className="gap-1.5"
							disabled={isImporting}
							onClick={handleImport}
						>
							<Sparkles className="size-3.5" />
							{isImporting ? "Importing..." : "Import Timeline"}
						</Button>
						<p className="text-muted-foreground min-w-0 truncate text-xs">
							{status}
						</p>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
