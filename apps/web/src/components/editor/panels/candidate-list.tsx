import type { CandidateClip, TimelineClip } from '../../../lib/editor/types'

type DisplayClip = CandidateClip | TimelineClip

type CandidateListProps = {
  clips: DisplayClip[]
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
              <dd>{formatRange(sourceRange(clip))}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-5">{clip.reason}</p>
          {captionPreview(clip) ? (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{captionPreview(clip)}</p>
          ) : null}
        </article>
      ))}
    </div>
  )
}

function sourceRange(clip: DisplayClip): [number, number] {
  if ('source_range_sec' in clip) {
    return clip.source_range_sec
  }
  return [clip.start_sec, clip.end_sec]
}

function captionPreview(clip: DisplayClip): string | null {
  if ('caption' in clip) {
    return clip.caption
  }
  return null
}

function formatRange([start, end]: [number, number]) {
  return `${start.toFixed(1)}s-${end.toFixed(1)}s`
}
