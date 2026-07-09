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
    <main className="dark h-screen overflow-hidden bg-[#05070a] font-sans text-slate-100">
      <section
        aria-label="OpenCut AI editor workspace"
        className="flex h-screen min-h-0 flex-col"
      >
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#252a34] bg-[#0b0d12] px-3">
          <div className="flex min-w-0 items-center gap-5">
            <div className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className="flex size-6 items-center justify-center rounded-[5px] bg-[#f4f4f5] text-[0.6875rem] font-bold text-[#05070a]"
              >
                OC
              </span>
              <div className="min-w-0">
                <h1 className="text-sm font-semibold leading-4 tracking-tight text-slate-100">
                  OpenCut
                </h1>
                <p className="hidden truncate text-[0.625rem] font-medium uppercase tracking-[0.12em] text-slate-500 sm:block">
                  AI shorts workspace
                </p>
              </div>
            </div>
            <nav
              aria-label="Editor mode"
              className="hidden h-8 items-center rounded-[6px] border border-[#2b303b] bg-[#11151d] p-0.5 text-xs md:flex"
            >
              <span className="rounded-[4px] bg-[#f4f4f5] px-3 py-1.5 font-medium text-[#05070a]">
                Edit
              </span>
              <span className="px-3 py-1.5 font-medium text-slate-500">Captions</span>
              <span className="px-3 py-1.5 font-medium text-slate-500">Deliver</span>
            </nav>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <span className="hidden rounded-[4px] border border-[#2b303b] bg-[#11151d] px-2 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-slate-400 md:inline-flex">
              Local sidecar
            </span>
            <span className="max-w-[280px] truncate rounded-[4px] bg-[#161b24] px-2 py-1 text-[0.6875rem] font-medium text-slate-300">
              Session {sessionId}
            </span>
          </div>
        </header>
        <div className="grid min-h-0 min-w-[1180px] flex-1 grid-cols-[280px_minmax(640px,1fr)_420px] grid-rows-[minmax(0,1fr)_300px_30px] gap-px bg-[#252a34] xl:grid-cols-[300px_minmax(720px,1fr)_440px]">
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
            <div className="flex h-10 shrink-0 items-center justify-between border-b border-[#252a34] bg-[#0f131a] px-3">
              <h2 className="text-xs font-semibold tracking-tight text-slate-200">Inspector</h2>
              <div className="flex items-center gap-1 rounded-[5px] border border-[#2b303b] bg-[#0a0d13] p-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.08em]">
                <span className="rounded-[3px] bg-blue-500 px-2 py-1 text-white">AI</span>
                <span className="px-2 py-1 text-slate-500">Clip</span>
                <span className="px-2 py-1 text-slate-500">Export</span>
              </div>
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
            className="col-span-3 flex min-h-0 items-center justify-between gap-4 bg-[#0b0d12] px-3 text-[0.625rem] font-medium text-slate-500"
          >
            <span className="uppercase tracking-[0.1em]">Ready</span>
            <span className="truncate">{sourceFile}</span>
          </div>
        </div>
      </section>
    </main>
  )
}
