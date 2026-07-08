import type {
	AiShortsAnalyzeRequest,
	AiShortsAnalyzeResponse,
	AiShortsCaptionCueFile,
	AiShortsProvider,
	AiShortsSourceLanguage,
	AiShortsTimelineSpec,
} from "./types";

type Fetcher = typeof fetch;

export async function analyzeAiShortsSession({
	baseUrl,
	sessionId,
	request,
	fetcher = fetch,
}: {
	baseUrl: string;
	sessionId: string;
	request: AiShortsAnalyzeRequest;
	fetcher?: Fetcher;
}): Promise<AiShortsAnalyzeResponse> {
	const value = await getJson({
		url: sidecarUrl({
			baseUrl,
			path: `/api/sessions/${encodeURIComponent(sessionId)}/analyze`,
		}),
		fetcher,
		init: {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(request),
		},
	});
	return parseAnalyzeResponse(value);
}

export async function fetchAiShortsTimelineSpec({
	baseUrl,
	sessionId,
	fetcher = fetch,
}: {
	baseUrl: string;
	sessionId: string;
	fetcher?: Fetcher;
}): Promise<AiShortsTimelineSpec> {
	const value = await getJson({
		url: sidecarUrl({
			baseUrl,
			path: `/api/sessions/${encodeURIComponent(sessionId)}/timeline-spec`,
		}),
		fetcher,
	});
	return parseTimelineSpec(value);
}

export async function fetchAiShortsCaptionCues({
	baseUrl,
	sessionId,
	clipId,
	fetcher = fetch,
}: {
	baseUrl: string;
	sessionId: string;
	clipId: string;
	fetcher?: Fetcher;
}): Promise<AiShortsCaptionCueFile> {
	const value = await getJson({
		url: sidecarUrl({
			baseUrl,
			path: `/api/sessions/${encodeURIComponent(sessionId)}/caption-cues/${encodeURIComponent(clipId)}`,
		}),
		fetcher,
	});
	return parseCaptionCueFile(value);
}

export async function fetchAiShortsImportBundle({
	baseUrl,
	sessionId,
	fetcher = fetch,
}: {
	baseUrl: string;
	sessionId: string;
	fetcher?: Fetcher;
}): Promise<{
	spec: AiShortsTimelineSpec;
	captionsByClipId: Map<string, AiShortsCaptionCueFile>;
}> {
	const spec = await fetchAiShortsTimelineSpec({ baseUrl, sessionId, fetcher });
	const captionFiles = await Promise.all(
		spec.clips.map((clip) =>
			fetchAiShortsCaptionCues({
				baseUrl,
				sessionId,
				clipId: clip.clip_id,
				fetcher,
			}),
		),
	);
	return {
		spec,
		captionsByClipId: new Map(
			captionFiles.map((cueFile) => [cueFile.clip_id, cueFile]),
		),
	};
}

function sidecarUrl({
	baseUrl,
	path,
}: {
	baseUrl: string;
	path: string;
}): string {
	const url = new URL(baseUrl);
	url.pathname = `${url.pathname.replace(/\/$/, "")}${path}`;
	return url.toString();
}

async function getJson({
	url,
	fetcher,
	init,
}: {
	url: string;
	fetcher: Fetcher;
	init?: RequestInit;
}): Promise<unknown> {
	const response = await fetcher(url, init);
	if (!response.ok) {
		const detail = await readErrorDetail(response);
		throw new Error(detail || `Sidecar request failed: ${response.status}`);
	}
	return response.json();
}

async function readErrorDetail(response: Response): Promise<string> {
	try {
		const body = await response.json();
		if (body && typeof body.detail === "string") {
			return body.detail;
		}
	} catch {
		return "";
	}
	return "";
}

function parseAnalyzeResponse(value: unknown): AiShortsAnalyzeResponse {
	const record = expectRecord({ value: value, name: "analyze response" });
	const candidates = expectRecord({
		value: record.candidates,
		name: "analyze candidates",
	});
	return {
		session_id: expectString({ value: record.session_id, name: "session_id" }),
		provider: parseProvider(record.provider),
		source_language: parseSourceLanguage(record.source_language),
		language: parseLanguage(record.language),
		max_clip_sec: expectNumber({
			value: record.max_clip_sec,
			name: "max_clip_sec",
		}),
		clip_count: expectArray({ value: candidates.clips, name: "clips" }).length,
	};
}

function parseTimelineSpec(value: unknown): AiShortsTimelineSpec {
	const record = expectRecord({ value: value, name: "timeline spec" });
	return {
		session_id: expectString({ value: record.session_id, name: "session_id" }),
		renderer: expectLiteral({
			value: record.renderer,
			literal: "opencut",
			name: "renderer",
		}),
		language: parseLanguage(record.language),
		source_video: parseSourceVideo(record.source_video),
		fingerprint: expectString({
			value: record.fingerprint,
			name: "fingerprint",
		}),
		clips: expectArray({ value: record.clips, name: "clips" }).map(
			parseTimelineClip,
		),
	};
}

function parseTimelineClip(value: unknown) {
	const record = expectRecord({ value: value, name: "timeline clip" });
	return {
		clip_id: expectString({ value: record.clip_id, name: "clip_id" }),
		product_id:
			record.product_id === null
				? null
				: expectString({ value: record.product_id, name: "product_id" }),
		source_range_sec: expectNumberTuple({
			value: record.source_range_sec,
			name: "source_range_sec",
		}),
		timeline_start_sec: expectNumber({
			value: record.timeline_start_sec,
			name: "timeline_start_sec",
		}),
		hook_text: expectString({ value: record.hook_text, name: "hook_text" }),
		caption_file: expectString({
			value: record.caption_file,
			name: "caption_file",
		}),
		caption_style: expectString({
			value: record.caption_style,
			name: "caption_style",
		}),
		score: expectNumber({ value: record.score, name: "score" }),
		reason: expectString({ value: record.reason, name: "reason" }),
	};
}

