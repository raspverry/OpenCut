import { useEffect, useMemo, useState } from 'react'

import type { AppliedTimeline } from '../../../lib/editor/apply-timeline-spec'
import { buildOpenCutExportReport } from '../../../lib/editor/open-cut-export-report'
import type { SidecarClient } from '../../../lib/editor/sidecar-client'

type ExportQaPanelProps = {
  sessionId: string
  timeline: AppliedTimeline | null
  client?: Partial<Pick<SidecarClient, 'verifyOpenCutExport'>>
}

type ClipExportMetadata = {
  videoFile: string
  integratedLufs: string
  subtitleEvidenceFile: string
}

export function ExportQaPanel({ sessionId, timeline, client }: ExportQaPanelProps) {
  const clipIds = useMemo(
    () =>
      timeline?.elements
        .filter((element) => element.type === 'video')
        .map((element) => element.clipId) ?? [],
    [timeline]
  )
  const clipKey = clipIds.join('|')
  const [outputs, setOutputs] = useState<Record<string, ClipExportMetadata>>({})
  const [status, setStatus] = useState('Export QA ready')

  useEffect(() => {
    setOutputs((current) =>
      Object.fromEntries(
        clipIds.map((clipId) => [clipId, current[clipId] ?? defaultOutput(clipId)])
      )
    )
  }, [clipIds, clipKey])

  async function runQa() {
    if (!timeline) {
      setStatus('timeline 적용 후 QA를 실행하세요')
      return
    }
    if (!client?.verifyOpenCutExport) {
      setStatus('sidecar export QA 경로가 없습니다')
      return
    }
    if (clipIds.length === 0) {
      setStatus('QA 대상 클립이 없습니다')
      return
    }
    try {
      const report = buildOpenCutExportReport(timeline, {
        exportedAt: new Date().toISOString(),
        outputs: clipIds.map((clipId) => {
          const output = outputs[clipId] ?? defaultOutput(clipId)
          return {
            clipId,
            videoFile: output.videoFile,
            integratedLufs: Number(output.integratedLufs),
            subtitleEvidenceFile: output.subtitleEvidenceFile,
          }
        }),
      })
      if (!report.ok) {
        setStatus(report.clips.flatMap((clip) => clip.errors).join('; '))
        return
      }
      const result = await client.verifyOpenCutExport(sessionId, report)
      const clipLabel = result.clip_count === 1 ? 'clip' : 'clips'
      setStatus(
        `QA passed: ${result.clip_count} ${clipLabel}, ${result.total_duration_sec.toFixed(1)}s`
      )
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'OpenCut export QA 실패')
    }
  }

  return (
    <section className="col-span-3 bg-background p-4">
      <h2 className="text-sm font-medium">Export QA</h2>
      <div className="mt-4 space-y-3">
        {clipIds.length === 0 ? (
          <p className="text-xs text-muted-foreground">No applied clips</p>
        ) : null}
        {clipIds.map((clipId) => {
          const output = outputs[clipId] ?? defaultOutput(clipId)
          return (
            <div
              className="grid grid-cols-1 gap-2 md:grid-cols-[120px_1fr_140px_1fr]"
              key={clipId}
            >
              <span className="self-end pb-1 text-xs font-medium">{clipId}</span>
              <label className="space-y-1 text-xs text-muted-foreground">
                <span>Exported video file</span>
                <input
                  aria-label="Exported video file"
                  className="h-7 w-full rounded-md border bg-background px-2 text-xs text-foreground"
                  value={output.videoFile}
                  onChange={(event) =>
                    updateOutput(clipId, 'videoFile', event.currentTarget.value)
                  }
                />
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                <span>Integrated LUFS</span>
                <input
                  aria-label="Integrated LUFS"
                  className="h-7 w-full rounded-md border bg-background px-2 text-xs text-foreground"
                  value={output.integratedLufs}
                  onChange={(event) =>
                    updateOutput(clipId, 'integratedLufs', event.currentTarget.value)
                  }
                />
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                <span>Subtitle evidence file</span>
                <input
                  aria-label="Subtitle evidence file"
                  className="h-7 w-full rounded-md border bg-background px-2 text-xs text-foreground"
                  value={output.subtitleEvidenceFile}
                  onChange={(event) =>
                    updateOutput(clipId, 'subtitleEvidenceFile', event.currentTarget.value)
                  }
                />
              </label>
            </div>
          )
        })}
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

  function updateOutput(
    clipId: string,
    key: keyof ClipExportMetadata,
    value: ClipExportMetadata[keyof ClipExportMetadata]
  ) {
    setOutputs((current) => ({
      ...current,
      [clipId]: {
        ...(current[clipId] ?? defaultOutput(clipId)),
        [key]: value,
      },
    }))
  }
}

function defaultOutput(clipId: string): ClipExportMetadata {
  return {
    videoFile: `final/${clipId}.mp4`,
    integratedLufs: '-14.0',
    subtitleEvidenceFile: `qa/opencut-subtitles/${clipId}.jpg`,
  }
}
