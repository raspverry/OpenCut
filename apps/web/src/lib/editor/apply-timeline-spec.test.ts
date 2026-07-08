import { describe, expect, it } from 'vitest'

import { applyTimelineSpec } from './apply-timeline-spec'
import { mockTimelineSpec } from './mock-timeline-spec'

describe('applyTimelineSpec', () => {
  it('turns a timeline spec clip into editable timeline elements', () => {
    const timeline = applyTimelineSpec(mockTimelineSpec)

    expect(timeline.sessionId).toBe(mockTimelineSpec.session_id)
    expect(timeline.fingerprint).toBe(mockTimelineSpec.fingerprint)
    expect(timeline.elements).toEqual([
      {
        id: 'p01-c01-video',
        type: 'video',
        clipId: 'p01-c01',
        timelineStartSec: 0,
        durationSec: 18,
        sourceFile: 'raw/recording.mp4',
        sourceStartSec: 10,
        sourceEndSec: 28,
      },
      {
        id: 'p01-c01-audio',
        type: 'audio',
        clipId: 'p01-c01',
        timelineStartSec: 0,
        durationSec: 18,
        sourceFile: 'raw/recording.mp4',
        sourceStartSec: 10,
        sourceEndSec: 28,
      },
      {
        id: 'p01-c01-hook',
        type: 'hook_text',
        clipId: 'p01-c01',
        timelineStartSec: 0,
        durationSec: 3,
        text: 'このツヤは反則',
      },
      {
        id: 'p01-c01-cta',
        type: 'cta_text',
        clipId: 'p01-c01',
        timelineStartSec: 15,
        durationSec: 3,
        text: 'TikTok Shopでチェック',
      },
      {
        id: 'p01-c01-captions',
        type: 'caption_track',
        clipId: 'p01-c01',
        timelineStartSec: 0,
        durationSec: 18,
        captionFile: 'caption_cues/p01-c01.json',
        captionStyle: 'ja-shorts-safe-v1',
      },
    ])
  })
})
