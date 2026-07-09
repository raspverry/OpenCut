export type LanguageCode = 'ja' | 'ko'

export type SourceLanguageCode = 'ja' | 'ko' | 'zh'

export type SidecarProvider = 'anthropic' | 'openai'

export type Product = {
  id: string
  name: string
  aliases: string[]
  price: string
  selling_points: string[]
  tiktok_shop_note: string
}

export type SessionConfig = {
  session_id: string
  title: string
  language: LanguageCode
  source_language: SourceLanguageCode | null
  recorded_at: string
  products: Product[]
  defaults: Record<string, unknown>
}

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
  model: string
  source_language: SourceLanguageCode
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

export type OpenCutExportManifestDraftRequest = {
  clip_ids: string[]
}

export type OpenCutExportManifestDraft = {
  manifest: OpenCutExportManifest
  missing_files: string[]
}

export type OpenCutExportArtifact = {
  session_id: string
  clip_id: string
  video_file: string
  byte_size: number
}

export type OpenCutExportQaResponse = {
  session_id: string
  clip_count: number
  total_duration_sec: number
  by_product: Record<string, number>
}

export type ClipStateStatus = 'pending' | 'approved' | 'rejected'

export type ClipState = {
  clip_id: string
  status: ClipStateStatus
  rendered_at: string
  render_params_hash: string
  trim_offset_start: number
  trim_offset_end: number
  caption: string
  hook_text: string
  review_note: string
  review_tags: string[]
}

export type ClipStateUpdate = Partial<
  Pick<
    ClipState,
    | 'status'
    | 'caption'
    | 'hook_text'
    | 'trim_offset_start'
    | 'trim_offset_end'
    | 'review_note'
    | 'review_tags'
  >
>

export type CaptionCueFile = {
  clip_id: string
  language: LanguageCode
  preset: string
  source_range_sec: [number, number]
  cues: CaptionCue[]
  style: {
    format: 'plain' | 'word_pop' | 'karaoke'
    font_family: string
    max_chars_per_line: number
    max_lines: number
    safe_area: {
      anchor: 'bottom' | 'top' | 'center'
      margin_px: number
    }
  }
}

export type CaptionCue = {
  cue_id: string
  source_segment_id: number
  start_sec: number
  end_sec: number
  text: string
  words: Array<{
    w: string
    start: number
    end: number
    confidence: number | null
  }>
}