function parseCaptionCueFile(value: unknown): AiShortsCaptionCueFile {
	const record = expectRecord({ value: value, name: "caption cue file" });
	return {
		clip_id: expectString({ value: record.clip_id, name: "clip_id" }),
		language: parseLanguage(record.language),
		preset: expectString({ value: record.preset, name: "preset" }),
		source_range_sec: expectNumberTuple({
			value: record.source_range_sec,
			name: "source_range_sec",
		}),
		cues: expectArray({ value: record.cues, name: "cues" }).map(
			parseCaptionCue,
		),
		style: parseCaptionStyle(record.style),
	};
}

function parseCaptionCue(value: unknown) {
	const record = expectRecord({ value: value, name: "caption cue" });
	return {
		cue_id: expectString({ value: record.cue_id, name: "cue_id" }),
		source_segment_id: expectNumber({
			value: record.source_segment_id,
			name: "source_segment_id",
		}),
		start_sec: expectNumber({ value: record.start_sec, name: "start_sec" }),
		end_sec: expectNumber({ value: record.end_sec, name: "end_sec" }),
		text: expectString({ value: record.text, name: "text" }),
		words: expectArray({ value: record.words, name: "words" }).map(
			parseCaptionWord,
		),
	};
}

function parseCaptionWord(value: unknown) {
	const record = expectRecord({ value: value, name: "caption word" });
	return {
		w: expectString({ value: record.w, name: "w" }),
		start: expectNumber({ value: record.start, name: "start" }),
		end: expectNumber({ value: record.end, name: "end" }),
		confidence:
			record.confidence === null
				? null
				: expectNumber({ value: record.confidence, name: "confidence" }),
	};
}

function parseSourceVideo(value: unknown) {
	const record = expectRecord({ value: value, name: "source_video" });
	return {
		file: expectString({ value: record.file, name: "source_video.file" }),
		duration_sec: expectNumber({
			value: record.duration_sec,
			name: "source_video.duration_sec",
		}),
	};
}

function parseCaptionStyle(value: unknown): AiShortsCaptionCueFile["style"] {
	const record = expectRecord({ value: value, name: "caption style" });
	const safeArea = expectRecord({ value: record.safe_area, name: "safe_area" });
	return {
		format: expectOneOf({
			value: record.format,
			options: ["plain", "word_pop", "karaoke"],
			name: "format",
		}),
		font_family: expectString({
			value: record.font_family,
			name: "font_family",
		}),
		max_chars_per_line: expectNumber({
			value: record.max_chars_per_line,
			name: "max_chars_per_line",
		}),
		max_lines: expectNumber({ value: record.max_lines, name: "max_lines" }),
		safe_area: {
			anchor: expectOneOf({
				value: safeArea.anchor,
				options: ["bottom", "top", "center"],
				name: "safe_area.anchor",
			}),
			margin_px: expectNumber({
				value: safeArea.margin_px,
				name: "safe_area.margin_px",
			}),
		},
	};
}

function parseLanguage(value: unknown): "ja" | "ko" {
	return expectOneOf({ value: value, options: ["ja", "ko"], name: "language" });
}

function parseSourceLanguage(value: unknown): AiShortsSourceLanguage {
	return expectOneOf({
		value: value,
		options: ["ja", "ko", "zh"],
		name: "source_language",
	});
}

function parseProvider(value: unknown): AiShortsProvider {
	return expectOneOf({
		value: value,
		options: ["anthropic", "openai"],
		name: "provider",
	});
}

function expectRecord({
	value,
	name,
}: {
	value: unknown;
	name: string;
}): Record<string, unknown> {
	if (!isRecord(value)) {
		throw new Error(`Invalid sidecar ${name}`);
	}
	return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function expectArray({
	value,
	name,
}: {
	value: unknown;
	name: string;
}): unknown[] {
	if (!Array.isArray(value)) {
		throw new Error(`Invalid sidecar ${name}`);
	}
	return value;
}

function expectString({
	value,
	name,
}: {
	value: unknown;
	name: string;
}): string {
	if (typeof value !== "string") {
		throw new Error(`Invalid sidecar ${name}`);
	}
	return value;
}

function expectNumber({
	value,
	name,
}: {
	value: unknown;
	name: string;
}): number {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		throw new Error(`Invalid sidecar ${name}`);
	}
	return value;
}

function expectNumberTuple({
	value,
	name,
}: {
	value: unknown;
	name: string;
}): [number, number] {
	if (!Array.isArray(value) || value.length !== 2) {
		throw new Error(`Invalid sidecar ${name}`);
	}
	return [
		expectNumber({ value: value[0], name }),
		expectNumber({ value: value[1], name }),
	];
}

function expectLiteral<T extends string>({
	value,
	literal,
	name,
}: {
	value: unknown;
	literal: T;
	name: string;
}): T {
	if (value !== literal) {
		throw new Error(`Invalid sidecar ${name}`);
	}
	return literal;
}

function expectOneOf<T extends string>({
	value,
	options,
	name,
}: {
	value: unknown;
	options: readonly T[];
	name: string;
}): T {
	for (const option of options) {
		if (value === option) {
			return option;
		}
	}
	throw new Error(`Invalid sidecar ${name}`);
}
