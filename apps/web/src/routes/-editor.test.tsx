// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EditorPage } from '../components/editor/editor-page'
import { EditorShell } from '../components/editor/editor-shell'
import { mockTimelineSpec } from '../lib/editor/mock-timeline-spec'

describe('EditorPage', () => {
  afterEach(() => cleanup())

  it('renders the OpenCut AI Shorts editor shell', () => {
    render(<EditorPage />)

    expect(screen.getByText('Source Media')).toBeTruthy()
    expect(screen.getByText('AI Shorts')).toBeTruthy()
    expect(screen.getByText('Preview')).toBeTruthy()
    expect(screen.getByText('Timeline')).toBeTruthy()
    expect(screen.getAllByText('p01-c01').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('p01')).toBeTruthy()
    expect(screen.getByText('Score 87')).toBeTruthy()
    expect(screen.getByText('10.0s-28.0s')).toBeTruthy()
    expect(screen.getByText('実演と価格が同じ短い区間に入っている')).toBeTruthy()
  })

  it('displays analyzed candidates from the sidecar', async () => {
    const analyze = vi.fn(async () => ({
      session_id: '20260708-opencut-fixture',
      provider: 'openai',
      language: 'ja',
      max_clip_sec: 30,
      candidates: {
        session_id: '20260708-opencut-fixture',
        llm_model: 'gpt-4.1',
        generated_at: '2026-07-08T11:00:00+09:00',
        clips: [
          {
            clip_id: 'p02-c01',
            product_id: 'p02',
            start_sec: 32,
            end_sec: 58,
            segment_range: [4, 7],
            score: 94,
            reason: '価格、実演、使用感が連続している',
            hook_text: 'この落ち方見て',
            caption: 'ティントの落ちにくさを実演',
            hashtags: ['コスメ'],
          },
        ],
      },
    }))
    render(<EditorShell timelineSpec={mockTimelineSpec} sidecarClient={{ analyze }} />)

    fireEvent.click(screen.getByRole('button', { name: 'Analyze' }))

    await waitFor(() => expect(screen.getByText('p02-c01')).toBeTruthy())
    expect(screen.getByText('p02')).toBeTruthy()
    expect(screen.getByText('Score 94')).toBeTruthy()
    expect(screen.getByText('32.0s-58.0s')).toBeTruthy()
    expect(screen.getByText('価格、実演、使用感が連続している')).toBeTruthy()
    expect(screen.getByText('ティントの落ちにくさを実演')).toBeTruthy()
  })

  it('applies an analyzed candidate into timeline lanes', async () => {
    const analyze = vi.fn(async () => analyzedCandidateResponse())
    const getTimelineSpec = vi.fn(async () => ({
      ...mockTimelineSpec,
      clips: [
        {
          clip_id: 'p02-c01',
          product_id: 'p02',
          source_range_sec: [32, 58],
          timeline_start_sec: 0,
          hook_text: 'この落ち方見て',
          caption_file: 'caption_cues/p02-c01.json',
          caption_style: 'ja-shorts-safe-v1',
          score: 94,
          reason: '価格、実演、使用感が連続している',
        },
      ],
    }))
    render(
      <EditorShell
        timelineSpec={mockTimelineSpec}
        sidecarClient={{ analyze, getTimelineSpec }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Analyze' }))
    await waitFor(() => expect(screen.getByText('p02-c01')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Apply p02-c01' }))

    await waitFor(() => expect(screen.getByText('p02-c01-video')).toBeTruthy())
    expect(screen.getByText('p02-c01-audio')).toBeTruthy()
    expect(screen.getByText('p02-c01-hook')).toBeTruthy()
    expect(screen.getByText('p02-c01-cta')).toBeTruthy()
    expect(screen.getByText('p02-c01-captions')).toBeTruthy()
    expect(getTimelineSpec).toHaveBeenCalledWith('20260708-opencut-fixture')
  })
})

function analyzedCandidateResponse() {
  return {
    session_id: '20260708-opencut-fixture',
    provider: 'openai',
    language: 'ja',
    max_clip_sec: 30,
    candidates: {
      session_id: '20260708-opencut-fixture',
      llm_model: 'gpt-4.1',
      generated_at: '2026-07-08T11:00:00+09:00',
      clips: [
        {
          clip_id: 'p02-c01',
          product_id: 'p02',
          start_sec: 32,
          end_sec: 58,
          segment_range: [4, 7],
          score: 94,
          reason: '価格、実演、使用感が連続している',
          hook_text: 'この落ち方見て',
          caption: 'ティントの落ちにくさを実演',
          hashtags: ['コスメ'],
        },
      ],
    },
  }
}
