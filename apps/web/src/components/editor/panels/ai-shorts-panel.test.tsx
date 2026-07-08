// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AnalyzeResponse } from '../../../lib/editor/types'
import { mockTimelineSpec } from '../../../lib/editor/mock-timeline-spec'
import { AiShortsPanel } from './ai-shorts-panel'

describe('AiShortsPanel', () => {
  afterEach(() => cleanup())

  it('defaults to Japanese, Anthropic, and 30 second max clips', () => {
    render(<AiShortsPanel sessionId="20260708-sale" clips={[]} client={idleClient()} />)

    expect((screen.getByLabelText('Provider') as HTMLSelectElement).value).toBe('anthropic')
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

  it('shows a timeline applied state after applying a clip', async () => {
    const getTimelineSpec = vi.fn(async () => mockTimelineSpec)
    render(
      <AiShortsPanel
        sessionId="20260708-sale"
        clips={[mockTimelineSpec.clips[0]]}
        client={{ getTimelineSpec }}
        onApplyTimeline={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Apply p01-c01' }))

    await waitFor(() => expect(screen.getByText('Applied 1 clip to timeline')).toBeTruthy())
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
