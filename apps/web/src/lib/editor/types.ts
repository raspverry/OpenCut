export type LanguageCode = 'ja' | 'ko'

export type SidecarProvider = 'anthropic' | 'openai'

export type SessionResponse = {
  session_id: string
  path: string
}

export type IngestResponse = {
  session_id: string
  probe: {
    duration_sec: number
    width: number
    height: number
    orientation: 'vertical' | 'horizontal'
  }
}

export type CandidateClip = {
  clip_id: string
  product_id: string | null
  start_sec: number
  end_sec: number
  segment_range: [number, number]
  score: number
  reason: string
  hook_text: string
  caption: string
  hashtags: string[]
}

export type Candidates = {
  session_id: string
  llm_model: string
  generated_at: string
  clips: CandidateClip[]
}

export type AnalyzeResponse = {
  session_id: string
  provider: SidecarProvider
  language: LanguageCode
  max_clip_sec: number
  candidates: Candidates
}

export type TimelineSpec = {
  session_id: string
  renderer: 'opencut'
  language: LanguageCode
  source_video: TimelineSourceVideo
  fingerprint: string
  clips: TimelineClip[]
}

export type TimelineSourceVideo = {
  file: string
  duration_sec: number
}

export type TimelineClip = {
  clip_id: string
  product_id: string | null
  source_range_sec: [number, number]
  timeline_start_sec: number
  hook_text: string
  caption_file: string
  caption_style: string
  score: number
  reason: string
}
