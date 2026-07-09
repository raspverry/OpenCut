export type LanguageCode = "ja" | "ko";

export type SourceLanguageCode = "ja" | "ko" | "zh";

export type SidecarProvider = "anthropic" | "openai";

export type CandidateClip = {
	clip_id: string;
	product_id: string | null;
	start_sec: number;
	end_sec: number;
	segment_range: [number, number];
	score: number;
	reason: string;
	hook_text: string;
	caption: string;
	transcript_preview?: string;
	hashtags: string[];
};

export type Candidates = {
	session_id: string;
	llm_model: string;
	generated_at: string;
	clips: CandidateClip[];
};

export type TimelineSourceVideo = {
	file: string;
	duration_sec: number;
};

export type TimelineClip = {
	clip_id: string;
	product_id: string | null;
	source_range_sec: [number, number];
	timeline_start_sec: number;
	hook_text: string;
	caption_file: string;
	caption_style: string;
	score: number;
	reason: string;
};

export type TimelineSpec = {
	session_id: string;
	renderer: "opencut";
	language: LanguageCode;
	source_video: TimelineSourceVideo;
	fingerprint: string;
	clips: TimelineClip[];
};

export type CaptionWord = {
	w: string;
	start: number;
	end: number;
	confidence?: number | null;
};

export type CaptionCue = {
	cue_id: string;
	source_segment_id: number;
	start_sec: number;
	end_sec: number;
	text: string;
	words: CaptionWord[];
};

export type CaptionStyle = {
	format: "plain" | "word_pop" | "karaoke";
	font_family: string;
	max_chars_per_line: number;
	max_lines: number;
	safe_area: {
		anchor: "bottom" | "top" | "center";
		margin_px: number;
	};
};

export type CaptionCueFile = {
	clip_id: string;
	language: LanguageCode;
	preset: string;
	source_range_sec: [number, number];
	cues: CaptionCue[];
	style: CaptionStyle;
};

export type AnalyzeResponse = {
	session_id: string;
	provider: SidecarProvider;
	model: string;
	source_language: SourceLanguageCode;
	language: LanguageCode;
	max_clip_sec: number;
	candidates: Candidates;
};
