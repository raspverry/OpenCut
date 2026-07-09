// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  activeCaptionText,
  renderTimeoutMs,
  selectMediaRecorderMimeType,
  splitCaptionLines,
} from './browser-clip-renderer'
import type { CaptionCueFile } from './types'

describe('browser clip renderer helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('selects the first browser-supported MP4 mime type', () => {
    class MockMediaRecorder {
      static isTypeSupported = vi.fn((mimeType: string) => mimeType === 'video/mp4')
    }
    vi.stubGlobal('MediaRecorder', MockMediaRecorder)

    expect(selectMediaRecorderMimeType()).toBe('video/mp4')
  })

  it('falls back to WebM when MP4 MediaRecorder is unavailable', () => {
    class MockMediaRecorder {
      static isTypeSupported = vi.fn(
        (mimeType: string) => mimeType === 'video/webm;codecs=vp9,opus'
      )
    }
    vi.stubGlobal('MediaRecorder', MockMediaRecorder)

    expect(selectMediaRecorderMimeType()).toBe('video/webm;codecs=vp9,opus')
  })

  it('fails clearly when the browser cannot record video', () => {
    class MockMediaRecorder {
      static isTypeSupported = vi.fn(() => false)
    }
    vi.stubGlobal('MediaRecorder', MockMediaRecorder)

    expect(() => selectMediaRecorderMimeType()).toThrow(
      '이 브라우저는 MediaRecorder video export를 지원하지 않습니다'
    )
  })

  it('finds active caption text by source time without overlapping boundaries', () => {
    expect(activeCaptionText(captionCueFile(), 10.5)).toBe('最初の一文')
    expect(activeCaptionText(captionCueFile(), 12)).toBe('次の一文')
    expect(activeCaptionText(captionCueFile(), 14)).toBe('')
  })

  it('allows enough time for large-file browser export smoke runs', () => {
    expect(renderTimeoutMs(20)).toBeGreaterThanOrEqual(180_000)
    expect(renderTimeoutMs(30)).toBeGreaterThanOrEqual(240_000)
  })

  it('splits Japanese caption text with a safe minimum line length', () => {
    expect(splitCaptionLines('同じこちらの細い平筆にラ液', 7)).toEqual([
      '同じこちらの細',
      'い平筆にラ液',
    ])
    expect(splitCaptionLines('abc', 0)).toEqual(['a', 'b', 'c'])
  })
})

function captionCueFile(): CaptionCueFile {
  return {
    clip_id: 'p01-c01',
    language: 'ja',
    preset: 'ja-shorts-safe-v1',
    source_range_sec: [10, 14],
    cues: [
      {
        cue_id: 'p01-c01-q001',
        source_segment_id: 0,
        start_sec: 10,
        end_sec: 12,
        text: '最初の一文',
        words: [],
      },
      {
        cue_id: 'p01-c01-q002',
        source_segment_id: 1,
        start_sec: 12,
        end_sec: 14,
        text: '次の一文',
        words: [],
      },
    ],
    style: {
      format: 'word_pop',
      font_family: 'Noto Sans CJK JP',
      max_chars_per_line: 13,
      max_lines: 2,
      safe_area: { anchor: 'bottom', margin_px: 640 },
    },
  }
}
