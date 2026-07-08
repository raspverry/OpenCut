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
})
