import type { AppliedTimeline } from '../../../lib/editor/apply-timeline-spec'
import type { TimelineClip } from '../../../lib/editor/types'

type TimelinePlaceholderProps = {
  clips: TimelineClip[]
  appliedTimeline?: AppliedTimeline | null
}

export function TimelinePlaceholder({ clips, appliedTimeline }: TimelinePlaceholderProps) {
  const rows = appliedTimeline
    ? appliedTimeline.elements.map((element) => ({
        id: element.id,
        label: element.type,
      }))
    : clips.map((clip) => ({
        id: clip.clip_id,
        label: 'clip',
      }))

  return (
    <section className="col-span-3 bg-background p-4">
      <h2 className="text-sm font-medium">Timeline</h2>
      <div className="mt-4 space-y-2">
        {rows.map((row) => (
          <div className="grid grid-cols-[160px_1fr] items-center gap-3 text-xs" key={row.id}>
            <span>{row.id}</span>
            <span className="sr-only">{row.label}</span>
            <div className="h-8 rounded-sm border bg-muted" />
          </div>
        ))}
      </div>
    </section>
  )
}
