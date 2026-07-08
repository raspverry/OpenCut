import { useState } from 'react'

import type { SidecarClient } from '../../../lib/editor/sidecar-client'

type SourceMediaPanelProps = {
  sessionId: string
  sourceFile: string
  client?: Partial<Pick<SidecarClient, 'createSession' | 'ingest'>>
  onSessionIdChange?: (sessionId: string) => void
  onSourceFileChange?: (sourceFile: string) => void
}

export function SourceMediaPanel({
  sessionId,
  sourceFile,
  client,
  onSessionIdChange,
  onSourceFileChange,
}: SourceMediaPanelProps) {
  const [slug, setSlug] = useState('live-sale')
  const [sourcePath, setSourcePath] = useState(sourceFile)
  const [status, setStatus] = useState(sessionId)

  async function createSession() {
    if (!client?.createSession) {
      setStatus('sidecar session 경로가 없습니다')
      return
    }
    try {
      const result = await client.createSession({ slug })
      setStatus(result.session_id)
      onSessionIdChange?.(result.session_id)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '세션 생성 실패')
    }
  }

  async function ingestSource() {
    if (!client?.ingest) {
      setStatus('sidecar ingest 경로가 없습니다')
      return
    }
    try {
      const result = await client.ingest(sessionId, {
        input_path: sourcePath,
        force: true,
      })
      const probe = result.probe
      setStatus(`${probe.orientation} ${probe.duration_sec.toFixed(1)}s`)
      onSourceFileChange?.(sourcePath)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'ingest 실패')
    }
  }

  return (
    <aside className="bg-background p-4">
      <h2 className="text-sm font-medium">Source Media</h2>
      <div className="mt-4 space-y-3">
        <label className="block space-y-1 text-xs text-muted-foreground">
          <span>Session slug</span>
          <input
            aria-label="Session slug"
            className="h-7 w-full rounded-md border bg-background px-2 text-xs text-foreground"
            value={slug}
            onChange={(event) => setSlug(event.currentTarget.value)}
          />
        </label>
        <label className="block space-y-1 text-xs text-muted-foreground">
          <span>Source path</span>
          <input
            aria-label="Source path"
            className="h-7 w-full rounded-md border bg-background px-2 text-xs text-foreground"
            value={sourcePath}
            onChange={(event) => setSourcePath(event.currentTarget.value)}
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            className="inline-flex h-7 items-center rounded-md border px-2 text-xs hover:bg-muted"
            onClick={createSession}
          >
            Create Session
          </button>
          <button
            type="button"
            className="inline-flex h-7 items-center rounded-md border px-2 text-xs hover:bg-muted"
            onClick={ingestSource}
          >
            Ingest
          </button>
        </div>
      </div>
      <p className="mt-3 break-all text-xs text-muted-foreground">{sourceFile}</p>
      <p role="status" className="mt-2 break-all text-xs">
        {status}
      </p>
    </aside>
  )
}
