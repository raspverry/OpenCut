import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, FileVideo, Loader2 } from 'lucide-react'

import type { AppliedTimeline } from '../../../lib/editor/apply-timeline-spec'
import { buildOpenCutExportManifest } from '../../../lib/editor/open-cut-export-report'
import type { SidecarClient } from '../../../lib/editor/sidecar-client'

type RenderClipExportInput = {
  clipId: string
  timeline: AppliedTimeline
}

type OpenCutExportRenderer = {
  renderClipExport: (input: RenderClipExportInput) => Promise<ArrayBuffer>
}

type ExportQaPanelProps = {
  sessionId: string
  timeline: AppliedTimeline | null
  client?: Partial<
    Pick<
      SidecarClient,
      'draftOpenCutExportManifest' | 'uploadOpenCutExportArtifact' | 'verifyOpenCutExportManifest'
    >
  >
  renderer?: OpenCutExportRenderer
}

type ClipExportMetadata = {
  videoFile: string
}

export function ExportQaPanel({ sessionId, timeline, client, renderer }: ExportQaPanelProps) {
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
  const [statusKind, setStatusKind] = useState<'info' | 'error'>('info')
  const [isRunning, setIsRunning] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isRendering, setIsRendering] = useState(false)
  const isBusy = isRunning || isRefreshing || isUploading || isRendering

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
      setStatusKind('error')
      return
    }
    if (!client?.verifyOpenCutExportManifest) {
      setStatus('sidecar export QA 경로가 없습니다')
      setStatusKind('error')
      return
    }
    if (clipIds.length === 0) {
      setStatus('QA 대상 클립이 없습니다')
      setStatusKind('error')
      return
    }
    const missingVideo = clipIds.some((clipId) => {
      const output = outputs[clipId] ?? defaultOutput(clipId)
      return output.videoFile.trim().length === 0
    })
    if (missingVideo) {
      setStatus('video file is missing')
      setStatusKind('error')
      return
    }
    setIsRunning(true)
    setStatus('Export QA running...')
    setStatusKind('info')
    try {
      const manifest = buildOpenCutExportManifest(timeline, {
        exportedAt: new Date().toISOString(),
        outputs: clipIds.map((clipId) => {
          const output = outputs[clipId] ?? defaultOutput(clipId)
          return {
            clipId,
            videoFile: output.videoFile.trim(),
          }
        }),
      })
      const result = await client.verifyOpenCutExportManifest(sessionId, manifest)
      const clipLabel = result.clip_count === 1 ? 'clip' : 'clips'
      setStatus(
        `QA passed: ${result.clip_count} ${clipLabel}, ${result.total_duration_sec.toFixed(1)}s`
      )
      setStatusKind('info')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'OpenCut export QA 실패')
      setStatusKind('error')
    } finally {
      setIsRunning(false)
    }
  }

  async function refreshExports() {
    if (!timeline) {
      setStatus('timeline 적용 후 export 경로를 새로고침하세요')
      setStatusKind('error')
      return
    }
    if (!client?.draftOpenCutExportManifest) {
      setStatus('sidecar export manifest 경로가 없습니다')
      setStatusKind('error')
      return
    }
    if (clipIds.length === 0) {
      setStatus('새로고침할 클립이 없습니다')
      setStatusKind('error')
      return
    }
    setIsRefreshing(true)
    setStatus('Refreshing export paths...')
    setStatusKind('info')
    try {
      const draft = await client.draftOpenCutExportManifest(sessionId, {
        clip_ids: clipIds,
      })
      const pathsByClip = new Map(
        draft.manifest.clips.map((clip) => [clip.clip_id, clip.video_file])
      )
      setOutputs((current) =>
        Object.fromEntries(
          clipIds.map((clipId) => [
            clipId,
            {
              videoFile:
                pathsByClip.get(clipId) ??
                current[clipId]?.videoFile ??
                defaultOutput(clipId).videoFile,
            },
          ])
        )
      )
      if (draft.missing_files.length > 0) {
        setStatus(`Missing export files: ${draft.missing_files.join(', ')}`)
        setStatusKind('error')
        return
      }
      const clipLabel = draft.manifest.clips.length === 1 ? 'clip' : 'clips'
      setStatus(`Export paths refreshed: ${draft.manifest.clips.length} ${clipLabel}`)
      setStatusKind('info')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'OpenCut export 경로 새로고침 실패')
      setStatusKind('error')
    } finally {
      setIsRefreshing(false)
    }
  }

  async function uploadExport(clipId: string, file: File | undefined) {
    if (!file) {
      return
    }
    if (!client?.uploadOpenCutExportArtifact) {
      setStatus('sidecar export artifact 업로드 경로가 없습니다')
      setStatusKind('error')
      return
    }
    setIsUploading(true)
    setStatus(`Uploading ${clipId}...`)
    setStatusKind('info')
    try {
      const artifact = await client.uploadOpenCutExportArtifact(
        sessionId,
        clipId,
        await file.arrayBuffer()
      )
      updateOutput(clipId, 'videoFile', artifact.video_file)
      setStatus(`Uploaded ${clipId}: ${artifact.byte_size} bytes`)
      setStatusKind('info')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'OpenCut export artifact 업로드 실패')
      setStatusKind('error')
    } finally {
      setIsUploading(false)
    }
  }

  async function renderAndUploadExport(clipId: string) {
    if (!timeline) {
      setStatus('timeline 적용 후 렌더하세요')
      setStatusKind('error')
      return
    }
    if (!renderer) {
      setStatus('OpenCut renderer adapter가 없습니다')
      setStatusKind('error')
      return
    }
    if (!client?.uploadOpenCutExportArtifact) {
      setStatus('sidecar export artifact 업로드 경로가 없습니다')
      setStatusKind('error')
      return
    }
    setIsRendering(true)
    setStatus(`Rendering ${clipId}...`)
    setStatusKind('info')
    try {
      const buffer = await renderer.renderClipExport({ clipId, timeline })
      const artifact = await client.uploadOpenCutExportArtifact(sessionId, clipId, buffer)
      updateOutput(clipId, 'videoFile', artifact.video_file)
      setStatus(`Rendered and uploaded ${clipId}: ${artifact.byte_size} bytes`)
      setStatusKind('info')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'OpenCut render artifact 업로드 실패')
      setStatusKind('error')
    } finally {
      setIsRendering(false)
    }
  }

  return (
    <section
      aria-busy={isBusy}
      aria-label="Export QA"
      className="col-span-3 bg-background px-5 py-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Export QA</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Sidecar probes exported MP4s for duration, loudness, and subtitle evidence.
          </p>
        </div>
        <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border/70 bg-muted/35 px-2.5 text-xs font-medium text-muted-foreground">
          <CheckCircle2 className="size-3.5" aria-hidden="true" />
          {clipIds.length} queued
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {clipIds.length === 0 ? (
          <div className="rounded-md border border-dashed bg-muted/20 px-3 py-4 text-xs text-muted-foreground">
            No applied clips
          </div>
        ) : null}
        {clipIds.map((clipId) => {
          const output = outputs[clipId] ?? defaultOutput(clipId)
          return (
            <div
              className="rounded-md border bg-muted/15 p-3 shadow-sm shadow-black/5"
              key={clipId}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold">
                  <FileVideo className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="truncate">{clipId}</span>
                </span>
                <span className="rounded-sm bg-background px-1.5 py-0.5 text-[0.625rem] font-medium text-muted-foreground">
                  MP4
                </span>
              </div>
              <label className="mt-3 block space-y-1.5 text-xs text-muted-foreground">
                <span>Exported video file</span>
                <input
                  aria-label={`Exported video file for ${clipId}`}
                  className="h-8 w-full rounded-md border bg-background px-2.5 text-xs text-foreground shadow-inner shadow-black/5 outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/25"
                  value={output.videoFile}
                  onChange={(event) =>
                    updateOutput(clipId, 'videoFile', event.currentTarget.value)
                  }
                />
              </label>
              <p className="mt-2 text-[0.6875rem] leading-4 text-muted-foreground">
                Loudness and subtitle contact sheet are measured after submit.
              </p>
              <label className="mt-3 block space-y-1.5 text-xs text-muted-foreground">
                <span>Upload MP4</span>
                <input
                  aria-label={`Upload exported MP4 for ${clipId}`}
                  accept="video/mp4,.mp4"
                  className="block w-full text-xs text-muted-foreground file:mr-2 file:h-7 file:rounded-md file:border-0 file:bg-background file:px-2.5 file:text-xs file:font-medium file:text-foreground hover:file:bg-muted disabled:pointer-events-none disabled:opacity-55"
                  disabled={isBusy}
                  type="file"
                  onChange={(event) => {
                    void uploadExport(clipId, event.currentTarget.files?.[0])
                    event.currentTarget.value = ''
                  }}
                />
              </label>
              {renderer ? (
                <button
                  type="button"
                  aria-label={`Render and upload ${clipId}`}
                  className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium shadow-sm shadow-black/5 transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-55"
                  disabled={isBusy}
                  onClick={() => {
                    void renderAndUploadExport(clipId)
                  }}
                >
                  {isRendering ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  ) : null}
                  Render & Upload
                </button>
              ) : null}
            </div>
          )
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium shadow-sm shadow-black/5 transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-55"
          onClick={refreshExports}
          disabled={isBusy}
        >
          {isRefreshing ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
          Refresh Exports
        </button>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/85 disabled:pointer-events-none disabled:opacity-55"
          onClick={runQa}
          disabled={isBusy}
        >
          {isRunning ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
          Run Export QA
        </button>
        <p
          role={statusKind === 'error' ? 'alert' : 'status'}
          className={
            statusKind === 'error' ? 'text-xs font-medium text-destructive' : 'text-xs text-muted-foreground'
          }
        >
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
  }
}
