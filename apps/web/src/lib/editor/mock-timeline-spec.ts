import type { TimelineSpec } from './types'

export const mockTimelineSpec: TimelineSpec = {
  session_id: '20260708-opencut-fixture',
  renderer: 'opencut',
  language: 'ja',
  source_video: {
    file: 'raw/recording.mp4',
    duration_sec: 72.5,
  },
  fingerprint: 'sha256:1111111111111111111111111111111111111111111111111111111111111111',
  clips: [
    {
      clip_id: 'p01-c01',
      product_id: 'p01',
      source_range_sec: [10, 28],
      timeline_start_sec: 0,
      hook_text: 'このツヤは反則',
      caption_file: 'caption_cues/p01-c01.json',
      caption_style: 'ja-shorts-safe-v1',
      score: 87,
      reason: '実演と価格が同じ短い区間に入っている',
    },
  ],
}
