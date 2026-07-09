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
    <main className="dark h-screen overflow-auto bg-[#090b10] font-sans text-slate-100">
      <section
        aria-label="OpenCut AI editor workspace"
        className="flex h-screen min-h-0 flex-col"
      >
        <header className="flex h-11 shrink-0 items-center justify-between border-b border-slate-800 bg-[#0d1017] px-4">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold tracking-tight text-slate-100">
              OpenCut AI Shorts
            </h1>
            <span className="rounded-sm border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[0.625rem] font-medium uppercase text-slate-400">
              Editor
            </span>
          </div>
          <span className="rounded-md border border-slate-700 bg-slate-900/90 px-2 py-1 text-[0.6875rem] font-medium text-slate-300">
            Session {sessionId}
          </span>
        </header>
        <div className="grid min-h-0 min-w-[980px] flex-1 grid-cols-[240px_minmax(420px,1fr)_320px] grid-rows-[minmax(0,1fr)_240px] gap-px bg-slate-800 xl:grid-cols-[280px_minmax(520px,1fr)_360px]">
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
        </div>
      </section>
    </main>
  )
}
