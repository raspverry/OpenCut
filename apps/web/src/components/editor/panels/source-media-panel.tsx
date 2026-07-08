import type { TimelineSpec } from '../../../lib/editor/types'

type SourceMediaPanelProps = {
  timelineSpec: TimelineSpec
}

export function SourceMediaPanel({ timelineSpec }: SourceMediaPanelProps) {
  return (
    <aside className="bg-background p-4">
      <h2 className="text-sm font-medium">Source Media</h2>
      <p className="mt-3 text-xs">{timelineSpec.source_video.file}</p>
    </aside>
  )
}
