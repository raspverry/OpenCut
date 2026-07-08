import { useEffect, useState } from 'react'

import type { AppliedTimeline } from '../../../lib/editor/apply-timeline-spec'
import { buildOpenCutExportReport } from '../../../lib/editor/open-cut-export-report'
import type { SidecarClient } from '../../../lib/editor/sidecar-client'

type ExportQaPanelProps = {
  sessionId: string
  timeline: AppliedTimeline | null
  client?: Partial<Pick<SidecarClient, 'verifyOpenCutExport'>>
}

export function ExportQaPanel({ sessionId, timeline, client }: ExportQaPanelProps) {
  const firstClipId = timeline?.elements.find((element) => element.type === 'video')?.clipId ?? ''
  const [videoFile, setVideoFile] = useState(firstClipId ? `final/${firstClipId}.mp4` : '')
  const [integratedLufs, setIntegratedLufs] = useState('-14.0')
  const [subtitleEvidenceFile, setSubtitleEvidenceFile] = useState(
    firstClipId ? `qa/opencut-subtitles/${firstClipId}.jpg` : ''
  )
  const [status, setStatus] = useState('Export QA ready')

  useEffect(() => {
    setVideoFile(firstClipId ? `final/${firstClipId}.mp4` : '')
    setSubtitleEvidenceFile(firstClipId ? `qa/opencut-subtitles/${firstClipId}.jpg` : '')
  }, [firstClipId])

  async function runQa() {
    if (!timeline) {
      setStatus('timeline 적용 후 QA를 실행하세요')
      return
    }
    if (!client?.verifyOpenCutExport) {
      setStatus('sidecar export QA 경로가 없습니다')
      return
    }
    const clipId = timeline.elements.find((element) => element.type === 'video')?.clipId
    if (!clipId) {
      setStatus('QA 대상 클립이 없습니다')
      return
    }
    try {
      const report = buildOpenCutExportReport(timeline, {
        exportedAt: new Date().toISOString(),
        outputs: [
          {
            clipId,
            videoFile,
            integratedLufs: Number(integratedLufs),
            subtitleEvidenceFile,
          },
        ],
      })
      if (!report.ok) {
        setStatus(report.clips.flatMap((clip) => clip.errors).join('; '))
        return
      }
      const result = await client.verifyOpenCutExport(sessionId, report)
      setStatus(`QA passed: ${result.clip_count} clip, ${result.total_duration_sec.toFixed(1)}s`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'OpenCut export QA 실패')
    }
  }

  return (
    <section className="col-span-3 bg-background p-4">
      <h2 className="text-sm font-medium">Export QA</h2>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <label className="space-y-1 text-xs text-muted-foreground">
          <span>Exported video file</span>
          <input
            aria-label="Exported video file"
            className="h-7 w-full rounded-md border bg-background px-2 text-xs text-foreground"
            value={videoFile}
            onChange={(event) => setVideoFile(event.currentTarget.value)}
          />
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          <span>Integrated LUFS</span>
          <input
            aria-label="Integrated LUFS"
            className="h-7 w-full rounded-md border bg-background px-2 text-xs text-foreground"
            value={integratedLufs}
            onChange={(event) => setIntegratedLufs(event.currentTarget.value)}
          />
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          <span>Subtitle evidence file</span>
          <input
            aria-label="Subtitle evidence file"
            className="h-7 w-full rounded-md border bg-background px-2 text-xs text-foreground"
            value={subtitleEvidenceFile}
            onChange={(event) => setSubtitleEvidenceFile(event.currentTarget.value)}
          />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          className="inline-flex h-7 items-center rounded-md border px-2 text-xs hover:bg-muted"
          onClick={runQa}
        >
          Run Export QA
        </button>
        <p role="status" className="text-xs text-muted-foreground">
          {status}
        </p>
      </div>
    </section>
  )
}
