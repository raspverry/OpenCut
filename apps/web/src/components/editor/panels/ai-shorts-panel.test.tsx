// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AnalyzeResponse } from '../../../lib/editor/types'
import { mockTimelineSpec } from '../../../lib/editor/mock-timeline-spec'
import { AiShortsPanel } from './ai-shorts-panel'

describe('AiShortsPanel', () => {
  afterEach(() => cleanup())

  it('defaults to Japanese, OpenAI, and 30 second max clips', () => {
    render(<AiShortsPanel sessionId="20260708-sale" clips={[]} client={idleClient()} />)

    expect((screen.getByLabelText('Provider') as HTMLSelectElement).value).toBe('openai')
    expect((screen.getByLabelText('Source Language') as HTMLSelectElement).value).toBe('ja')
    expect((screen.getByLabelText('Caption Language') as HTMLSelectElement).value).toBe('ja')
    expect(screen.getByText('Max 30s')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Analyze' })).toBeTruthy()
  })

  it('shows loading and success state when analyze resolves', async () => {
    const analyze = vi.fn(async () => analyzeResponse(1))
    render(
      <AiShortsPanel
        sessionId="20260708-sale"
        clips={[]}
        client={{ analyze }}
      />
    )

    fireEvent.change(screen.getByLabelText('Provider'), { target: { value: 'openai' } })
    fireEvent.change(screen.getByLabelText('Source Language'), { target: { value: 'zh' } })
    fireEvent.click(screen.getByRole('button', { name: 'Analyze' }))

    expect(screen.getByText('Analyzing...')).toBeTruthy()
    await waitFor(() => expect(screen.getByText('1 candidate ready')).toBeTruthy())
    expect(analyze).toHaveBeenCalledWith('20260708-sale', {
      provider: 'openai',
      source_language: 'zh',
      language: 'ja',
      max_clip_sec: 30,
      force: true,
    })
  })

  it('loads existing candidates without rerunning analysis', async () => {
    const getCandidates = vi.fn(async () => analyzeResponse(2).candidates)
    render(
      <AiShortsPanel
        sessionId="20260708-sale"
        clips={[]}
        client={{ getCandidates }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Load Candidates' }))

    expect(screen.getByText('Loading candidates...')).toBeTruthy()
    await waitFor(() => expect(screen.getByText('2 candidates loaded')).toBeTruthy())
    expect(screen.getByText('p01-c01')).toBeTruthy()
    expect(screen.getByText('p01-c02')).toBeTruthy()
    expect(getCandidates).toHaveBeenCalledWith('20260708-sale')
  })

  it('shows Korean error detail when analyze fails', async () => {
    const analyze = vi.fn(async () => {
      throw new Error('하이라이트 후보 파일이 없습니다')
    })
    render(
      <AiShortsPanel
        sessionId="20260708-sale"
        clips={[]}
        client={{ analyze }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Analyze' }))

    await waitFor(() => expect(screen.getByText('하이라이트 후보 파일이 없습니다')).toBeTruthy())
  })

  it('shows an empty candidate state before analyze', () => {
    render(<AiShortsPanel sessionId="20260708-sale" clips={[]} client={idleClient()} />)

    expect(screen.getByText('Run Analyze to generate candidates')).toBeTruthy()
  })

  it('rebases one applied clip to timeline zero', async () => {
    const onApplyTimeline = vi.fn()
    const getTimelineSpec = vi.fn(async () => ({
      ...mockTimelineSpec,
      clips: [
        {
          ...mockTimelineSpec.clips[0],
          timeline_start_sec: 42,
        },
      ],
    }))
    const getCaptionCues = vi.fn(async () => captionCueFile('p01-c01'))
    render(
      <AiShortsPanel
        sessionId="20260708-sale"
        clips={[mockTimelineSpec.clips[0]]}
        client={{ getTimelineSpec, getCaptionCues }}
        onApplyTimeline={onApplyTimeline}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Apply p01-c01' }))

    await waitFor(() => expect(screen.getByText('Applied 1 clip to timeline')).toBeTruthy())
    expect(onApplyTimeline).toHaveBeenCalled()
    const timeline = onApplyTimeline.mock.calls[0]?.[0]
    expect(timeline.elements.find((element) => element.type === 'video')?.timelineStartSec).toBe(0)
    expect(timeline.elements).toContainEqual(
      expect.objectContaining({
        id: 'p01-c01-caption-p01-c01-q001',
        type: 'caption_text',
        text: 'このツヤ見て',
        wordTimings: [{ text: 'この', startSec: 10, endSec: 10.4, confidence: 0.93 }],
      })
    )
    expect(getCaptionCues).toHaveBeenCalledWith('20260708-sale', 'p01-c01')
  })

  it('server renders without falling back to client rendering', () => {
    expect(() =>
      renderToString(<AiShortsPanel sessionId="20260708-sale" clips={[]} client={idleClient()} />)
    ).not.toThrow()
  })
})

function idleClient() {
  return {
    analyze: vi.fn(async () => analyzeResponse(0)),
  }
}

function analyzeResponse(count: number): AnalyzeResponse {
  return {
    session_id: '20260708-sale',
    provider: 'openai',
    source_language: 'zh',
    language: 'ja',
    max_clip_sec: 30,
    candidates: {
      session_id: '20260708-sale',
      llm_model: 'gpt-4.1',
      generated_at: '2026-07-08T11:00:00+09:00',
      clips: Array.from({ length: count }, (_, index) => ({
        clip_id: `p01-c0${index + 1}`,
        product_id: 'p01',
        start_sec: 10,
        end_sec: 28,
        segment_range: [0, 2],
        score: 91,
        reason: '価格と実演が近い',
        hook_text: 'このツヤ見て',
        caption: '新作セラムをチェック',
        hashtags: ['コスメ'],
      })),
    },
  }
}

function captionCueFile(clipId: string) {
  return {
    clip_id: clipId,
    language: 'ja',
    preset: 'ja-shorts-safe-v1',
    source_range_sec: [10, 28],
    cues: [
      {
        cue_id: `${clipId}-q001`,
        source_segment_id: 0,
        start_sec: 10,
        end_sec: 12,
        text: 'このツヤ見て',
        words: [{ w: 'この', start: 10, end: 10.4, confidence: 0.93 }],
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
