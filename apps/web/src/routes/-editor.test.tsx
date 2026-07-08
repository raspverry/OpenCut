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
      source_language: 'ja',
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

  it('creates a sidecar session, ingests source media, then analyzes that session', async () => {
    const createSession = vi.fn(async () => ({
      session_id: '20260708-live-sale',
      path: '/tmp/data/sessions/20260708-live-sale',
    }))
    const ingest = vi.fn(async () => ({
      session_id: '20260708-live-sale',
      probe: {
        duration_sec: 3600,
        width: 1080,
        height: 1920,
        orientation: 'vertical' as const,
      },
    }))
    const analyze = vi.fn(async () => analyzedCandidateResponse())

    render(
      <EditorShell
        timelineSpec={mockTimelineSpec}
        sidecarClient={{ createSession, ingest, analyze }}
      />
    )

    fireEvent.change(screen.getByLabelText('Session slug'), {
      target: { value: 'live-sale' },
    })
    fireEvent.change(screen.getByLabelText('Source path'), {
      target: { value: '/Users/hansol/Videos/live-ja.mp4' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create Session' }))

    await waitFor(() => expect(screen.getByText('20260708-live-sale')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Ingest' }))

    await waitFor(() => expect(screen.getByText('vertical 3600.0s')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Analyze' }))

    await waitFor(() => expect(screen.getByText('p02-c01')).toBeTruthy())
    expect(createSession).toHaveBeenCalledWith({ slug: 'live-sale' })
    expect(ingest).toHaveBeenCalledWith('20260708-live-sale', {
      input_path: '/Users/hansol/Videos/live-ja.mp4',
      force: true,
    })
    expect(analyze).toHaveBeenCalledWith('20260708-live-sale', {
      provider: 'openai',
      source_language: 'ja',
      language: 'ja',
      max_clip_sec: 30,
      force: true,
    })
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

  it('builds an OpenCut export manifest from applied timeline and submits QA', async () => {
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
    const verifyOpenCutExportManifest = vi.fn(async () => ({
      session_id: '20260708-opencut-fixture',
      clip_count: 1,
      total_duration_sec: 26,
      by_product: { p02: 1 },
    }))
    render(
      <EditorShell
        timelineSpec={mockTimelineSpec}
        sidecarClient={{ analyze, getTimelineSpec, verifyOpenCutExportManifest }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Analyze' }))
    await waitFor(() => expect(screen.getByText('p02-c01')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Apply p02-c01' }))
    await waitFor(() => expect(screen.getByText('p02-c01-video')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Run Export QA' }))

    await waitFor(() => expect(screen.getByText('QA passed: 1 clip, 26.0s')).toBeTruthy())
    expect(verifyOpenCutExportManifest).toHaveBeenCalledWith('20260708-opencut-fixture', {
      session_id: '20260708-opencut-fixture',
      exported_at: expect.any(String),
      fingerprint: mockTimelineSpec.fingerprint,
      clips: [
        {
          clip_id: 'p02-c01',
          video_file: 'final/p02-c01.mp4',
        },
      ],
    })
  })

  it('applies all analyzed candidates and submits export QA for every clip', async () => {
    const analyze = vi.fn(async () => multiAnalyzedCandidateResponse())
    const getTimelineSpec = vi.fn(async () => multiTimelineSpec())
    const verifyOpenCutExportManifest = vi.fn(async () => ({
      session_id: '20260708-opencut-fixture',
      clip_count: 2,
      total_duration_sec: 54,
      by_product: { p02: 1, p03: 1 },
    }))
    render(
      <EditorShell
        timelineSpec={mockTimelineSpec}
        sidecarClient={{ analyze, getTimelineSpec, verifyOpenCutExportManifest }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Analyze' }))
    await waitFor(() => expect(screen.getByText('p02-c01')).toBeTruthy())
    expect(screen.getByText('p03-c01')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Apply All' }))

    await waitFor(() => expect(screen.getByText('p02-c01-video')).toBeTruthy())
    expect(screen.getByText('p03-c01-video')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Run Export QA' }))

    await waitFor(() => expect(screen.getByText('QA passed: 2 clips, 54.0s')).toBeTruthy())
    expect(verifyOpenCutExportManifest).toHaveBeenCalledWith('20260708-opencut-fixture', {
      session_id: '20260708-opencut-fixture',
      exported_at: expect.any(String),
      fingerprint: mockTimelineSpec.fingerprint,
      clips: [
        {
          clip_id: 'p02-c01',
          video_file: 'final/p02-c01.mp4',
        },
        {
          clip_id: 'p03-c01',
          video_file: 'final/p03-c01.mp4',
        },
      ],
    })
  })

  it('blocks export QA submission when renderer metadata is invalid', async () => {
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
    const verifyOpenCutExportManifest = vi.fn()
    render(
      <EditorShell
        timelineSpec={mockTimelineSpec}
        sidecarClient={{ analyze, getTimelineSpec, verifyOpenCutExportManifest }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Analyze' }))
    await waitFor(() => expect(screen.getByText('p02-c01')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Apply p02-c01' }))
    await waitFor(() => expect(screen.getByText('p02-c01-video')).toBeTruthy())
    fireEvent.change(screen.getByLabelText('Exported video file for p02-c01'), {
      target: { value: '' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Run Export QA' }))

    await waitFor(() => expect(screen.getByText('video file is missing')).toBeTruthy())
    expect(verifyOpenCutExportManifest).not.toHaveBeenCalled()
  })
})

function analyzedCandidateResponse() {
  return {
    session_id: '20260708-opencut-fixture',
    provider: 'openai',
    source_language: 'ja',
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

function multiAnalyzedCandidateResponse() {
  return {
    session_id: '20260708-opencut-fixture',
    provider: 'openai',
    source_language: 'ja',
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
        {
          clip_id: 'p03-c01',
          product_id: 'p03',
          start_sec: 64,
          end_sec: 92,
          segment_range: [8, 12],
          score: 90,
          reason: '使い方と仕上がりが連続している',
          hook_text: '仕上がり比べて',
          caption: 'ブラシの仕上がりを実演',
          hashtags: ['コスメ'],
        },
      ],
    },
  }
}

function multiTimelineSpec() {
  return {
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
      {
        clip_id: 'p03-c01',
        product_id: 'p03',
        source_range_sec: [64, 92],
        timeline_start_sec: 26,
        hook_text: '仕上がり比べて',
        caption_file: 'caption_cues/p03-c01.json',
        caption_style: 'ja-shorts-safe-v1',
        score: 90,
        reason: '使い方と仕上がりが連続している',
      },
    ],
  }
}
