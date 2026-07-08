import { useMemo, useState } from 'react'

import type { AppliedTimeline } from '../../lib/editor/apply-timeline-spec'
import type { TimelineSpec } from '../../lib/editor/types'
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
  const [appliedTimeline, setAppliedTimeline] = useState<AppliedTimeline | null>(null)

  return (
    <main className="min-h-screen bg-muted/30 font-sans text-foreground">
      <section aria-label="OpenCut AI Shorts editor" className="flex min-h-screen flex-col">
        <header className="flex h-12 items-center justify-between border-b bg-background px-5 shadow-sm shadow-black/5">
          <h1 className="text-sm font-semibold tracking-tight">OpenCut AI Shorts</h1>
          <span className="rounded-md border bg-muted/35 px-2 py-1 text-[0.6875rem] font-medium text-muted-foreground">
            Session {sessionId}
          </span>
        </header>
        <div className="grid flex-1 grid-cols-[280px_minmax(0,1fr)_320px] grid-rows-[minmax(0,1fr)_auto_minmax(220px,auto)] gap-px bg-border">
          <SourceMediaPanel
            client={client}
            sessionId={sessionId}
            sourceFile={sourceFile}
            onSessionIdChange={setSessionId}
            onSourceFileChange={setSourceFile}
          />
          <PreviewPlaceholder />
          <AiShortsPanel
            sessionId={sessionId}
            clips={timelineSpec.clips}
            client={client}
            onApplyTimeline={setAppliedTimeline}
          />
          <ExportQaPanel sessionId={sessionId} timeline={appliedTimeline} client={client} />
          <TimelinePlaceholder clips={timelineSpec.clips} appliedTimeline={appliedTimeline} />
        </div>
      </section>
    </main>
  )
}
