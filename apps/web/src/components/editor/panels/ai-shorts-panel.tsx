import type { TimelineClip } from '../../../lib/editor/types'
import { CandidateList } from './candidate-list'

type AiShortsPanelProps = {
  clips: TimelineClip[]
}

export function AiShortsPanel({ clips }: AiShortsPanelProps) {
  return (
    <aside className="bg-background p-4">
      <h2 className="text-sm font-medium">AI Shorts</h2>
      <CandidateList clips={clips} />
    </aside>
  )
}
