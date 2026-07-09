import type {
	AnalyzeResponse,
	CaptionCueFile,
	LanguageCode,
	SidecarProvider,
	SourceLanguageCode,
	TimelineSpec,
} from "./types";

const DEFAULT_BASE_URL = "http://127.0.0.1:8789";

type Fetcher = (
	input: string | URL | Request,
	init?: RequestInit,
) => Promise<Response>;

export type AnalyzeRequest = {
	provider?: SidecarProvider;
	model?: string;
	source_language?: SourceLanguageCode;
	language?: LanguageCode;
	max_clip_sec?: number;
	max_clips?: number;
	force?: boolean;
};

export type SidecarClient = ReturnType<typeof createSidecarClient>;

export class SidecarError extends Error {
	readonly status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = "SidecarError";
		this.status = status;
	}
}

export function createSidecarClient(
	options: { baseUrl?: string; fetcher?: Fetcher } = {},
) {
	const baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);
	const fetcher = options.fetcher ?? globalThis.fetch?.bind(globalThis);
	if (!fetcher) {
		throw new SidecarError("sidecar API fetch is unavailable", 0);
	}

	return {
		analyze(sessionId: string, payload: AnalyzeRequest) {
			return requestJson<AnalyzeResponse>(
				fetcher,
				`${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/analyze`,
				{
					method: "POST",
					body: JSON.stringify(payload),
				},
			);
		},
		getTimelineSpec(sessionId: string) {
			return requestJson<TimelineSpec>(
				fetcher,
				`${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/timeline-spec`,
			);
		},
		getCaptionCues(sessionId: string, clipId: string) {
			return requestJson<CaptionCueFile>(
				fetcher,
				`${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/caption-cues/${encodeURIComponent(clipId)}`,
			);
		},
	};
}

async function requestJson<T>(
	fetcher: Fetcher,
	url: string,
	init: RequestInit = {},
): Promise<T> {
	const response = await fetcher(url, {
		...init,
		headers: {
			"content-type": "application/json",
			...init.headers,
		},
	});
	const text = await response.text();
	const data = parseJson(text);
	if (!response.ok) {
		throw new SidecarError(errorMessage(data, response.status), response.status);
	}
	return data as T;
}

function normalizeBaseUrl(baseUrl: string) {
	return baseUrl.replace(/\/+$/, "");
}

function parseJson(text: string): unknown {
	if (!text) return null;
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}

function errorMessage(data: unknown, status: number) {
	if (
		data &&
		typeof data === "object" &&
		"detail" in data &&
		typeof data.detail === "string"
	) {
		return data.detail;
	}
	return `sidecar API request failed (${status})`;
}
