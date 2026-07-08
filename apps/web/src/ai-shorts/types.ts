export type AiShortsProvider = "anthropic" | "openai";
export type AiShortsLanguage = "ja" | "ko";
export type AiShortsSourceLanguage = AiShortsLanguage | "zh";

export interface AiShortsAnalyzeRequest {
	provider: AiShortsProvider;
	source_language: AiShortsSourceLanguage;
	language: AiShortsLanguage;
	max_clip_sec: number;
	max_clips?: number;
	force: boolean;
}

export interface AiShortsAnalyzeResponse {
	session_id: string;
	provider: AiShortsProvider;
	source_language: AiShortsSourceLanguage;
	language: AiShortsLanguage;
	max_clip_sec: number;
	clip_count: number;
}

export interface AiShortsTimelineSpec {
	session_id: string;
	renderer: "opencut";
	language: AiShortsLanguage;
	source_video: {
		file: string;
		duration_sec: number;
	};
	fingerprint: string;
	clips: AiShortsTimelineClip[];
}

export interface AiShortsTimelineClip {
	clip_id: string;
	product_id: string | null;
	source_range_sec: [number, number];
	timeline_start_sec: number;
	hook_text: string;
	caption_file: string;
	caption_style: string;
	score: number;
	reason: string;
}

export interface AiShortsCaptionCueFile {
	clip_id: string;
	language: AiShortsLanguage;
	preset: string;
	source_range_sec: [number, number];
	cues: AiShortsCaptionCue[];
	style: {
		format: "plain" | "word_pop" | "karaoke";
		font_family: string;
		max_chars_per_line: number;
		max_lines: number;
		safe_area: {
			anchor: "bottom" | "top" | "center";
			margin_px: number;
		};
	};
}

export interface AiShortsCaptionCue {
	cue_id: string;
	source_segment_id: number;
	start_sec: number;
	end_sec: number;
	text: string;
	words: Array<{
		w: string;
		start: number;
		end: number;
		confidence: number | null;
	}>;
}
