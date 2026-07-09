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
        preview: 'text' in element ? element.text : '',
      }))
    : clips.map((clip) => ({
        id: clip.clip_id,
        label: 'clip',
        preview: '',
      }))

  return (
    <section className="flex h-full min-h-0 flex-col bg-[#0d1118]">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-slate-800 px-3">
        <h2 className="text-xs font-semibold tracking-tight text-slate-200">Timeline</h2>
        <span className="text-[0.625rem] font-medium uppercase text-slate-500">
          {rows.length} lanes
        </span>
      </div>
      <div className="grid h-7 shrink-0 grid-cols-[116px_repeat(4,minmax(0,1fr))] border-b border-slate-800 text-[0.625rem] font-medium text-slate-500">
        <span className="border-r border-slate-800 px-3 py-2">Track</span>
        <span className="px-2 py-2">00:00</span>
        <span className="px-2 py-2">00:10</span>
        <span className="px-2 py-2">00:20</span>
        <span className="px-2 py-2">00:30</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
        {rows.map((row) => (
          <div
            className="grid grid-cols-[116px_minmax(0,1fr)] items-center gap-3 py-1 text-xs"
            key={row.id}
          >
            <span className="truncate font-medium text-slate-300">{row.id}</span>
            <span className="sr-only">{row.label}</span>
            <div
              className={`flex h-8 min-w-0 items-center rounded-[4px] border px-2 shadow-inner shadow-black/20 ${trackClass(row.label)}`}
            >
              {row.preview ? (
                <span className="truncate text-[0.6875rem] font-medium text-slate-100/80">
                  {row.preview}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function trackClass(label: string): string {
  if (label === 'video') {
    return 'border-sky-500/30 bg-sky-500/15'
  }
  if (label === 'audio') {
    return 'border-emerald-500/30 bg-emerald-500/15'
  }
  if (label.includes('text') || label.includes('caption')) {
    return 'border-fuchsia-500/30 bg-fuchsia-500/15'
  }
  return 'border-slate-700 bg-slate-800/70'
}
