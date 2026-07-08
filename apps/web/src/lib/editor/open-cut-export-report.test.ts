import { describe, expect, it } from 'vitest'

import { applyTimelineSpec } from './apply-timeline-spec'
import { mockTimelineSpec } from './mock-timeline-spec'
import { buildOpenCutExportReport } from './open-cut-export-report'

describe('buildOpenCutExportReport', () => {
  it('builds a sidecar QA report from applied timeline export outputs', () => {
    const timeline = applyTimelineSpec(mockTimelineSpec)

    const report = buildOpenCutExportReport(timeline, {
      exportedAt: '2026-07-08T12:05:00+09:00',
      outputs: [
        {
          clipId: 'p01-c01',
          videoFile: 'final/p01-c01.mp4',
          integratedLufs: -14.2,
          subtitleEvidenceFile: 'qa/opencut-subtitles/p01-c01.jpg',
        },
      ],
    })

    expect(report).toEqual({
      session_id: '20260708-opencut-fixture',
      renderer: 'opencut',
      exported_at: '2026-07-08T12:05:00+09:00',
      fingerprint: mockTimelineSpec.fingerprint,
      ok: true,
      clips: [
        {
          clip_id: 'p01-c01',
          video_file: 'final/p01-c01.mp4',
          duration_sec: 18,
          integrated_lufs: -14.2,
          subtitle_evidence_file: 'qa/opencut-subtitles/p01-c01.jpg',
          errors: [],
        },
      ],
    })
  })

  it('marks missing caption evidence as clip errors before QA submission', () => {
    const timeline = applyTimelineSpec(mockTimelineSpec)

    const report = buildOpenCutExportReport(timeline, {
      exportedAt: '2026-07-08T12:05:00+09:00',
      outputs: [
        {
          clipId: 'p01-c01',
          videoFile: 'final/p01-c01.mp4',
          integratedLufs: -14.2,
          subtitleEvidenceFile: '',
        },
      ],
    })

    expect(report.ok).toBe(false)
    expect(report.clips[0].errors).toEqual(['subtitle evidence file is missing'])
  })

  it('marks invalid loudness as clip errors before QA submission', () => {
    const timeline = applyTimelineSpec(mockTimelineSpec)

    const report = buildOpenCutExportReport(timeline, {
      exportedAt: '2026-07-08T12:05:00+09:00',
      outputs: [
        {
          clipId: 'p01-c01',
          videoFile: 'final/p01-c01.mp4',
          integratedLufs: Number.NaN,
          subtitleEvidenceFile: 'qa/opencut-subtitles/p01-c01.jpg',
        },
      ],
    })

    expect(report.ok).toBe(false)
    expect(report.clips[0].errors).toEqual(['integrated LUFS is invalid'])
  })
})
