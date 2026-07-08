import type { TimelineClip } from '../../../lib/editor/types'

type CandidateListProps = {
  clips: TimelineClip[]
}

export function CandidateList({ clips }: CandidateListProps) {
  return (
    <div className="mt-4 space-y-3">
      {clips.map((clip) => (
        <article className="rounded-md border p-3" key={clip.clip_id}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">{clip.clip_id}</h3>
            <span className="text-xs">Score {clip.score}</span>
          </div>
          <dl className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between gap-3">
              <dt>Product</dt>
              <dd>{clip.product_id ?? 'general'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Source</dt>
              <dd>{formatRange(clip.source_range_sec)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-5">{clip.reason}</p>
        </article>
      ))}
    </div>
  )
}

function formatRange([start, end]: [number, number]) {
  return `${start.toFixed(1)}s-${end.toFixed(1)}s`
}
