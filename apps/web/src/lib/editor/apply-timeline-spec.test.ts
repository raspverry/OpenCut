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

  it('preserves canonical caption cue text and word timings on applied timeline', () => {
    const timeline = applyTimelineSpec(mockTimelineSpec, {
      captionCuesByClip: {
        'p01-c01': {
          clip_id: 'p01-c01',
          language: 'ja',
          preset: 'ja-shorts-safe-v1',
          source_range_sec: [10, 28],
          cues: [
            {
              cue_id: 'p01-c01-q001',
              source_segment_id: 0,
              start_sec: 12,
              end_sec: 14.5,
              text: 'このツヤ見て',
              words: [
                { w: 'この', start: 12, end: 12.4, confidence: 0.95 },
                { w: 'ツヤ', start: 12.4, end: 13.2, confidence: 0.91 },
              ],
            },
          ],
          style: {
            format: 'word_pop',
            font_family: 'Noto Sans CJK JP',
            max_chars_per_line: 13,
            max_lines: 2,
            safe_area: { anchor: 'bottom', margin_px: 640 },
          },
        },
      },
    })

    expect(timeline.elements).toContainEqual({
      id: 'p01-c01-caption-p01-c01-q001',
      type: 'caption_text',
      clipId: 'p01-c01',
      timelineStartSec: 2,
      durationSec: 2.5,
      sourceStartSec: 12,
      sourceEndSec: 14.5,
      text: 'このツヤ見て',
      captionStyle: 'ja-shorts-safe-v1',
      wordTimings: [
        { text: 'この', startSec: 12, endSec: 12.4, confidence: 0.95 },
        { text: 'ツヤ', startSec: 12.4, endSec: 13.2, confidence: 0.91 },
      ],
    })
  })
})
