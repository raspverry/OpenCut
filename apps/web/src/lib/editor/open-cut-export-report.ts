import type { AppliedTimeline } from './apply-timeline-spec'
import type { OpenCutExportManifest, OpenCutExportReport } from './types'

export type OpenCutExportOutput = {
  clipId: string
  videoFile: string
  integratedLufs: number
  subtitleEvidenceFile: string
}

export type BuildOpenCutExportReportInput = {
  exportedAt: string
  outputs: OpenCutExportOutput[]
}

export type OpenCutExportManifestOutput = {
  clipId: string
  videoFile: string
}

export type BuildOpenCutExportManifestInput = {
  exportedAt: string
  outputs: OpenCutExportManifestOutput[]
}

export function buildOpenCutExportManifest(
  timeline: AppliedTimeline,
  input: BuildOpenCutExportManifestInput
): OpenCutExportManifest {
  const outputsByClip = new Map(input.outputs.map((output) => [output.clipId, output]))
  const videoElements = timeline.elements.filter((element) => element.type === 'video')

  return {
    session_id: timeline.sessionId,
    exported_at: input.exportedAt,
    fingerprint: timeline.fingerprint,
    clips: videoElements.map((video) => ({
      clip_id: video.clipId,
      video_file: outputsByClip.get(video.clipId)?.videoFile ?? '',
    })),
  }
}

export function buildOpenCutExportReport(
  timeline: AppliedTimeline,
  input: BuildOpenCutExportReportInput
): OpenCutExportReport {
  const outputsByClip = new Map(input.outputs.map((output) => [output.clipId, output]))
  const videoElements = timeline.elements.filter((element) => element.type === 'video')
  const clips = videoElements.map((video) => {
    const output = outputsByClip.get(video.clipId)
    const integratedLufs = output?.integratedLufs
    const errors = []
    if (!output?.videoFile) {
      errors.push('video file is missing')
    }
    if (!output?.subtitleEvidenceFile) {
      errors.push('subtitle evidence file is missing')
    }
    if (!Number.isFinite(integratedLufs)) {
      errors.push('integrated LUFS is invalid')
    }
    return {
      clip_id: video.clipId,
      video_file: output?.videoFile ?? '',
      duration_sec: video.durationSec,
      integrated_lufs: Number.isFinite(integratedLufs) ? integratedLufs : 0,
      subtitle_evidence_file: output?.subtitleEvidenceFile ?? '',
      errors,
    }
  })
  return {
    session_id: timeline.sessionId,
    renderer: 'opencut',
    exported_at: input.exportedAt,
    fingerprint: timeline.fingerprint,
    ok: clips.every((clip) => clip.errors.length === 0),
    clips,
  }
}
