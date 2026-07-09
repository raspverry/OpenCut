import type { AppliedTimeline, TimelineElement } from './apply-timeline-spec'
import type { CaptionCueFile } from './types'

type RenderClipExportInput = {
  clipId: string
  timeline: AppliedTimeline
}

type BrowserClipRendererOptions = {
  sourceFile: File
  loadCaptionCues: (clipId: string) => Promise<CaptionCueFile>
}

const CANVAS_WIDTH = 1080
const CANVAS_HEIGHT = 1920
const FPS = 30
const MIME_TYPES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
]

export function createBrowserClipRenderer({
  sourceFile,
  loadCaptionCues,
}: BrowserClipRendererOptions) {
  return {
    async renderClipExport({ clipId, timeline }: RenderClipExportInput) {
      const videoElement = timeline.elements.find(
        (element): element is Extract<TimelineElement, { type: 'video' }> =>
          element.type === 'video' && element.clipId === clipId
      )
      if (!videoElement) {
        throw new Error(`timeline에 video clip이 없습니다: ${clipId}`)
      }

      const hookElement = timeline.elements.find(
        (element): element is Extract<TimelineElement, { type: 'hook_text' }> =>
          element.type === 'hook_text' && element.clipId === clipId
      )
      const ctaElement = timeline.elements.find(
        (element): element is Extract<TimelineElement, { type: 'cta_text' }> =>
          element.type === 'cta_text' && element.clipId === clipId
      )

      const captionFile = await loadCaptionCues(clipId)
      return renderCanvasMp4({
        sourceFile,
        sourceStartSec: videoElement.sourceStartSec,
        durationSec: videoElement.durationSec,
        hookText: hookElement?.text ?? '',
        hookDurationSec: hookElement?.durationSec ?? 0,
        ctaText: ctaElement?.text ?? '',
        ctaStartSec: ctaElement
          ? Math.max(ctaElement.timelineStartSec - videoElement.timelineStartSec, 0)
          : Number.POSITIVE_INFINITY,
        captionFile,
      })
    },
  }
}

export function selectMediaRecorderMimeType(): string {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('이 브라우저는 MediaRecorder를 지원하지 않습니다')
  }
  const mimeType = MIME_TYPES.find((candidate) => MediaRecorder.isTypeSupported(candidate))
  if (!mimeType) {
    throw new Error('이 브라우저는 MediaRecorder video export를 지원하지 않습니다')
  }
  return mimeType
}

async function renderCanvasMp4({
  sourceFile,
  sourceStartSec,
  durationSec,
  hookText,
  hookDurationSec,
  ctaText,
  ctaStartSec,
  captionFile,
}: {
  sourceFile: File
  sourceStartSec: number
  durationSec: number
  hookText: string
  hookDurationSec: number
  ctaText: string
  ctaStartSec: number
  captionFile: CaptionCueFile
}): Promise<ArrayBuffer> {
  const mimeType = selectMediaRecorderMimeType()
  const sourceUrl = URL.createObjectURL(sourceFile)
  const video = document.createElement('video')
  video.src = sourceUrl
  video.preload = 'auto'
  video.playsInline = true
  video.muted = false

  try {
    await waitForVideoMetadata(video)
    await seekVideo(video, sourceStartSec)

    const canvas = document.createElement('canvas')
    canvas.width = CANVAS_WIDTH
    canvas.height = CANVAS_HEIGHT
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('canvas renderer를 초기화할 수 없습니다')
    }

    const videoStream = captureVideoStream(video)
    const audioTracks = videoStream.getAudioTracks()
    if (audioTracks.length === 0) {
      throw new Error('source video audio track이 없습니다')
    }
    const canvasStream = canvas.captureStream(FPS)
    const exportStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioTracks,
    ])
    try {
      const recorder = new MediaRecorder(exportStream, {
        mimeType,
        videoBitsPerSecond: 8_000_000,
        audioBitsPerSecond: 128_000,
      })
      const chunks: Blob[] = []
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      })
      const stopped = new Promise<void>((resolve, reject) => {
        recorder.addEventListener('stop', () => resolve(), { once: true })
        recorder.addEventListener(
          'error',
          () => reject(new Error('OpenCut browser export 실패')),
          { once: true }
        )
      })

      recorder.start(1000)
      await video.play()
      await drawUntilDone({
        video,
        context,
        sourceStartSec,
        durationSec,
        hookText,
        hookDurationSec,
        ctaText,
        ctaStartSec,
        captionFile,
      })
      video.pause()
      recorder.stop()
      await stopped

      const blob = new Blob(chunks, { type: mimeType })
      if (blob.size === 0) {
        throw new Error('OpenCut browser export가 빈 파일을 만들었습니다')
      }
      return blob.arrayBuffer()
    } finally {
      exportStream.getTracks().forEach((track) => track.stop())
      canvasStream.getTracks().forEach((track) => track.stop())
    }
  } finally {
    video.pause()
    URL.revokeObjectURL(sourceUrl)
  }
}

