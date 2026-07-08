import { describe, expect, it } from 'vitest'

import { createSidecarClient, SidecarError } from './sidecar-client'

describe('createSidecarClient', () => {
  it('uses the default local sidecar base URL for session creation', async () => {
    const calls: Array<[string, RequestInit | undefined]> = []
    const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
      calls.push([String(input), init])
      return jsonResponse({ session_id: '20260708-sale', path: '/tmp/session' }, 201)
    }
    const client = createSidecarClient({ fetcher })

    const response = await client.createSession({ slug: 'sale' })

    expect(response.session_id).toBe('20260708-sale')
    expect(calls[0][0]).toBe('http://127.0.0.1:8789/api/sessions')
    expect(calls[0][1]?.method).toBe('POST')
    expect(calls[0][1]?.body).toBe(JSON.stringify({ slug: 'sale' }))
  })

  it('posts analyze options and parses candidate output', async () => {
    const calls: Array<[string, RequestInit | undefined]> = []
    const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
      calls.push([String(input), init])
      return jsonResponse({
        session_id: '20260708-sale',
        provider: 'openai',
        source_language: 'zh',
        language: 'ja',
        max_clip_sec: 30,
        candidates: {
          session_id: '20260708-sale',
          llm_model: 'gpt-4.1',
          generated_at: '2026-07-08T11:00:00+09:00',
          clips: [
            {
              clip_id: 'p01-c01',
              product_id: 'p01',
              start_sec: 10,
              end_sec: 28,
              segment_range: [0, 2],
              score: 91,
              reason: '価格と実演が近い',
              hook_text: 'このツヤ見て',
              caption: '新作セラムをチェック',
              hashtags: ['コスメ'],
            },
          ],
        },
      })
    }
    const client = createSidecarClient({ baseUrl: 'http://localhost:9000/', fetcher })

    const response = await client.analyze('20260708-sale', {
      provider: 'openai',
      source_language: 'zh',
      language: 'ja',
      max_clip_sec: 30,
      max_clips: 3,
      force: true,
    })

    expect(response.candidates.clips[0].clip_id).toBe('p01-c01')
    expect(calls[0][0]).toBe('http://localhost:9000/api/sessions/20260708-sale/analyze')
    expect(calls[0][1]?.body).toBe(
      JSON.stringify({
        provider: 'openai',
        source_language: 'zh',
        language: 'ja',
        max_clip_sec: 30,
        max_clips: 3,
        force: true,
      })
    )
  })

  it('loads candidates, timeline specs, and caption cues', async () => {
    const calls: string[] = []
    const fetcher = async (input: string | URL | Request) => {
      const url = String(input)
      calls.push(url)
      if (url.endsWith('/candidates')) {
        return jsonResponse({
          session_id: '20260708-sale',
          llm_model: 'gpt',
          generated_at: 'now',
          clips: [],
        })
      }
      if (url.endsWith('/caption-cues/p01-c01')) {
        return jsonResponse(captionCueFile())
      }
      return jsonResponse({
        session_id: '20260708-sale',
        renderer: 'opencut',
        language: 'ja',
        source_video: { file: 'raw/recording.mp4', duration_sec: 72.5 },
        fingerprint: 'sha256:1111111111111111111111111111111111111111111111111111111111111111',
        clips: [],
      })
    }
    const client = createSidecarClient({ fetcher })

    const candidates = await client.getCandidates('20260708-sale')
    const timelineSpec = await client.getTimelineSpec('20260708-sale')
    const captionCues = await client.getCaptionCues('20260708-sale', 'p01-c01')

    expect(candidates.session_id).toBe('20260708-sale')
    expect(timelineSpec.renderer).toBe('opencut')
    expect(captionCues.clip_id).toBe('p01-c01')
    expect(calls).toEqual([
      'http://127.0.0.1:8789/api/sessions/20260708-sale/candidates',
      'http://127.0.0.1:8789/api/sessions/20260708-sale/timeline-spec',
      'http://127.0.0.1:8789/api/sessions/20260708-sale/caption-cues/p01-c01',
    ])
  })

  it('posts OpenCut export reports for QA', async () => {
    const calls: Array<[string, RequestInit | undefined]> = []
    const report = {
      session_id: '20260708-sale',
      renderer: 'opencut' as const,
      exported_at: '2026-07-08T12:05:00+09:00',
      fingerprint: 'sha256:1111111111111111111111111111111111111111111111111111111111111111',
      ok: true,
      clips: [
        {
          clip_id: 'p01-c01',
          video_file: 'final/p01-c01.mp4',
          duration_sec: 18,
          integrated_lufs: -14.2,
          subtitle_evidence_file: 'qa/opencut-subtitles/p01-c01.jpg',
          errors: [],
        },
      ],
    }
    const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
      calls.push([String(input), init])
      return jsonResponse({
        session_id: '20260708-sale',
        clip_count: 1,
        total_duration_sec: 18,
        by_product: { p01: 1 },
      })
    }
    const client = createSidecarClient({ fetcher })

    const response = await client.verifyOpenCutExport('20260708-sale', report)

    expect(response.clip_count).toBe(1)
    expect(calls[0][0]).toBe(
      'http://127.0.0.1:8789/api/sessions/20260708-sale/qa/opencut-export'
    )
    expect(calls[0][1]?.method).toBe('POST')
    expect(calls[0][1]?.body).toBe(JSON.stringify(report))
  })

  it('posts OpenCut export manifests for probed QA', async () => {
    const calls: Array<[string, RequestInit | undefined]> = []
    const manifest = {
      session_id: '20260708-sale',
      exported_at: '2026-07-08T12:05:00+09:00',
      fingerprint: 'sha256:1111111111111111111111111111111111111111111111111111111111111111',
      clips: [{ clip_id: 'p01-c01', video_file: 'final/p01-c01.mp4' }],
    }
    const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
      calls.push([String(input), init])
      return jsonResponse({
        session_id: '20260708-sale',
        clip_count: 1,
        total_duration_sec: 18,
        by_product: { p01: 1 },
      })
    }
    const client = createSidecarClient({ fetcher })

    const response = await client.verifyOpenCutExportManifest('20260708-sale', manifest)

    expect(response.clip_count).toBe(1)
    expect(calls[0][0]).toBe(
      'http://127.0.0.1:8789/api/sessions/20260708-sale/qa/opencut-export/manifest'
    )
    expect(calls[0][1]?.method).toBe('POST')
    expect(calls[0][1]?.body).toBe(JSON.stringify(manifest))
  })

  it('requests OpenCut export manifest drafts for applied clips', async () => {
    const calls: Array<[string, RequestInit | undefined]> = []
    const request = {
      clip_ids: ['p01-c01'],
    }
    const draft = {
      manifest: {
        session_id: '20260708-sale',
        exported_at: '2026-07-08T12:05:00+09:00',
        fingerprint: 'sha256:1111111111111111111111111111111111111111111111111111111111111111',
        clips: [{ clip_id: 'p01-c01', video_file: 'final/p01-c01.mp4' }],
      },
      missing_files: [],
    }
    const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
      calls.push([String(input), init])
      return jsonResponse(draft)
    }
    const client = createSidecarClient({ fetcher })

    const response = await client.draftOpenCutExportManifest('20260708-sale', request)

    expect(response).toEqual(draft)
    expect(calls[0][0]).toBe(
      'http://127.0.0.1:8789/api/sessions/20260708-sale/qa/opencut-export/manifest/draft'
    )
    expect(calls[0][1]?.method).toBe('POST')
    expect(calls[0][1]?.body).toBe(JSON.stringify(request))
  })

  it('uploads OpenCut export artifacts as browser buffers', async () => {
    const calls: Array<[string, RequestInit | undefined]> = []
    const artifact = {
      session_id: '20260708-sale',
      clip_id: 'p01-c01',
      video_file: 'final/p01-c01.mp4',
      byte_size: 3,
    }
    const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
      calls.push([String(input), init])
      return jsonResponse(artifact, 201)
    }
    const client = createSidecarClient({ fetcher })
    const buffer = new Uint8Array([1, 2, 3]).buffer

    const response = await client.uploadOpenCutExportArtifact(
      '20260708-sale',
      'p01-c01',
      buffer
    )

    expect(response).toEqual(artifact)
    expect(calls[0][0]).toBe(
      'http://127.0.0.1:8789/api/sessions/20260708-sale/qa/opencut-export/artifacts/p01-c01'
    )
    expect(calls[0][1]?.method).toBe('POST')
    expect(calls[0][1]?.headers).toEqual({ 'content-type': 'video/mp4' })
    expect(calls[0][1]?.body).toBe(buffer)
  })

  it('throws Korean sidecar error detail when the API fails', async () => {
    const fetcher = async () => jsonResponse({ detail: '하이라이트 후보 파일이 없습니다' }, 404)
    const client = createSidecarClient({ fetcher })

    await expect(client.getCandidates('20260708-sale')).rejects.toMatchObject({
      name: 'SidecarError',
      message: '하이라이트 후보 파일이 없습니다',
      status: 404,
    } satisfies Partial<SidecarError>)
  })
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function captionCueFile() {
  return {
    clip_id: 'p01-c01',
    language: 'ja',
    preset: 'ja-shorts-safe-v1',
    source_range_sec: [10, 28],
    cues: [
      {
        cue_id: 'p01-c01-q001',
        source_segment_id: 0,
        start_sec: 10,
        end_sec: 12,
        text: 'このツヤ見て',
        words: [],
      },
    ],
    style: {
      format: 'word_pop',
      font_family: 'Noto Sans CJK JP',
      max_chars_per_line: 13,
      max_lines: 2,
      safe_area: { anchor: 'bottom', margin_px: 640 },
    },
  }
}
