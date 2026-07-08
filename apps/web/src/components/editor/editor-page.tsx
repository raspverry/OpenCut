import { mockTimelineSpec } from '../../lib/editor/mock-timeline-spec'
import { EditorShell } from './editor-shell'

export function EditorPage() {
  return <EditorShell timelineSpec={mockTimelineSpec} />
}
