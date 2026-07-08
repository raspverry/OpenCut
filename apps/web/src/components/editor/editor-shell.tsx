import type { TimelineSpec } from '../../lib/editor/types'
import type { SidecarClient } from '../../lib/editor/sidecar-client'
import { AiShortsPanel } from './panels/ai-shorts-panel'
import { PreviewPlaceholder } from './panels/preview-placeholder'
import { SourceMediaPanel } from './panels/source-media-panel'
import { TimelinePlaceholder } from './panels/timeline-placeholder'

type EditorShellProps = {
  timelineSpec: TimelineSpec
  sidecarClient?: Pick<SidecarClient, 'analyze'>
}

export function EditorShell({ timelineSpec, sidecarClient }: EditorShellProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section aria-label="OpenCut AI Shorts editor" className="flex min-h-screen flex-col">
        <header className="border-b px-5 py-3">
          <h1 className="text-lg font-semibold">OpenCut AI Shorts</h1>
        </header>
        <div className="grid flex-1 grid-cols-[280px_1fr_320px] grid-rows-[1fr_220px] gap-px bg-border">
          <SourceMediaPanel timelineSpec={timelineSpec} />
          <PreviewPlaceholder />
          <AiShortsPanel
            sessionId={timelineSpec.session_id}
            clips={timelineSpec.clips}
            client={sidecarClient}
          />
          <TimelinePlaceholder clips={timelineSpec.clips} />
        </div>
      </section>
    </main>
  )
}
