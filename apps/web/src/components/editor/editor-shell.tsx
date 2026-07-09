import { useMemo, useState } from 'react'

import type { AppliedTimeline } from '../../lib/editor/apply-timeline-spec'
import type { TimelineSpec } from '../../lib/editor/types'
import { createBrowserClipRenderer } from '../../lib/editor/browser-clip-renderer'
import { createSidecarClient, type SidecarClient } from '../../lib/editor/sidecar-client'
import { AiShortsPanel } from './panels/ai-shorts-panel'
import { ExportQaPanel } from './panels/export-qa-panel'
import { PreviewPlaceholder } from './panels/preview-placeholder'
import { SourceMediaPanel } from './panels/source-media-panel'
import { TimelinePlaceholder } from './panels/timeline-placeholder'

type EditorShellProps = {
  timelineSpec: TimelineSpec
  sidecarClient?: Partial<SidecarClient>
}

export function EditorShell({ timelineSpec, sidecarClient }: EditorShellProps) {
  const client = useMemo(() => sidecarClient ?? createSidecarClient(), [sidecarClient])
  const [sessionId, setSessionId] = useState(timelineSpec.session_id)
  const [sourceFile, setSourceFile] = useState(timelineSpec.source_video.file)
  const [browserSourceFile, setBrowserSourceFile] = useState<File | null>(null)
  const [appliedTimeline, setAppliedTimeline] = useState<AppliedTimeline | null>(null)
  const renderer = useMemo(() => {
    if (!browserSourceFile) {
      return undefined
    }
    return createBrowserClipRenderer({
      sourceFile: browserSourceFile,
      loadCaptionCues: (clipId) => {
        if (!client.getCaptionCues) {
          throw new Error('caption cue 경로가 없습니다')
        }
        return client.getCaptionCues(sessionId, clipId)
      },
    })
  }, [browserSourceFile, client, sessionId])

  return (
    <main className="dark h-screen overflow-auto bg-[#05070a] font-sans text-slate-100">
      <section
        aria-label="OpenCut AI editor workspace"
        className="flex h-screen min-h-0 flex-col"
      >
        <header className="flex h-10 shrink-0 items-center justify-between border-b border-[#242b36] bg-[#0b0e13] px-3">
          <div className="flex min-w-0 items-center gap-4">
            <h1 className="text-sm font-semibold tracking-tight text-slate-100">
              OpenCut
            </h1>
            <nav aria-label="Editor mode" className="hidden items-center gap-1 text-xs md:flex">
              <span className="border-b border-blue-400 px-2 py-2 font-medium text-slate-100">
                Edit
              </span>
              <span className="px-2 py-2 text-slate-500">Captions</span>
              <span className="px-2 py-2 text-slate-500">Export</span>
            </nav>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <span className="hidden text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-slate-500 sm:inline">
              Editor
            </span>
            <span className="h-3 w-px bg-slate-700" aria-hidden="true" />
            <span className="truncate text-[0.6875rem] font-medium text-slate-300">
              Session {sessionId}
            </span>
          </div>
        </header>
        <div className="grid min-h-0 min-w-[1080px] flex-1 grid-cols-[260px_minmax(520px,1fr)_360px] grid-rows-[minmax(0,1fr)_260px_28px] gap-px bg-[#242b36] xl:grid-cols-[300px_minmax(640px,1fr)_380px]">
          <div data-editor-zone="media-bin" className="row-span-2 min-h-0 overflow-hidden">
            <SourceMediaPanel
              client={client}
              sessionId={sessionId}
              sourceFile={sourceFile}
              browserSourceFile={browserSourceFile}
              onSessionIdChange={setSessionId}
              onSourceFileChange={setSourceFile}
              onBrowserSourceFileChange={setBrowserSourceFile}
            />
          </div>
          <div data-editor-zone="viewer" className="min-h-0 overflow-hidden bg-[#07090d]">
            <PreviewPlaceholder sourceFile={browserSourceFile} />
          </div>
          <aside
            data-editor-zone="inspector"
            className="row-span-2 flex min-h-0 flex-col overflow-hidden bg-[#10141c]"
          >
            <div className="flex h-9 shrink-0 items-center justify-between border-b border-[#242b36] bg-[#0f141b] px-3">
              <h2 className="text-xs font-semibold tracking-tight text-slate-200">Inspector</h2>
              <span className="text-[0.625rem] font-medium uppercase tracking-[0.1em] text-slate-500">
                AI Review
              </span>
            </div>
            <AiShortsPanel
              sessionId={sessionId}
              clips={timelineSpec.clips}
              client={client}
              onApplyTimeline={setAppliedTimeline}
            />
            <ExportQaPanel
              sessionId={sessionId}
              timeline={appliedTimeline}
              client={client}
              renderer={renderer}
            />
          </aside>
          <div data-editor-zone="timeline" className="min-h-0 overflow-hidden bg-[#0d1118]">
            <TimelinePlaceholder clips={timelineSpec.clips} appliedTimeline={appliedTimeline} />
          </div>
          <div
            data-editor-zone="statusbar"
            className="col-span-3 flex min-h-0 items-center justify-between gap-4 bg-[#0b0e13] px-3 text-[0.625rem] font-medium text-slate-500"
          >
            <span className="uppercase tracking-[0.1em]">Ready</span>
            <span className="truncate">{sourceFile}</span>
          </div>
        </div>
      </section>
    </main>
  )
}
