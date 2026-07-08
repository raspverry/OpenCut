import { describe, expect, it } from 'vitest'

import { mockTimelineSpec } from './mock-timeline-spec'

describe('mockTimelineSpec', () => {
  it('matches the OpenCut timeline spec contract', () => {
    expect(mockTimelineSpec.renderer).toBe('opencut')
    expect(mockTimelineSpec.language).toBe('ja')
    expect(mockTimelineSpec.source_video.file).toBe('raw/recording.mp4')
    expect(mockTimelineSpec.clips.length).toBeGreaterThanOrEqual(1)
    expect(mockTimelineSpec.clips[0]?.caption_file).toBe('caption_cues/p01-c01.json')
    expect(mockTimelineSpec.clips[0]?.source_range_sec).toEqual([10, 28])
  })
})