function captureVideoStream(video: HTMLVideoElement): MediaStream {
  const maybeCaptureStream = video as HTMLVideoElement & {
    captureStream?: () => MediaStream
  }
  if (typeof maybeCaptureStream.captureStream === 'function') {
    return maybeCaptureStream.captureStream()
  }
  throw new Error('이 브라우저는 video captureStream을 지원하지 않습니다')
}

async function drawUntilDone({
  video,
  context,
  sourceStartSec,
  durationSec,
  hookText,
  hookDurationSec,
  ctaText,
  ctaStartSec,
  captionFile,
}: {
  video: HTMLVideoElement
  context: CanvasRenderingContext2D
  sourceStartSec: number
  durationSec: number
  hookText: string
  hookDurationSec: number
  ctaText: string
  ctaStartSec: number
  captionFile: CaptionCueFile
}) {
  const timeoutMs = durationSec * 1500 + 10_000
  const deadline = performance.now() + timeoutMs

  return new Promise<void>((resolve, reject) => {
    function draw() {
      const sourceTime = video.currentTime
      const clipTime = sourceTime - sourceStartSec
      drawFrame({
        context,
        video,
        sourceTime,
        clipTime,
        hookText,
        hookDurationSec,
        ctaText,
        ctaStartSec,
        captionFile,
      })
      if (clipTime >= durationSec || video.ended) {
        resolve()
        return
      }
      if (performance.now() > deadline) {
        reject(new Error('OpenCut browser export 시간이 초과되었습니다'))
        return
      }
      requestAnimationFrame(draw)
    }
    requestAnimationFrame(draw)
  })
}

function drawFrame({
  context,
  video,
  sourceTime,
  clipTime,
  hookText,
  hookDurationSec,
  ctaText,
  ctaStartSec,
  captionFile,
}: {
  context: CanvasRenderingContext2D
  video: HTMLVideoElement
  sourceTime: number
  clipTime: number
  hookText: string
  hookDurationSec: number
  ctaText: string
  ctaStartSec: number
  captionFile: CaptionCueFile
}) {
  context.fillStyle = '#020617'
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  drawCoverVideo(context, video)

  if (hookText && clipTime <= hookDurationSec) {
    drawPillText(context, hookText, CANVAS_HEIGHT * 0.16, 58)
  }
  if (ctaText && clipTime >= ctaStartSec) {
    drawPillText(context, ctaText, CANVAS_HEIGHT * 0.84, 52)
  }

  const captionText = activeCaptionText(captionFile, sourceTime)
  if (captionText) {
    const marginPx = captionFile.style.safe_area.margin_px
    const y =
      captionFile.style.safe_area.anchor === 'top'
        ? marginPx
        : captionFile.style.safe_area.anchor === 'center'
          ? CANVAS_HEIGHT / 2
          : CANVAS_HEIGHT - marginPx
    drawOutlinedText(context, captionText, y, {
      fontSize: 64,
      maxCharsPerLine: captionFile.style.max_chars_per_line,
      maxLines: captionFile.style.max_lines,
    })
  }
}

