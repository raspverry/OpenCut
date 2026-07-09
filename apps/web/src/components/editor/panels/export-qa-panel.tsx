import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, FileVideo, Loader2 } from 'lucide-react'

import type { AppliedTimeline } from '../../../lib/editor/apply-timeline-spec'
import { buildOpenCutExportManifest } from '../../../lib/editor/open-cut-export-report'
import type { SidecarClient } from '../../../lib/editor/sidecar-client'
import type { ClipState, ClipStateStatus, ClipStateUpdate } from '../../../lib/editor/types'

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
      | 'draftOpenCutExportManifest'
      | 'getClipState'
      | 'updateClipState'
      | 'uploadOpenCutExportArtifact'
      | 'verifyOpenCutExportManifest'
    >
  >
  renderer?: OpenCutExportRenderer
}

type ClipExportMetadata = {
  videoFile: string
}

type ReviewDraft = {
  status: ClipStateStatus
  hookText: string
  caption: string
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
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, ReviewDraft>>({})
  const [status, setStatus] = useState('Ready')
  const [statusKind, setStatusKind] = useState<'info' | 'error'>('info')
  const [isRunning, setIsRunning] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [reviewBusyClipId, setReviewBusyClipId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isRendering, setIsRendering] = useState(false)
  const isBusy = isRunning || isRefreshing || isUploading || isRendering || reviewBusyClipId !== null

  useEffect(() => {
    setOutputs((current) =>
      Object.fromEntries(
        clipIds.map((clipId) => [clipId, current[clipId] ?? defaultOutput(clipId)])
      )
    )
    setReviewDrafts((current) =>
      Object.fromEntries(
        clipIds.map((clipId) => [clipId, current[clipId] ?? defaultReviewDraft()])
      )
    )
  }, [clipIds, clipKey])

  async function runQa() {
    if (!timeline) {
      setStatus('Insert a clip before checking delivery')
      setStatusKind('error')
      return
    }
    if (!client?.verifyOpenCutExportManifest) {
      setStatus('Delivery check is unavailable')
      setStatusKind('error')
      return
    }
    if (clipIds.length === 0) {
      setStatus('No clips queued for delivery')
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
    setStatus('Checking delivery...')
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
        `Delivery check passed: ${result.clip_count} ${clipLabel}, ${result.total_duration_sec.toFixed(1)}s`
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
      setStatus('Insert clips before refreshing outputs')
      setStatusKind('error')
      return
    }
    if (!client?.draftOpenCutExportManifest) {
      setStatus('Output refresh is unavailable')
      setStatusKind('error')
      return
    }
    if (clipIds.length === 0) {
      setStatus('No clips queued for output refresh')
      setStatusKind('error')
      return
    }
    setIsRefreshing(true)
    setStatus('Refreshing outputs...')
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
      setStatus(`Outputs refreshed: ${draft.manifest.clips.length} ${clipLabel}`)
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
      setStatus('Insert a clip before rendering')
      setStatusKind('error')
      return
    }
    if (!renderer) {
      setStatus('Browser renderer is unavailable')
      setStatusKind('error')
      return
    }
    if (!client?.uploadOpenCutExportArtifact) {
      setStatus('Upload endpoint is unavailable')
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
      setStatus(`Rendered ${clipId}: ${artifact.byte_size} bytes`)
      setStatusKind('info')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'OpenCut render artifact 업로드 실패')
      setStatusKind('error')
    } finally {
      setIsRendering(false)
    }
  }

  async function loadReview(clipId: string) {
    if (!client?.getClipState) {
      setStatus('sidecar review state 경로가 없습니다')
      setStatusKind('error')
      return
    }
    setReviewBusyClipId(clipId)
    setStatus(`Loading review ${clipId}...`)
    setStatusKind('info')
    try {
      const state = await client.getClipState(sessionId, clipId)
      setReviewDrafts((current) => ({
        ...current,
        [clipId]: reviewDraftFromState(state),
      }))
      setStatus(`Loaded review ${clipId}`)
      setStatusKind('info')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'OpenCut review state 로드 실패')
      setStatusKind('error')
    } finally {
      setReviewBusyClipId(null)
    }
  }

  async function saveReview(clipId: string) {
    if (!client?.updateClipState) {
      setStatus('sidecar review state 저장 경로가 없습니다')
      setStatusKind('error')
      return
    }
    const draft = reviewDrafts[clipId] ?? defaultReviewDraft()
    setReviewBusyClipId(clipId)
    setStatus(`Saving review ${clipId}...`)
    setStatusKind('info')
    try {
      const payload: ClipStateUpdate = {
        status: draft.status,
        hook_text: draft.hookText,
        caption: draft.caption,
      }
      await client.updateClipState(sessionId, clipId, payload)
      setStatus(`Saved review ${clipId}`)
      setStatusKind('info')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'OpenCut review state 저장 실패')
      setStatusKind('error')
    } finally {
      setReviewBusyClipId(null)
    }
  }

  return (
    <section
      aria-busy={isBusy}
      aria-label="Export QA"
      className="flex min-h-[260px] flex-1 flex-col overflow-hidden bg-[#10141c]"
    >
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-[#252a34] px-3 py-3">
        <div>
          <h2 className="text-xs font-semibold tracking-tight text-slate-200">Delivery</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Render selected clips and run final checks before handoff.
          </p>
        </div>
        <span className="inline-flex h-7 items-center gap-1.5 rounded-[5px] border border-slate-700 bg-slate-900 px-2.5 text-xs font-medium text-slate-400">
          <CheckCircle2 className="size-3.5" aria-hidden="true" />
          {clipIds.length} queued
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {clipIds.length === 0 ? (
          <div className="m-3 rounded-[5px] border border-dashed border-slate-700 bg-slate-950/40 px-3 py-4 text-xs text-slate-400">
            Insert a clip into the sequence to enable delivery.
          </div>
        ) : null}
        {clipIds.map((clipId) => {
          const output = outputs[clipId] ?? defaultOutput(clipId)
          const review = reviewDrafts[clipId] ?? defaultReviewDraft()
          return (
            <div
              className="border-b border-[#252a34] px-3 py-3 last:border-b-0"
              key={clipId}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold text-slate-100">
                  <FileVideo className="size-3.5 shrink-0 text-slate-500" aria-hidden="true" />
                  <span className="truncate">{clipId}</span>
                </span>
                <span className="rounded-sm bg-slate-900 px-1.5 py-0.5 text-[0.625rem] font-medium text-slate-500">
                  MP4
                </span>
              </div>
              <label className="mt-3 block space-y-1.5 text-xs text-slate-400">
                <span>Exported video file</span>
                <input
                  aria-label={`Exported video file for ${clipId}`}
                  className="h-8 w-full rounded-[5px] border border-slate-700 bg-slate-950/80 px-2.5 text-xs text-slate-100 shadow-inner shadow-black/20 outline-none transition-colors placeholder:text-slate-600 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                  value={output.videoFile}
                  onChange={(event) =>
                    updateOutput(clipId, 'videoFile', event.currentTarget.value)
                  }
                />
              </label>
              <p className="mt-2 text-[0.6875rem] leading-4 text-slate-500">
                Final check measures duration, loudness, and subtitle evidence.
              </p>
              <div className="mt-3 rounded-[5px] border border-slate-800 bg-slate-950/35 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[0.6875rem] font-semibold text-slate-200">
                    Review
                  </span>
                  <button
                    type="button"
                    aria-label={`Load review ${clipId}`}
                    className="h-7 rounded-[5px] border border-slate-700 bg-slate-900 px-2 text-[0.6875rem] font-medium text-slate-200 transition-colors hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-55"
                    disabled={isBusy}
                    onClick={() => {
                      void loadReview(clipId)
                    }}
                  >
                    Load
                  </button>
                </div>
                <label className="mt-2 block space-y-1 text-[0.6875rem] text-slate-400">
                  <span>Status</span>
                  <select
                    aria-label={`Review status for ${clipId}`}
                    className="h-8 w-full rounded-[5px] border border-slate-700 bg-slate-950/80 px-2 text-xs text-slate-100 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                    value={review.status}
                    onChange={(event) =>
                      updateReviewDraft(clipId, {
                        status: event.currentTarget.value as ClipStateStatus,
                      })
                    }
                  >
                    <option value="pending">pending</option>
                    <option value="approved">approved</option>
                    <option value="rejected">rejected</option>
                  </select>
                </label>
                <label className="mt-2 block space-y-1 text-[0.6875rem] text-slate-400">
                  <span>Hook</span>
                  <input
                    aria-label={`Hook text for ${clipId}`}
                    className="h-8 w-full rounded-[5px] border border-slate-700 bg-slate-950/80 px-2 text-xs text-slate-100 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                    value={review.hookText}
                    onChange={(event) =>
                      updateReviewDraft(clipId, { hookText: event.currentTarget.value })
                    }
                  />
                </label>
                <label className="mt-2 block space-y-1 text-[0.6875rem] text-slate-400">
                  <span>Caption</span>
                  <input
                    aria-label={`Caption for ${clipId}`}
                    className="h-8 w-full rounded-[5px] border border-slate-700 bg-slate-950/80 px-2 text-xs text-slate-100 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                    value={review.caption}
                    onChange={(event) =>
                      updateReviewDraft(clipId, { caption: event.currentTarget.value })
                    }
                  />
                </label>
                <button
                  type="button"
                  aria-label={`Save review ${clipId}`}
                  className="mt-2 h-7 w-full rounded-[5px] border border-slate-700 bg-slate-900 px-2 text-[0.6875rem] font-medium text-slate-200 transition-colors hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-55"
                  disabled={isBusy}
                  onClick={() => {
                    void saveReview(clipId)
                  }}
                >
                  Save
                </button>
              </div>
              <label className="mt-3 block space-y-1.5 text-xs text-slate-400">
                <span>Upload MP4</span>
                <input
                  aria-label={`Upload exported MP4 for ${clipId}`}
                  accept="video/mp4,.mp4"
                  className="block w-full text-xs text-slate-400 file:mr-2 file:h-7 file:rounded-[5px] file:border-0 file:bg-slate-900 file:px-2.5 file:text-xs file:font-medium file:text-slate-200 hover:file:bg-slate-800 disabled:pointer-events-none disabled:opacity-55"
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
                  className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-[5px] border border-blue-400/40 bg-blue-500/10 px-3 text-xs font-medium text-blue-100 transition-colors hover:bg-blue-500/20 disabled:pointer-events-none disabled:opacity-55"
                  disabled={isBusy}
                  onClick={() => {
                    void renderAndUploadExport(clipId)
                  }}
                >
                  {isRendering ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  ) : null}
                  Render clip
                </button>
              ) : null}
            </div>
          )
        })}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-[#252a34] px-3 py-3">
        <button
          type="button"
          aria-label="Refresh Exports"
          className="inline-flex h-8 items-center gap-1.5 rounded-[5px] border border-slate-700 bg-slate-900 px-3 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-55"
          onClick={refreshExports}
          disabled={isBusy}
        >
          {isRefreshing ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
          Refresh outputs
        </button>
        <button
          type="button"
          aria-label="Run Export QA"
          className="inline-flex h-8 items-center gap-1.5 rounded-[5px] bg-blue-500 px-3 text-xs font-medium text-white transition-colors hover:bg-blue-400 disabled:pointer-events-none disabled:opacity-55"
          onClick={runQa}
          disabled={isBusy}
        >
          {isRunning ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
          Check delivery
        </button>
        <p
          role={statusKind === 'error' ? 'alert' : 'status'}
          className={
            statusKind === 'error' ? 'text-xs font-medium text-red-300' : 'text-xs text-slate-400'
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

  function updateReviewDraft(clipId: string, patch: Partial<ReviewDraft>) {
    setReviewDrafts((current) => ({
      ...current,
      [clipId]: {
        ...(current[clipId] ?? defaultReviewDraft()),
        ...patch,
      },
    }))
  }
}

function defaultOutput(clipId: string): ClipExportMetadata {
  return {
    videoFile: `final/${clipId}.mp4`,
  }
}

function defaultReviewDraft(): ReviewDraft {
  return {
    status: 'pending',
    hookText: '',
    caption: '',
  }
}

function reviewDraftFromState(state: ClipState): ReviewDraft {
  return {
    status: state.status,
    hookText: state.hook_text,
    caption: state.caption,
  }
}
