import { useEffect, useState } from 'react'

import type { SidecarClient } from '../../../lib/editor/sidecar-client'

type SourceMediaPanelProps = {
  sessionId: string
  sourceFile: string
  browserSourceFile?: File | null
  client?: Partial<Pick<SidecarClient, 'createSession' | 'ingest'>>
  onSessionIdChange?: (sessionId: string) => void
  onSourceFileChange?: (sourceFile: string) => void
  onBrowserSourceFileChange?: (file: File | null) => void
}

export function SourceMediaPanel({
  sessionId,
  sourceFile,
  browserSourceFile,
  client,
  onSessionIdChange,
  onSourceFileChange,
  onBrowserSourceFileChange,
}: SourceMediaPanelProps) {
  const [slug, setSlug] = useState('live-sale')
  const [sessionIdDraft, setSessionIdDraft] = useState(sessionId)
  const [sourcePath, setSourcePath] = useState(sourceFile)
  const [status, setStatus] = useState(sessionId)

  useEffect(() => {
    setSessionIdDraft(sessionId)
  }, [sessionId])

  function loadSession() {
    const nextSessionId = sessionIdDraft.trim()
    if (!nextSessionId) {
      setStatus('session id를 입력하세요')
      return
    }
    setStatus(nextSessionId)
    onSessionIdChange?.(nextSessionId)
  }

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
    <aside className="bg-card p-4">
      <h2 className="text-sm font-semibold tracking-tight">Source Media</h2>
      <div className="mt-4 space-y-3">
        <label className="block space-y-1 text-xs text-muted-foreground">
          <span>Session ID</span>
          <input
            aria-label="Session ID"
            className="h-8 w-full rounded-md border bg-background px-2.5 text-xs text-foreground shadow-inner shadow-black/5 outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25"
            value={sessionIdDraft}
            onChange={(event) => setSessionIdDraft(event.currentTarget.value)}
          />
        </label>
        <label className="block space-y-1 text-xs text-muted-foreground">
          <span>Session slug</span>
          <input
            aria-label="Session slug"
            className="h-8 w-full rounded-md border bg-background px-2.5 text-xs text-foreground shadow-inner shadow-black/5 outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25"
            value={slug}
            onChange={(event) => setSlug(event.currentTarget.value)}
          />
        </label>
        <label className="block space-y-1 text-xs text-muted-foreground">
          <span>Source path</span>
          <input
            aria-label="Source path"
            className="h-8 w-full rounded-md border bg-background px-2.5 text-xs text-foreground shadow-inner shadow-black/5 outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25"
            value={sourcePath}
            onChange={(event) => setSourcePath(event.currentTarget.value)}
          />
        </label>
        <label className="block space-y-1 text-xs text-muted-foreground">
          <span>Browser source file</span>
          <input
            aria-label="Browser source file"
            accept="video/mp4,video/quicktime,video/*"
            className="block w-full text-xs text-muted-foreground file:mr-2 file:h-7 file:rounded-md file:border-0 file:bg-background file:px-2.5 file:text-xs file:font-medium file:text-foreground hover:file:bg-muted"
            type="file"
            onChange={(event) => {
              onBrowserSourceFileChange?.(event.currentTarget.files?.[0] ?? null)
            }}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-md border bg-background px-2.5 text-xs font-medium shadow-sm shadow-black/5 transition-colors hover:bg-muted"
            onClick={loadSession}
          >
            Load Session
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-md border bg-background px-2.5 text-xs font-medium shadow-sm shadow-black/5 transition-colors hover:bg-muted"
            onClick={createSession}
          >
            Create Session
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-md border bg-background px-2.5 text-xs font-medium shadow-sm shadow-black/5 transition-colors hover:bg-muted"
            onClick={ingestSource}
          >
            Ingest
          </button>
        </div>
      </div>
      <p className="mt-3 break-all rounded-md bg-muted/35 px-2 py-1.5 text-xs text-muted-foreground">
        {sourceFile}
      </p>
      <p className="mt-2 break-all rounded-md bg-muted/25 px-2 py-1.5 text-xs text-muted-foreground">
        {browserSourceFile ? browserSourceFile.name : 'No browser source file selected'}
      </p>
      <p role="status" className="mt-2 break-all rounded-md border bg-background px-2 py-1.5 text-xs">
        {status}
      </p>
    </aside>
  )
}
