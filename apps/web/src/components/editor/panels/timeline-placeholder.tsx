import type { TimelineClip } from '../../../lib/editor/types'

type TimelinePlaceholderProps = {
  clips: TimelineClip[]
}

export function TimelinePlaceholder({ clips }: TimelinePlaceholderProps) {
  return (
    <section className="col-span-3 bg-background p-4">
      <h2 className="text-sm font-medium">Timeline</h2>
      <div className="mt-4 space-y-2">
        {clips.map((clip) => (
          <div className="grid grid-cols-[120px_1fr] items-center gap-3 text-xs" key={clip.clip_id}>
            <span>{clip.clip_id}</span>
            <div className="h-8 rounded-sm border bg-muted" />
          </div>
        ))}
      </div>
    </section>
  )
}
