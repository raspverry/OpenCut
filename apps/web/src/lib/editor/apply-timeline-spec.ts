import type { CaptionCueFile, TimelineClip, TimelineSpec } from './types'

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
  | CaptionTextElement

type ApplyTimelineSpecOptions = {
  captionCuesByClip?: Record<string, CaptionCueFile | undefined>
}

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

type CaptionTextElement = {
  id: string
  type: 'caption_text'
  clipId: string
  timelineStartSec: number
  durationSec: number
  sourceStartSec: number
  sourceEndSec: number
  text: string
  captionStyle: string
  wordTimings: CaptionWordTiming[]
}

type CaptionWordTiming = {
  text: string
  startSec: number
  endSec: number
  confidence: number | null
}

export function applyTimelineSpec(
  spec: TimelineSpec,
  options: ApplyTimelineSpecOptions = {}
): AppliedTimeline {
  return {
    sessionId: spec.session_id,
    fingerprint: spec.fingerprint,
    elements: spec.clips.flatMap((clip) => {
      const [sourceStartSec, sourceEndSec] = clip.source_range_sec
      const durationSec = sourceEndSec - sourceStartSec
      const overlayDurationSec = Math.min(OVERLAY_DURATION_SEC, durationSec)
      const timelineStartSec = clip.timeline_start_sec
      const coreElements: TimelineElement[] = [
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
      return [
        ...coreElements,
        ...buildCaptionTextElements({
          clip,
          sourceStartSec,
          timelineStartSec,
          captionFile: options.captionCuesByClip?.[clip.clip_id],
        }),
      ]
    }),
  }
}

function buildCaptionTextElements({
  clip,
  sourceStartSec,
  timelineStartSec,
  captionFile,
}: {
  clip: TimelineClip
  sourceStartSec: number
  timelineStartSec: number
  captionFile?: CaptionCueFile
}): CaptionTextElement[] {
  if (!captionFile) {
    return []
  }
  return captionFile.cues.map((cue) => ({
    id: `${clip.clip_id}-caption-${cue.cue_id}`,
    type: 'caption_text' as const,
    clipId: clip.clip_id,
    timelineStartSec: timelineStartSec + Math.max(cue.start_sec - sourceStartSec, 0),
    durationSec: Math.max(cue.end_sec - cue.start_sec, 0),
    sourceStartSec: cue.start_sec,
    sourceEndSec: cue.end_sec,
    text: cue.text,
    captionStyle: clip.caption_style,
    wordTimings: cue.words.map((word) => ({
      text: word.w,
      startSec: word.start,
      endSec: word.end,
      confidence: word.confidence,
    })),
  }))
}
