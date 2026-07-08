import { useMemo, useState } from 'react'

import type { AppliedTimeline } from '../../lib/editor/apply-timeline-spec'
import type { TimelineSpec } from '../../lib/editor/types'
import { createSidecarClient, type SidecarClient } from '../../lib/editor/sidecar-client'
import { AiShortsPanel } from './panels/ai-shorts-panel'
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
    <main className="min-h-screen bg-background text-foreground">
      <section aria-label="OpenCut AI Shorts editor" className="flex min-h-screen flex-col">
        <header className="border-b px-5 py-3">
          <h1 className="text-lg font-semibold">OpenCut AI Shorts</h1>
        </header>
        <div className="grid flex-1 grid-cols-[280px_1fr_320px] grid-rows-[1fr_220px] gap-px bg-border">
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
          <TimelinePlaceholder clips={timelineSpec.clips} appliedTimeline={appliedTimeline} />
        </div>
      </section>
    </main>
  )
}
