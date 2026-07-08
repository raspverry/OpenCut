import type {
  AnalyzeResponse,
  Candidates,
  IngestResponse,
  LanguageCode,
  OpenCutExportArtifact,
  OpenCutExportManifest,
  OpenCutExportManifestDraft,
  OpenCutExportManifestDraftRequest,
  OpenCutExportQaResponse,
  OpenCutExportReport,
  SessionResponse,
  SidecarProvider,
  SourceLanguageCode,
  TimelineSpec,
} from './types'

const DEFAULT_BASE_URL = 'http://127.0.0.1:8789'

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

export type SidecarClient = ReturnType<typeof createSidecarClient>

export type CreateSessionRequest = {
  slug: string
}

export type IngestRequest = {
  input_path: string
  force?: boolean
}

export type AnalyzeRequest = {
  provider?: SidecarProvider
  source_language?: SourceLanguageCode
  language?: LanguageCode
  max_clip_sec?: number
  max_clips?: number
  force?: boolean
}

export class SidecarError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'SidecarError'
    this.status = status
  }
}

export function createSidecarClient(options: { baseUrl?: string; fetcher?: Fetcher } = {}) {
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL)
  const fetcher = options.fetcher ?? globalThis.fetch?.bind(globalThis)
  if (!fetcher) {
    throw new SidecarError('sidecar API를 호출할 fetch가 없습니다', 0)
  }

  return {
    createSession(payload: CreateSessionRequest) {
      return requestJson<SessionResponse>(fetcher, `${baseUrl}/api/sessions`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    ingest(sessionId: string, payload: IngestRequest) {
      return requestJson<IngestResponse>(
        fetcher,
        `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/ingest`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      )
    },
    analyze(sessionId: string, payload: AnalyzeRequest) {
      return requestJson<AnalyzeResponse>(
        fetcher,
        `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/analyze`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      )
    },
    getCandidates(sessionId: string) {
      return requestJson<Candidates>(
        fetcher,
        `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/candidates`
      )
    },
    getTimelineSpec(sessionId: string) {
      return requestJson<TimelineSpec>(
        fetcher,
        `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/timeline-spec`
      )
    },
    verifyOpenCutExport(sessionId: string, report: OpenCutExportReport) {
      return requestJson<OpenCutExportQaResponse>(
        fetcher,
        `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/qa/opencut-export`,
        {
          method: 'POST',
          body: JSON.stringify(report),
        }
      )
    },
    verifyOpenCutExportManifest(sessionId: string, manifest: OpenCutExportManifest) {
      return requestJson<OpenCutExportQaResponse>(
        fetcher,
        `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/qa/opencut-export/manifest`,
        {
          method: 'POST',
          body: JSON.stringify(manifest),
        }
      )
    },
    draftOpenCutExportManifest(
      sessionId: string,
      payload: OpenCutExportManifestDraftRequest
    ) {
      return requestJson<OpenCutExportManifestDraft>(
        fetcher,
        `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/qa/opencut-export/manifest/draft`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      )
    },
    uploadOpenCutExportArtifact(sessionId: string, clipId: string, buffer: ArrayBuffer) {
      return requestJson<OpenCutExportArtifact>(
        fetcher,
        `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/qa/opencut-export/artifacts/${encodeURIComponent(clipId)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'video/mp4' },
          body: buffer,
        }
      )
    },
  }
}

async function requestJson<T>(fetcher: Fetcher, url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetcher(url, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...init.headers,
    },
  })
  const text = await response.text()
  const data = parseJson(text)
  if (!response.ok) {
    throw new SidecarError(errorMessage(data, response.status), response.status)
  }
  return data as T
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, '')
}

function parseJson(text: string): unknown {
  if (!text) {
    return null
  }
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function errorMessage(data: unknown, status: number) {
  if (data && typeof data === 'object' && 'detail' in data && typeof data.detail === 'string') {
    return data.detail
  }
  return `sidecar API 요청 실패 (${status})`
}
