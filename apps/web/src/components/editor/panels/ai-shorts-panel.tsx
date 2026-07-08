import { useMemo, useState } from 'react'

import type { AppliedTimeline } from '../../../lib/editor/apply-timeline-spec'
import { applyTimelineSpec } from '../../../lib/editor/apply-timeline-spec'
import type { CandidateClip, TimelineClip } from '../../../lib/editor/types'
import { createSidecarClient, type SidecarClient } from '../../../lib/editor/sidecar-client'
import type { LanguageCode, SidecarProvider, SourceLanguageCode } from '../../../lib/editor/types'
import { NativeSelect, NativeSelectOption } from '../../ui/native-select'
import { CandidateList } from './candidate-list'

type AiShortsPanelProps = {
  sessionId: string
  clips: TimelineClip[]
  client?: Partial<SidecarClient>
  onApplyTimeline?: (timeline: AppliedTimeline) => void
}

const MAX_CLIP_SEC = 30

export function AiShortsPanel({ sessionId, clips, client, onApplyTimeline }: AiShortsPanelProps) {
  const sidecarClient = useMemo(() => client ?? createSidecarClient(), [client])
  const [provider, setProvider] = useState<SidecarProvider>('anthropic')
  const [sourceLanguage, setSourceLanguage] = useState<SourceLanguageCode>('ja')
  const [language, setLanguage] = useState<LanguageCode>('ja')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [candidateCount, setCandidateCount] = useState(0)
  const [successMessage, setSuccessMessage] = useState('')
  const [analyzedClips, setAnalyzedClips] = useState<CandidateClip[] | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  async function analyze() {
    if (!sidecarClient.analyze) {
      setErrorMessage('sidecar analyze 경로가 없습니다')
      setStatus('error')
      return
    }
    setStatus('loading')
    setSuccessMessage('')
    setErrorMessage('')
    try {
      const result = await sidecarClient.analyze(sessionId, {
        provider,
        source_language: sourceLanguage,
        language,
        max_clip_sec: MAX_CLIP_SEC,
        force: true,
      })
      setAnalyzedClips(result.candidates.clips)
      setCandidateCount(result.candidates.clips.length)
      setSuccessMessage(
        `${result.candidates.clips.length} candidate${
          result.candidates.clips.length === 1 ? '' : 's'
        } ready`
      )
      setStatus('success')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'analyze 실패')
      setStatus('error')
    }
  }

  async function applyClip(clipId: string) {
    if (!sidecarClient.getTimelineSpec || !onApplyTimeline) {
      setErrorMessage('timeline 적용 경로가 없습니다')
      setStatus('error')
      return
    }
    try {
      const spec = await sidecarClient.getTimelineSpec(sessionId)
      onApplyTimeline(
        applyTimelineSpec({
          ...spec,
          clips: spec.clips.filter((clip) => clip.clip_id === clipId),
        })
      )
      setCandidateCount(1)
      setSuccessMessage('Applied 1 clip to timeline')
      setStatus('success')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'timeline 적용 실패')
      setStatus('error')
    }
  }

  async function applyAllClips() {
    if (!sidecarClient.getTimelineSpec || !onApplyTimeline) {
      setErrorMessage('timeline 적용 경로가 없습니다')
      setStatus('error')
      return
    }
    try {
      const spec = await sidecarClient.getTimelineSpec(sessionId)
      onApplyTimeline(applyTimelineSpec(spec))
      setCandidateCount(spec.clips.length)
      setSuccessMessage(
        `Applied ${spec.clips.length} clip${spec.clips.length === 1 ? '' : 's'} to timeline`
      )
      setStatus('success')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'timeline 적용 실패')
      setStatus('error')
    }
  }

  const displayClips = analyzedClips ?? clips

  const statusText =
    status === 'loading'
      ? 'Analyzing...'
      : status === 'success'
        ? successMessage || `${candidateCount} candidate${candidateCount === 1 ? '' : 's'} ready`
        : status === 'error'
          ? errorMessage
          : 'Ready'

  return (
    <aside className="min-h-0 overflow-auto bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-tight">AI Shorts</h2>
        <span className="rounded-md border bg-muted/35 px-2 py-1 text-[0.6875rem] font-medium text-muted-foreground">
          Max 30s
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <label className="space-y-1 text-xs text-muted-foreground">
          <span>Provider</span>
          <NativeSelect
            aria-label="Provider"
            value={provider}
            onChange={(event) => setProvider(event.currentTarget.value as SidecarProvider)}
            className="w-full"
          >
            <NativeSelectOption value="anthropic">Anthropic</NativeSelectOption>
            <NativeSelectOption value="openai">OpenAI</NativeSelectOption>
          </NativeSelect>
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          <span>Source</span>
          <NativeSelect
            aria-label="Source Language"
            value={sourceLanguage}
            onChange={(event) =>
              setSourceLanguage(event.currentTarget.value as SourceLanguageCode)
            }
            className="w-full"
          >
            <NativeSelectOption value="ja">Japanese</NativeSelectOption>
            <NativeSelectOption value="ko">Korean</NativeSelectOption>
            <NativeSelectOption value="zh">Chinese</NativeSelectOption>
          </NativeSelect>
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          <span>Captions</span>
          <NativeSelect
            aria-label="Caption Language"
            value={language}
            onChange={(event) => setLanguage(event.currentTarget.value as LanguageCode)}
            className="w-full"
          >
            <NativeSelectOption value="ja">Japanese</NativeSelectOption>
            <NativeSelectOption value="ko">Korean</NativeSelectOption>
          </NativeSelect>
        </label>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={analyze}
          disabled={status === 'loading'}
          className="inline-flex h-8 shrink-0 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm shadow-black/10 transition-colors hover:bg-primary/85 disabled:pointer-events-none disabled:opacity-50"
        >
          Analyze
        </button>
        {sidecarClient.getTimelineSpec && onApplyTimeline && displayClips.length > 1 ? (
          <button
            type="button"
            onClick={applyAllClips}
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-background px-2.5 text-xs font-medium shadow-sm shadow-black/5 transition-colors hover:bg-muted"
          >
            Apply All
          </button>
        ) : null}
        <p
          role={status === 'error' ? 'alert' : 'status'}
          className="truncate text-xs text-muted-foreground"
        >
          {statusText}
        </p>
      </div>
      <CandidateList
        clips={displayClips}
        onApplyClip={sidecarClient.getTimelineSpec && onApplyTimeline ? applyClip : undefined}
      />
    </aside>
  )
}
