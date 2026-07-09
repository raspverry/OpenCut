import { useEffect, useState } from 'react'
import { Database, FolderOpen, Plus, RefreshCcw, UploadCloud } from 'lucide-react'

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
    <aside className="flex h-full min-h-0 flex-col bg-[#0f141b]">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-[#252a34] px-3">
        <h2 className="text-xs font-semibold tracking-tight text-slate-200">Media Bin</h2>
        <span className="text-[0.625rem] font-medium uppercase tracking-[0.1em] text-slate-500">
          Source
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="border-b border-[#252a34] p-2">
          <div className="flex items-start gap-2 rounded-[5px] border border-blue-400/25 bg-blue-400/10 p-2.5">
            <FolderOpen className="mt-0.5 size-4 shrink-0 text-blue-300" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-100">
                {browserSourceFile?.name ?? sourceFile}
              </p>
              <p className="mt-0.5 text-[0.625rem] font-medium uppercase tracking-[0.08em] text-slate-500">
                Primary video
              </p>
            </div>
          </div>
          <label className="mt-2 block text-xs text-slate-400">
            <span className="sr-only">Browser source file</span>
            <input
              aria-label="Browser source file"
              accept="video/mp4,video/quicktime,video/*"
              className="block w-full text-xs text-slate-400 file:mr-2 file:h-7 file:rounded-[4px] file:border-0 file:bg-[#1a202b] file:px-2.5 file:text-xs file:font-medium file:text-slate-200 hover:file:bg-[#222b38]"
              type="file"
              onChange={(event) => {
                onBrowserSourceFileChange?.(event.currentTarget.files?.[0] ?? null)
              }}
            />
          </label>
        </div>

        <details className="group border-b border-[#252a34]" open>
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-slate-500 transition-colors hover:text-slate-300">
            Session
            <span className="text-slate-600 transition-transform group-open:rotate-90">&rsaquo;</span>
          </summary>
          <div className="space-y-2 px-3 pb-3">
            <label className="block space-y-1 text-xs text-slate-400">
              <span>Session ID</span>
              <input
                aria-label="Session ID"
                className={inputClassName}
                value={sessionIdDraft}
                onChange={(event) => setSessionIdDraft(event.currentTarget.value)}
              />
            </label>
            <label className="block space-y-1 text-xs text-slate-400">
              <span>Session slug</span>
              <input
                aria-label="Session slug"
                className={inputClassName}
                value={slug}
                onChange={(event) => setSlug(event.currentTarget.value)}
              />
            </label>
            <label className="block space-y-1 text-xs text-slate-400">
              <span>Source path</span>
              <input
                aria-label="Source path"
                className={inputClassName}
                value={sourcePath}
                onChange={(event) => setSourcePath(event.currentTarget.value)}
              />
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                aria-label="Load Session"
                className={buttonClassName}
                onClick={loadSession}
              >
                <RefreshCcw className="size-3.5" aria-hidden="true" />
                Load
              </button>
              <button
                type="button"
                aria-label="Create Session"
                className={buttonClassName}
                onClick={createSession}
              >
                <Plus className="size-3.5" aria-hidden="true" />
                New
              </button>
              <button
                type="button"
                aria-label="Ingest"
                className={buttonClassName}
                onClick={ingestSource}
              >
                <UploadCloud className="size-3.5" aria-hidden="true" />
                Ingest
              </button>
            </div>
          </div>
        </details>

        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-slate-500 transition-colors hover:text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <Database className="size-3.5" aria-hidden="true" />
              Products
            </span>
            <span className="text-slate-600 transition-transform group-open:rotate-90">&rsaquo;</span>
          </summary>
          <div className="space-y-2 px-3 pb-3">
            <label className="block space-y-1 text-xs text-slate-400">
              <span>Product catalog JSON</span>
              <textarea
                aria-label="Product catalog JSON"
                className="min-h-28 w-full resize-y rounded-[4px] border border-[#2b3442] bg-[#080b10] px-2.5 py-2 font-mono text-[0.6875rem] leading-4 text-slate-100 shadow-inner shadow-black/20 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                spellCheck={false}
                value={productCatalog}
                onChange={(event) => setProductCatalog(event.currentTarget.value)}
              />
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button type="button" className={buttonClassName} onClick={loadProductCatalog}>
                Load Catalog
              </button>
              <button type="button" className={buttonClassName} onClick={saveProductCatalog}>
                Save Catalog
              </button>
            </div>
          </div>
        </details>
      </div>
      <p
        role="status"
        className="shrink-0 break-all border-t border-[#252a34] bg-[#0b0d12] px-3 py-2 text-xs text-slate-400"
      >
        {status}
      </p>
    </aside>
  )
}

const inputClassName =
  'h-8 w-full rounded-[4px] border border-[#2b3442] bg-[#080b10] px-2.5 text-xs text-slate-100 shadow-inner shadow-black/20 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20'

const buttonClassName =
  'inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-[4px] border border-[#2b3442] bg-[#151b24] px-2 text-xs font-medium text-slate-200 transition-colors hover:bg-[#1d2632] focus:outline-none focus:ring-2 focus:ring-blue-400/20'