function drawCoverVideo(context: CanvasRenderingContext2D, video: HTMLVideoElement) {
  const scale = Math.max(CANVAS_WIDTH / video.videoWidth, CANVAS_HEIGHT / video.videoHeight)
  const drawWidth = video.videoWidth * scale
  const drawHeight = video.videoHeight * scale
  context.drawImage(
    video,
    (CANVAS_WIDTH - drawWidth) / 2,
    (CANVAS_HEIGHT - drawHeight) / 2,
    drawWidth,
    drawHeight
  )
}

export function activeCaptionText(captionFile: CaptionCueFile, sourceTime: number): string {
  return (
    captionFile.cues.find((cue) => sourceTime >= cue.start_sec && sourceTime < cue.end_sec)
      ?.text ?? ''
  )
}

function drawPillText(
  context: CanvasRenderingContext2D,
  text: string,
  centerY: number,
  fontSize: number
) {
  context.save()
  context.font = `700 ${fontSize}px Inter, "Noto Sans CJK JP", sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  const metrics = context.measureText(text)
  const boxWidth = Math.min(metrics.width + 72, CANVAS_WIDTH - 120)
  const boxHeight = fontSize + 34
  const x = (CANVAS_WIDTH - boxWidth) / 2
  const y = centerY - boxHeight / 2
  context.fillStyle = 'rgba(2, 6, 23, 0.72)'
  roundedRect(context, x, y, boxWidth, boxHeight, 18)
  context.fill()
  context.fillStyle = '#ffffff'
  context.fillText(text, CANVAS_WIDTH / 2, centerY, CANVAS_WIDTH - 180)
  context.restore()
}

function drawOutlinedText(
  context: CanvasRenderingContext2D,
  text: string,
  baselineY: number,
  options: { fontSize: number; maxCharsPerLine: number; maxLines: number }
) {
  const lines = splitCaptionLines(text, options.maxCharsPerLine).slice(0, options.maxLines)
  const lineHeight = options.fontSize * 1.18
  const totalHeight = lineHeight * lines.length
  const startY = baselineY - totalHeight / 2 + lineHeight / 2
  context.save()
  context.font = `800 ${options.fontSize}px Inter, "Noto Sans CJK JP", sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.lineJoin = 'round'
  context.strokeStyle = '#000000'
  context.lineWidth = 12
  context.fillStyle = '#ffffff'
  lines.forEach((line, index) => {
    const y = startY + index * lineHeight
    context.strokeText(line, CANVAS_WIDTH / 2, y, CANVAS_WIDTH - 120)
    context.fillText(line, CANVAS_WIDTH / 2, y, CANVAS_WIDTH - 120)
  })
  context.restore()
}

export function splitCaptionLines(text: string, maxCharsPerLine: number): string[] {
  const normalized = text.trim()
  if (!normalized) {
    return []
  }
  const lineLength = Math.max(Math.floor(maxCharsPerLine), 1)
  const lines: string[] = []
  for (let index = 0; index < normalized.length; index += lineLength) {
    lines.push(normalized.slice(index, index + lineLength))
  }
  return lines
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  context.beginPath()
  context.moveTo(x + radius, y)
  context.lineTo(x + width - radius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + radius)
  context.lineTo(x + width, y + height - radius)
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  context.lineTo(x + radius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - radius)
  context.lineTo(x, y + radius)
  context.quadraticCurveTo(x, y, x + radius, y)
  context.closePath()
}

async function waitForVideoMetadata(video: HTMLVideoElement) {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
    return
  }
  await new Promise<void>((resolve, reject) => {
    video.addEventListener('loadedmetadata', () => resolve(), { once: true })
    video.addEventListener('error', () => reject(new Error('source video를 읽을 수 없습니다')), {
      once: true,
    })
  })
}

async function seekVideo(video: HTMLVideoElement, timeSec: number) {
  if (
    Math.abs(video.currentTime - timeSec) < 0.01 &&
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
  ) {
    return
  }
  await new Promise<void>((resolve, reject) => {
    video.addEventListener('seeked', () => resolve(), { once: true })
    video.addEventListener('error', () => reject(new Error('source video seek 실패')), {
      once: true,
    })
    video.currentTime = timeSec
  })
}
