// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { applyTimelineSpec } from '../../../lib/editor/apply-timeline-spec'
import { mockTimelineSpec } from '../../../lib/editor/mock-timeline-spec'
import { ExportQaPanel } from './export-qa-panel'

describe('ExportQaPanel', () => {
  afterEach(() => cleanup())

  it('disables export QA while the sidecar probe is running', async () => {
    const timeline = applyTimelineSpec(mockTimelineSpec)
    let resolveQa: (() => void) | undefined
    const verifyOpenCutExportManifest = vi.fn(
      () =>
        new Promise<{
          session_id: string
          clip_count: number
          total_duration_sec: number
          by_product: Record<string, number>
        }>((resolve) => {
          resolveQa = () =>
            resolve({
              session_id: '20260708-opencut-fixture',
              clip_count: 1,
              total_duration_sec: 18,
              by_product: { p01: 1 },
            })
        })
    )

    render(
      <ExportQaPanel
        sessionId="20260708-opencut-fixture"
        timeline={timeline}
        client={{ verifyOpenCutExportManifest }}
      />
    )

    const button = screen.getByRole('button', { name: 'Run Export QA' }) as HTMLButtonElement
    fireEvent.click(button)

    expect(button.disabled).toBe(true)
    expect(screen.getByRole('region', { name: 'Export QA' }).getAttribute('aria-busy')).toBe(
      'true'
    )

    resolveQa?.()
    await waitFor(() => expect(button.disabled).toBe(false))
  })

  it('announces export QA failures as alerts', async () => {
    const timeline = applyTimelineSpec(mockTimelineSpec)
    const verifyOpenCutExportManifest = vi.fn(async () => {
      throw new Error('duration mismatch')
    })

    render(
      <ExportQaPanel
        sessionId="20260708-opencut-fixture"
        timeline={timeline}
        client={{ verifyOpenCutExportManifest }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Run Export QA' }))

    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('duration mismatch'))
  })

  it('refreshes export paths from a sidecar manifest draft', async () => {
    const timeline = applyTimelineSpec(mockTimelineSpec)
    const draftOpenCutExportManifest = vi.fn(async () => ({
      manifest: {
        session_id: '20260708-opencut-fixture',
        exported_at: '2026-07-08T12:10:00+09:00',
        fingerprint: mockTimelineSpec.fingerprint,
        clips: [{ clip_id: 'p01-c01', video_file: 'exports/p01-c01.mp4' }],
      },
      missing_files: [],
    }))

    render(
      <ExportQaPanel
        sessionId="20260708-opencut-fixture"
        timeline={timeline}
        client={{ draftOpenCutExportManifest, verifyOpenCutExportManifest: vi.fn() }}
      />
    )

    const input = screen.getByLabelText('Exported video file for p01-c01') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'manual/p01-c01.mp4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Refresh Exports' }))

    await waitFor(() => expect(input.value).toBe('exports/p01-c01.mp4'))
    expect(screen.getByRole('status').textContent).toBe('Export paths refreshed: 1 clip')
    expect(draftOpenCutExportManifest).toHaveBeenCalledWith('20260708-opencut-fixture', {
      clip_ids: ['p01-c01'],
    })
  })

  it('announces missing files after refreshing export paths', async () => {
    const timeline = applyTimelineSpec(mockTimelineSpec)
    const draftOpenCutExportManifest = vi.fn(async () => ({
      manifest: {
        session_id: '20260708-opencut-fixture',
        exported_at: '2026-07-08T12:10:00+09:00',
        fingerprint: mockTimelineSpec.fingerprint,
        clips: [{ clip_id: 'p01-c01', video_file: 'final/p01-c01.mp4' }],
      },
      missing_files: ['final/p01-c01.mp4'],
    }))

    render(
      <ExportQaPanel
        sessionId="20260708-opencut-fixture"
        timeline={timeline}
        client={{ draftOpenCutExportManifest, verifyOpenCutExportManifest: vi.fn() }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Refresh Exports' }))

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(
        'Missing export files: final/p01-c01.mp4'
      )
    )
  })

  it('loads and saves clip review state through the sidecar', async () => {
    const timeline = applyTimelineSpec(mockTimelineSpec)
    const getClipState = vi.fn(async () => clipState({ status: 'pending' }))
    const updateClipState = vi.fn(async () => clipState({ status: 'approved' }))

    render(
      <ExportQaPanel
        sessionId="20260708-opencut-fixture"
        timeline={timeline}
        client={{
          getClipState,
          updateClipState,
          verifyOpenCutExportManifest: vi.fn(),
        }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Load review p01-c01' }))
    await waitFor(() =>
      expect((screen.getByLabelText('Hook text for p01-c01') as HTMLInputElement).value).toBe(
        'old hook'
      )
    )
    fireEvent.change(screen.getByLabelText('Review status for p01-c01'), {
      target: { value: 'approved' },
    })
    fireEvent.change(screen.getByLabelText('Hook text for p01-c01'), {
      target: { value: 'edited hook' },
    })
    fireEvent.change(screen.getByLabelText('Caption for p01-c01'), {
      target: { value: 'edited caption' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save review p01-c01' }))

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Saved review p01-c01'))
    expect(getClipState).toHaveBeenCalledWith('20260708-opencut-fixture', 'p01-c01')
    expect(updateClipState).toHaveBeenCalledWith('20260708-opencut-fixture', 'p01-c01', {
      status: 'approved',
      hook_text: 'edited hook',
      caption: 'edited caption',
    })
  })

  it('uploads exported MP4 files into the sidecar final folder', async () => {
    const timeline = applyTimelineSpec(mockTimelineSpec)
    const uploadOpenCutExportArtifact = vi.fn(async () => ({
      session_id: '20260708-opencut-fixture',
      clip_id: 'p01-c01',
      video_file: 'final/p01-c01.mp4',
      byte_size: 3,
    }))

    render(
      <ExportQaPanel
        sessionId="20260708-opencut-fixture"
        timeline={timeline}
        client={{
          uploadOpenCutExportArtifact,
          draftOpenCutExportManifest: vi.fn(),
          verifyOpenCutExportManifest: vi.fn(),
        }}
      />
    )

    const file = new File([new Uint8Array([1, 2, 3])], 'p01-c01.mp4', {
      type: 'video/mp4',
    })
    fireEvent.change(screen.getByLabelText('Upload exported MP4 for p01-c01'), {
      target: { files: [file] },
    })

    await waitFor(() => expect(uploadOpenCutExportArtifact).toHaveBeenCalled())
    const uploadCall = uploadOpenCutExportArtifact.mock.calls[0]
    expect(uploadCall?.[0]).toBe('20260708-opencut-fixture')
    expect(uploadCall?.[1]).toBe('p01-c01')
    expect(Array.from(new Uint8Array(uploadCall?.[2]))).toEqual([1, 2, 3])
    expect(
      (screen.getByLabelText('Exported video file for p01-c01') as HTMLInputElement).value
    ).toBe('final/p01-c01.mp4')
    expect(screen.getByRole('status').textContent).toBe('Uploaded p01-c01: 3 bytes')
  })

  it('renders and uploads MP4 artifacts through an OpenCut renderer adapter', async () => {
    const timeline = applyTimelineSpec(mockTimelineSpec)
    const rendered = new Uint8Array([9, 8, 7]).buffer
    const renderClipExport = vi.fn(async () => rendered)
    const uploadOpenCutExportArtifact = vi.fn(async () => ({
      session_id: '20260708-opencut-fixture',
      clip_id: 'p01-c01',
      video_file: 'final/p01-c01.mp4',
      byte_size: 3,
    }))

    render(
      <ExportQaPanel
        sessionId="20260708-opencut-fixture"
        timeline={timeline}
        client={{
          uploadOpenCutExportArtifact,
          draftOpenCutExportManifest: vi.fn(),
          verifyOpenCutExportManifest: vi.fn(),
        }}
        renderer={{ renderClipExport }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Render and upload p01-c01' }))

    await waitFor(() => expect(renderClipExport).toHaveBeenCalled())
    expect(renderClipExport).toHaveBeenCalledWith({
      clipId: 'p01-c01',
      timeline,
    })
    expect(uploadOpenCutExportArtifact).toHaveBeenCalledWith(
      '20260708-opencut-fixture',
      'p01-c01',
      rendered
    )
    expect(
      (screen.getByLabelText('Exported video file for p01-c01') as HTMLInputElement).value
    ).toBe('final/p01-c01.mp4')
    expect(screen.getByRole('status').textContent).toBe('Rendered and uploaded p01-c01: 3 bytes')
  })
})

function clipState({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  return {
    clip_id: 'p01-c01',
    status,
    rendered_at: '2026-07-08T12:00:00+09:00',
    render_params_hash: '',
    trim_offset_start: 0,
    trim_offset_end: 0,
    caption: status === 'approved' ? 'edited caption' : 'old caption',
    hook_text: status === 'approved' ? 'edited hook' : 'old hook',
    review_note: '',
    review_tags: [],
  }
}
