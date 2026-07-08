export type LanguageCode = 'ja' | 'ko'

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
