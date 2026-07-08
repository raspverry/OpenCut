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
    <section className="col-span-3 bg-card p-4">
      <h2 className="text-sm font-semibold tracking-tight">Timeline</h2>
      <div className="mt-4 space-y-2">
        {rows.map((row) => (
          <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center gap-3 text-xs" key={row.id}>
            <span className="truncate font-medium">{row.id}</span>
            <span className="sr-only">{row.label}</span>
            <div className={`h-8 rounded-sm border shadow-inner shadow-black/5 ${trackClass(row.label)}`} />
          </div>
        ))}
      </div>
    </section>
  )
}

function trackClass(label: string): string {
  if (label === 'video') {
    return 'bg-sky-100/80 dark:bg-sky-950/40'
  }
  if (label === 'audio') {
    return 'bg-emerald-100/80 dark:bg-emerald-950/40'
  }
  if (label.includes('text') || label.includes('caption')) {
    return 'bg-fuchsia-100/70 dark:bg-fuchsia-950/35'
  }
  return 'bg-muted'
}
