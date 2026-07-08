import type { CandidateClip, TimelineClip } from '../../../lib/editor/types'

type DisplayClip = CandidateClip | TimelineClip

type CandidateListProps = {
  clips: DisplayClip[]
  onApplyClip?: (clipId: string) => void
}

export function CandidateList({ clips, onApplyClip }: CandidateListProps) {
  if (clips.length === 0) {
    return (
      <div className="mt-4 rounded-md border border-dashed bg-muted/20 px-3 py-4 text-xs text-muted-foreground">
        Run Analyze to generate candidates
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-3">
      {clips.map((clip) => (
        <article
          className="rounded-md border bg-background p-3 shadow-sm shadow-black/5 transition-colors hover:bg-muted/20"
          key={clip.clip_id}
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">{clip.clip_id}</h3>
            <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[0.6875rem] font-medium">
              Score {clip.score}
            </span>
          </div>
          <dl className="mt-3 space-y-1 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Product</dt>
              <dd className="font-medium">{clip.product_id ?? 'general'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Source</dt>
              <dd className="font-medium">{formatRange(sourceRange(clip))}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-5">{clip.reason}</p>
          {captionPreview(clip) ? (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{captionPreview(clip)}</p>
          ) : null}
          {onApplyClip ? (
            <button
              type="button"
              aria-label={`Apply ${clip.clip_id}`}
              onClick={() => onApplyClip(clip.clip_id)}
              className="mt-3 inline-flex h-7 items-center rounded-md border bg-background px-2.5 text-xs font-medium shadow-sm shadow-black/5 transition-colors hover:bg-muted"
            >
              Apply
            </button>
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
