import type { AppliedTimeline } from '../../../lib/editor/apply-timeline-spec'
import type { TimelineClip } from '../../../lib/editor/types'

type TimelinePlaceholderProps = {
  clips: TimelineClip[]
  appliedTimeline?: AppliedTimeline | null
}

export function TimelinePlaceholder({ clips, appliedTimeline }: TimelinePlaceholderProps) {
  const blocks = appliedTimeline ? blocksFromAppliedTimeline(appliedTimeline) : blocksFromClips(clips)
  const durationSec = Math.max(
    30,
    ...blocks.map((block) => block.timelineStartSec + block.durationSec)
  )

  return (
    <section className="flex h-full min-h-0 flex-col bg-[#0d1118]">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-[#242b36] px-3">
        <h2 className="text-xs font-semibold tracking-tight text-slate-200">Sequence</h2>
        <span className="font-mono text-[0.6875rem] font-semibold text-slate-400">
          00:00-{formatTimelineTime(durationSec)}
        </span>
      </div>
      <div className="grid h-7 shrink-0 grid-cols-[104px_repeat(6,minmax(0,1fr))] border-b border-[#242b36] bg-[#0a0d13] text-[0.625rem] font-medium text-slate-500">
        <span className="border-r border-[#242b36] px-3 py-2">Tracks</span>
        {timelineTicks(durationSec).map((tick) => (
          <span className="border-r border-[#1c2430] px-2 py-2" key={tick}>
            {formatTimelineTime(tick)}
          </span>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {TIMELINE_TRACKS.map((track) => (
          <div
            className="grid min-h-11 grid-cols-[104px_minmax(0,1fr)] border-b border-[#1b2230] text-xs last:border-b-0"
            data-editor-track={track.id}
            key={track.id}
          >
            <div className="flex items-center gap-2 border-r border-[#242b36] bg-[#0a0d13] px-3">
              <span className="font-mono text-[0.6875rem] font-semibold text-slate-200">
                {track.id}
              </span>
              <span className="truncate text-[0.625rem] font-medium uppercase tracking-[0.08em] text-slate-600">
                {track.label}
              </span>
            </div>
            <div className="relative min-h-11 overflow-hidden bg-[linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[length:16.66%_100%] px-2 py-1.5">
              {blocks
                .filter((block) => block.trackId === track.id)
                .map((block) => (
                  <div
                    className={`absolute top-1.5 flex h-8 min-w-10 items-center rounded-[3px] border px-2 shadow-inner shadow-black/25 ${trackClass(block.kind)}`}
                    key={block.id}
                    style={{
                      left: `${blockPercent(block.timelineStartSec, durationSec)}%`,
                      width: `${blockPercent(block.durationSec, durationSec)}%`,
                    }}
                    title={block.id}
                  >
                    <span className="truncate text-[0.6875rem] font-medium text-slate-100/85">
                      {block.id}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

type TrackId = 'T1' | 'C1' | 'V1' | 'A1'

type TimelineBlock = {
  id: string
  trackId: TrackId
  kind: string
  timelineStartSec: number
  durationSec: number
}

const TIMELINE_TRACKS: Array<{ id: TrackId; label: string }> = [
  { id: 'T1', label: 'Titles' },
  { id: 'C1', label: 'Caps' },
  { id: 'V1', label: 'Video' },
  { id: 'A1', label: 'Audio' },
]

function blocksFromAppliedTimeline(timeline: AppliedTimeline): TimelineBlock[] {
  return timeline.elements.map((element) => ({
    id: element.id,
    trackId: trackIdForElement(element.type),
    kind: element.type,
    timelineStartSec: element.timelineStartSec,
    durationSec: element.durationSec,
  }))
}

function blocksFromClips(clips: TimelineClip[]): TimelineBlock[] {
  return clips.flatMap((clip) => {
    const [sourceStartSec, sourceEndSec] = clip.source_range_sec
    const durationSec = sourceEndSec - sourceStartSec
    const overlayDurationSec = Math.min(3, durationSec)
    return [
      {
        id: `${clip.clip_id}-hook`,
        trackId: 'T1' as const,
        kind: 'hook_text',
        timelineStartSec: clip.timeline_start_sec,
        durationSec: overlayDurationSec,
      },
      {
        id: `${clip.clip_id}-captions`,
        trackId: 'C1' as const,
        kind: 'caption_track',
        timelineStartSec: clip.timeline_start_sec,
        durationSec,
      },
      {
        id: `${clip.clip_id}-video`,
        trackId: 'V1' as const,
        kind: 'video',
        timelineStartSec: clip.timeline_start_sec,
        durationSec,
      },
      {
        id: `${clip.clip_id}-audio`,
        trackId: 'A1' as const,
        kind: 'audio',
        timelineStartSec: clip.timeline_start_sec,
        durationSec,
      },
    ]
  })
}

function trackIdForElement(type: AppliedTimeline['elements'][number]['type']): TrackId {
  if (type === 'video') {
    return 'V1'
  }
  if (type === 'audio') {
    return 'A1'
  }
  if (type === 'caption_track' || type === 'caption_text') {
    return 'C1'
  }
  return 'T1'
}

function blockPercent(value: number, durationSec: number): number {
  return Math.max(0, Math.min(100, (value / durationSec) * 100))
}

function timelineTicks(durationSec: number): number[] {
  const interval = durationSec / 6
  return Array.from({ length: 6 }, (_, index) => Math.round(interval * (index + 1)))
}

function formatTimelineTime(seconds: number): string {
  const wholeSeconds = Math.floor(seconds)
  const minutes = Math.floor(wholeSeconds / 60)
  const remainingSeconds = wholeSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

function trackClass(label: string): string {
  if (label === 'video') {
    return 'border-sky-500/35 bg-sky-500/20'
  }
  if (label === 'audio') {
    return 'border-emerald-500/35 bg-emerald-500/20'
  }
  if (label.includes('text') || label.includes('caption')) {
    return 'border-amber-400/35 bg-amber-400/20'
  }
  return 'border-slate-600 bg-slate-800/70'
}
