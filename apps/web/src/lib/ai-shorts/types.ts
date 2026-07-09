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

export type AnalyzeResponse = {
	session_id: string;
	provider: SidecarProvider;
	model: string;
	source_language: SourceLanguageCode;
	language: LanguageCode;
	max_clip_sec: number;
	candidates: Candidates;
};
