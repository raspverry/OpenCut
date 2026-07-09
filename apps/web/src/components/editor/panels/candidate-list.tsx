import type { CandidateClip, TimelineClip } from '../../../lib/editor/types'

type DisplayClip = CandidateClip | TimelineClip

type CandidateListProps = {
  clips: DisplayClip[]
  onApplyClip?: (clipId: string) => void
}

export function CandidateList({ clips, onApplyClip }: CandidateListProps) {
  if (clips.length === 0) {
    return (
      <div className="mt-3 rounded-md border border-dashed border-slate-700 bg-slate-950/40 px-3 py-4 text-xs text-slate-400">
        Run Analyze to generate candidates
      </div>
    )
  }

  return (
    <div className="mt-3 divide-y divide-slate-800 overflow-hidden rounded-md border border-slate-800 bg-slate-950/25">
      {clips.map((clip) => (
        <article
          className="px-3 py-2.5 transition-colors hover:bg-slate-900/80"
          key={clip.clip_id}
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="truncate text-xs font-semibold text-slate-100">{clip.clip_id}</h3>
            <span className="shrink-0 rounded-sm bg-blue-500/15 px-1.5 py-0.5 text-[0.625rem] font-medium text-blue-200">
              Score {clip.score}
            </span>
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-[0.6875rem]">
            <div className="min-w-0">
              <dt className="text-slate-500">Product</dt>
              <dd className="truncate font-medium text-slate-300">
                {clip.product_id ?? 'general'}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-slate-500">Source</dt>
              <dd className="truncate font-medium text-slate-300">{formatRange(sourceRange(clip))}</dd>
            </div>
          </dl>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-300">{clip.reason}</p>
          {transcriptPreview(clip) ? (
            <p className="mt-1 line-clamp-2 border-l border-slate-700 pl-2 text-xs leading-5 text-slate-400">
              {transcriptPreview(clip)}
            </p>
          ) : null}
          {captionPreview(clip) ? (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
              {captionPreview(clip)}
            </p>
          ) : null}
          {onApplyClip ? (
            <button
              type="button"
              aria-label={`Apply ${clip.clip_id}`}
              onClick={() => onApplyClip(clip.clip_id)}
              className="mt-2 inline-flex h-7 items-center rounded-md border border-slate-700 bg-slate-900 px-2.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800"
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

function transcriptPreview(clip: DisplayClip): string | null {
  if ('transcript_preview' in clip) {
    return clip.transcript_preview ?? null
  }
  return null
}

function formatRange([start, end]: [number, number]) {
  return `${start.toFixed(1)}s-${end.toFixed(1)}s`
}
