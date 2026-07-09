import type { CandidateClip, TimelineClip } from '../../../lib/editor/types'

type DisplayClip = CandidateClip | TimelineClip

type CandidateListProps = {
  clips: DisplayClip[]
  onApplyClip?: (clipId: string) => void
}

export function CandidateList({ clips, onApplyClip }: CandidateListProps) {
  if (clips.length === 0) {
    return (
      <div className="mt-3 rounded-[5px] border border-dashed border-slate-700 bg-slate-950/40 px-3 py-4 text-xs text-slate-400">
        Find highlights to populate the cut list.
      </div>
    )
  }

  return (
    <div className="mt-3 space-y-2">
      {clips.map((clip) => (
        <article
          className="rounded-[6px] border border-[#27303d] bg-[#0c1017] p-3 shadow-sm shadow-black/20 transition-colors hover:border-blue-400/35 hover:bg-[#111722]"
          key={clip.clip_id}
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="truncate text-xs font-semibold text-slate-100">{clip.clip_id}</h3>
            <div
              aria-label={`Score ${clip.score}`}
              className="flex shrink-0 items-center gap-1.5"
            >
              <span className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-800">
                <span
                  className="block h-full rounded-full bg-blue-400"
                  style={{ width: `${Math.max(0, Math.min(100, clip.score))}%` }}
                />
              </span>
              <span className="w-6 text-right font-mono text-[0.625rem] font-semibold text-blue-200">
                {clip.score}
              </span>
            </div>
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
            <p className="mt-2 line-clamp-2 border-l border-slate-700 pl-2 text-xs leading-5 text-slate-400">
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
              className="mt-3 inline-flex h-7 items-center rounded-[5px] border border-slate-700 bg-slate-900 px-2.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800"
            >
              Insert
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
