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

export type OpenCutExportReport = {
  session_id: string
  renderer: 'opencut'
  exported_at: string
  fingerprint: string
  ok: boolean
  clips: OpenCutExportReportClip[]
}

export type OpenCutExportReportClip = {
  clip_id: string
  video_file: string
  duration_sec: number
  integrated_lufs: number
  subtitle_evidence_file: string
  errors: string[]
}

export type OpenCutExportManifest = {
  session_id: string
  exported_at: string
  fingerprint: string
  clips: OpenCutExportManifestClip[]
}

export type OpenCutExportManifestClip = {
  clip_id: string
  video_file: string
}

export type OpenCutExportQaResponse = {
  session_id: string
  clip_count: number
  total_duration_sec: number
  by_product: Record<string, number>
}
