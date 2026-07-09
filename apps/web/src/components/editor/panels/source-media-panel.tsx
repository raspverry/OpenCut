import { useEffect, useState } from 'react'

import type { SidecarClient } from '../../../lib/editor/sidecar-client'
import type { Product } from '../../../lib/editor/types'

type SourceMediaPanelProps = {
  sessionId: string
  sourceFile: string
  browserSourceFile?: File | null
  client?: Partial<
    Pick<SidecarClient, 'createSession' | 'ingest' | 'getSessionConfig' | 'updateSessionProducts'>
  >
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
  const [productCatalog, setProductCatalog] = useState('[]')
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

  async function loadProductCatalog() {
    if (!client?.getSessionConfig) {
      setStatus('sidecar session config 경로가 없습니다')
      return
    }
    try {
      const config = await client.getSessionConfig(sessionId)
      setProductCatalog(JSON.stringify(config.products, null, 2))
      setStatus(`상품 ${config.products.length}개 로드`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '상품 카탈로그 로드 실패')
    }
  }

  async function saveProductCatalog() {
    if (!client?.updateSessionProducts) {
      setStatus('sidecar product catalog 경로가 없습니다')
      return
    }
    try {
      const parsed = JSON.parse(productCatalog) as unknown
      if (!Array.isArray(parsed)) {
        setStatus('상품 카탈로그 JSON 배열을 입력하세요')
        return
      }
      const config = await client.updateSessionProducts(sessionId, {
        products: parsed as Product[],
      })
      setProductCatalog(JSON.stringify(config.products, null, 2))
      setStatus(`상품 ${config.products.length}개 저장`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '상품 카탈로그 저장 실패')
    }
  }

  return (
    <aside className="h-full min-h-0 overflow-auto bg-[#10141c] p-3">
      <h2 className="text-xs font-semibold tracking-tight text-slate-200">Source Media</h2>
      <div className="mt-3 space-y-3">
        <label className="block space-y-1 text-xs text-slate-400">
          <span>Session ID</span>
          <input
            aria-label="Session ID"
            className="h-8 w-full rounded-md border border-slate-700 bg-slate-950/80 px-2.5 text-xs text-slate-100 shadow-inner shadow-black/20 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
            value={sessionIdDraft}
            onChange={(event) => setSessionIdDraft(event.currentTarget.value)}
          />
        </label>
        <label className="block space-y-1 text-xs text-slate-400">
          <span>Session slug</span>
          <input
            aria-label="Session slug"
            className="h-8 w-full rounded-md border border-slate-700 bg-slate-950/80 px-2.5 text-xs text-slate-100 shadow-inner shadow-black/20 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
            value={slug}
            onChange={(event) => setSlug(event.currentTarget.value)}
          />
        </label>
        <label className="block space-y-1 text-xs text-slate-400">
          <span>Source path</span>
          <input
            aria-label="Source path"
            className="h-8 w-full rounded-md border border-slate-700 bg-slate-950/80 px-2.5 text-xs text-slate-100 shadow-inner shadow-black/20 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
            value={sourcePath}
            onChange={(event) => setSourcePath(event.currentTarget.value)}
          />
        </label>
        <label className="block space-y-1 text-xs text-slate-400">
          <span>Browser source file</span>
          <input
            aria-label="Browser source file"
            accept="video/mp4,video/quicktime,video/*"
            className="block w-full text-xs text-slate-400 file:mr-2 file:h-7 file:rounded-md file:border-0 file:bg-slate-900 file:px-2.5 file:text-xs file:font-medium file:text-slate-200 hover:file:bg-slate-800"
            type="file"
            onChange={(event) => {
              onBrowserSourceFileChange?.(event.currentTarget.files?.[0] ?? null)
            }}
          />
        </label>
        <label className="block space-y-1 text-xs text-slate-400">
          <span>Product catalog JSON</span>
          <textarea
            aria-label="Product catalog JSON"
            className="min-h-28 w-full resize-y rounded-md border border-slate-700 bg-slate-950/80 px-2.5 py-2 font-mono text-[0.6875rem] leading-4 text-slate-100 shadow-inner shadow-black/20 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
            spellCheck={false}
            value={productCatalog}
            onChange={(event) => setProductCatalog(event.currentTarget.value)}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-md border border-slate-700 bg-slate-900 px-2.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800"
            onClick={loadSession}
          >
            Load Session
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-md border border-slate-700 bg-slate-900 px-2.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800"
            onClick={createSession}
          >
            Create Session
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-md border border-slate-700 bg-slate-900 px-2.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800"
            onClick={ingestSource}
          >
            Ingest
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-md border border-slate-700 bg-slate-900 px-2.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800"
            onClick={loadProductCatalog}
          >
            Load Catalog
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-md border border-slate-700 bg-slate-900 px-2.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800"
            onClick={saveProductCatalog}
          >
            Save Catalog
          </button>
        </div>
      </div>
      <p className="mt-3 break-all rounded-md bg-slate-900 px-2 py-1.5 text-xs text-slate-400">
        {sourceFile}
      </p>
      <p className="mt-2 break-all rounded-md bg-slate-900/70 px-2 py-1.5 text-xs text-slate-500">
        {browserSourceFile ? browserSourceFile.name : 'No browser source file selected'}
      </p>
      <p
        role="status"
        className="mt-2 break-all rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1.5 text-xs text-slate-300"
      >
        {status}
      </p>
    </aside>
  )
}
