import type { TimelineSpec } from './types'

const CTA_TEXT = 'TikTok Shopでチェック'
const OVERLAY_DURATION_SEC = 3

export type AppliedTimeline = {
  sessionId: string
  fingerprint: string
  elements: TimelineElement[]
}

export type TimelineElement =
  | VideoElement
  | AudioElement
  | HookTextElement
  | CtaTextElement
  | CaptionTrackElement

type MediaElement = {
  clipId: string
  timelineStartSec: number
  durationSec: number
  sourceFile: string
  sourceStartSec: number
  sourceEndSec: number
}

type VideoElement = MediaElement & {
  id: string
  type: 'video'
}

type AudioElement = MediaElement & {
  id: string
  type: 'audio'
}

type HookTextElement = {
  id: string
  type: 'hook_text'
  clipId: string
  timelineStartSec: number
  durationSec: number
  text: string
}

type CtaTextElement = {
  id: string
  type: 'cta_text'
  clipId: string
  timelineStartSec: number
  durationSec: number
  text: string
}

type CaptionTrackElement = {
  id: string
  type: 'caption_track'
  clipId: string
  timelineStartSec: number
  durationSec: number
  captionFile: string
  captionStyle: string
}

export function applyTimelineSpec(spec: TimelineSpec): AppliedTimeline {
  return {
    sessionId: spec.session_id,
    fingerprint: spec.fingerprint,
    elements: spec.clips.flatMap((clip) => {
      const [sourceStartSec, sourceEndSec] = clip.source_range_sec
      const durationSec = sourceEndSec - sourceStartSec
      const overlayDurationSec = Math.min(OVERLAY_DURATION_SEC, durationSec)
      const timelineStartSec = clip.timeline_start_sec
      return [
        {
          id: `${clip.clip_id}-video`,
          type: 'video' as const,
          clipId: clip.clip_id,
          timelineStartSec,
          durationSec,
          sourceFile: spec.source_video.file,
          sourceStartSec,
          sourceEndSec,
        },
        {
          id: `${clip.clip_id}-audio`,
          type: 'audio' as const,
          clipId: clip.clip_id,
          timelineStartSec,
          durationSec,
          sourceFile: spec.source_video.file,
          sourceStartSec,
          sourceEndSec,
        },
        {
          id: `${clip.clip_id}-hook`,
          type: 'hook_text' as const,
          clipId: clip.clip_id,
          timelineStartSec,
          durationSec: overlayDurationSec,
          text: clip.hook_text,
        },
        {
          id: `${clip.clip_id}-cta`,
          type: 'cta_text' as const,
          clipId: clip.clip_id,
          timelineStartSec: timelineStartSec + Math.max(durationSec - overlayDurationSec, 0),
          durationSec: overlayDurationSec,
          text: CTA_TEXT,
        },
        {
          id: `${clip.clip_id}-captions`,
          type: 'caption_track' as const,
          clipId: clip.clip_id,
          timelineStartSec,
          durationSec,
          captionFile: clip.caption_file,
          captionStyle: clip.caption_style,
        },
      ]
    }),
  }
}
