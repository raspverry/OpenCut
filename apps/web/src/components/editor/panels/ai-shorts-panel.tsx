import { useMemo, useState } from 'react'
import { ListPlus, Scissors, Sparkles } from 'lucide-react'

import type { AppliedTimeline } from '../../../lib/editor/apply-timeline-spec'
import { applyTimelineSpec } from '../../../lib/editor/apply-timeline-spec'
import type { CandidateClip, CaptionCueFile, TimelineClip } from '../../../lib/editor/types'
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
const MODEL_OPTIONS: Record<SidecarProvider, Array<{ label: string; value: string }>> = {
  openai: [
    { label: 'GPT-5.5', value: 'gpt-5.5' },
    { label: 'GPT-4.1', value: 'gpt-4.1' },
  ],
  anthropic: [
    { label: 'Claude Sonnet 5', value: 'claude-sonnet-5' },
    { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-latest' },
  ],
}

export function AiShortsPanel({ sessionId, clips, client, onApplyTimeline }: AiShortsPanelProps) {
  const sidecarClient = useMemo(() => client ?? createSidecarClient(), [client])
  const [provider, setProvider] = useState<SidecarProvider>('openai')
  const [model, setModel] = useState(MODEL_OPTIONS.openai[0]?.value ?? 'gpt-5.5')
  const [sourceLanguage, setSourceLanguage] = useState<SourceLanguageCode>('ja')
  const [language, setLanguage] = useState<LanguageCode>('ja')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [candidateCount, setCandidateCount] = useState(0)
  const [successMessage, setSuccessMessage] = useState('')
  const [loadingMessage, setLoadingMessage] = useState('')
  const [analyzedClips, setAnalyzedClips] = useState<CandidateClip[] | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  async function analyze() {
    if (!sidecarClient.analyze) {
      setErrorMessage('sidecar analyze 경로가 없습니다')
      setStatus('error')
      return
    }
    setStatus('loading')
    setLoadingMessage('Analyzing...')
    setSuccessMessage('')
    setErrorMessage('')
    try {
      const result = await sidecarClient.analyze(sessionId, {
        provider,
        model,
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

  function changeProvider(nextProvider: SidecarProvider) {
    setProvider(nextProvider)
    setModel(MODEL_OPTIONS[nextProvider][0]?.value ?? '')
  }

  async function loadCandidates() {
    if (!sidecarClient.getCandidates) {
      setErrorMessage('sidecar candidates 경로가 없습니다')
      setStatus('error')
      return
    }
    setStatus('loading')
    setLoadingMessage('Loading candidates...')
    setSuccessMessage('')
    setErrorMessage('')
    try {
      const result = await sidecarClient.getCandidates(sessionId)
      setAnalyzedClips(result.clips)
      setCandidateCount(result.clips.length)
      setSuccessMessage(
        `${result.clips.length} candidate${result.clips.length === 1 ? '' : 's'} loaded`
      )
      setStatus('success')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'candidate 로드 실패')
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
      const clipsToApply = spec.clips
        .filter((clip) => clip.clip_id === clipId)
        .map((clip) => ({
          ...clip,
          timeline_start_sec: 0,
        }))
      const captionCuesByClip = await loadCaptionCuesByClip(clipsToApply)
      onApplyTimeline(applyTimelineSpec({ ...spec, clips: clipsToApply }, { captionCuesByClip }))
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
      const captionCuesByClip = await loadCaptionCuesByClip(spec.clips)
      onApplyTimeline(applyTimelineSpec(spec, { captionCuesByClip }))
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

  async function loadCaptionCuesByClip(
    clipsToApply: TimelineClip[]
  ): Promise<Record<string, CaptionCueFile | undefined>> {
    const getCaptionCues = sidecarClient.getCaptionCues
    if (!getCaptionCues) {
      return {}
    }
    return Object.fromEntries(
      await Promise.all(
        clipsToApply.map(async (clip) => [
          clip.clip_id,
          await getCaptionCues(sessionId, clip.clip_id),
        ])
      )
    )
  }

  const displayClips = analyzedClips ?? clips

  const statusText =
    status === 'loading'
      ? loadingMessage || 'Loading...'
      : status === 'success'
        ? successMessage || `${candidateCount} candidate${candidateCount === 1 ? '' : 's'} ready`
        : status === 'error'
          ? errorMessage
          : 'Ready'

  return (
    <section className="flex min-h-[360px] flex-[1.2] flex-col overflow-hidden border-b border-[#252a34] bg-[#10141c]">
      <div className="border-b border-[#252a34] px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-[5px] border border-blue-400/30 bg-blue-400/10 text-blue-200">
              <Sparkles className="size-3.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-xs font-semibold tracking-tight text-slate-100">
                Clip Assistant
              </h2>
              <p className="truncate text-[0.6875rem] leading-4 text-slate-500">
                Find highlights and insert shorts into the sequence.
              </p>
            </div>
          </div>
          <span className="rounded-[4px] border border-slate-700 bg-slate-900 px-2 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-slate-400">
            30s max
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 px-3 py-3">
        <label className="space-y-1 text-xs text-slate-400">
          <span>Provider</span>
          <NativeSelect
            aria-label="Provider"
            value={provider}
            onChange={(event) => changeProvider(event.currentTarget.value as SidecarProvider)}
            className="w-full"
          >
            <NativeSelectOption value="anthropic">Anthropic</NativeSelectOption>
            <NativeSelectOption value="openai">OpenAI</NativeSelectOption>
          </NativeSelect>
        </label>
        <label className="space-y-1 text-xs text-slate-400">
          <span>Model</span>
          <NativeSelect
            aria-label="Model"
            value={model}
            onChange={(event) => setModel(event.currentTarget.value)}
            className="w-full"
          >
            {MODEL_OPTIONS[provider].map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        <label className="space-y-1 text-xs text-slate-400">
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
        <label className="space-y-1 text-xs text-slate-400">
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
      <div className="flex flex-wrap items-center gap-2 border-y border-[#252a34] bg-[#0d1118] px-3 py-2">
        <button
          type="button"
          aria-label="Analyze"
          onClick={analyze}
          disabled={status === 'loading'}
          className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-[5px] bg-blue-500 px-3 text-xs font-medium text-white shadow-sm shadow-black/20 transition-colors hover:bg-blue-400 disabled:pointer-events-none disabled:opacity-50"
        >
          <Scissors className="size-3.5" aria-hidden="true" />
          Find highlights
        </button>
        {sidecarClient.getCandidates ? (
          <button
            type="button"
            aria-label="Load Candidates"
            onClick={loadCandidates}
            disabled={status === 'loading'}
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-[5px] border border-slate-700 bg-slate-900 px-2.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-50"
          >
            Saved
          </button>
        ) : null}
        {sidecarClient.getTimelineSpec && onApplyTimeline && displayClips.length > 1 ? (
          <button
            type="button"
            aria-label="Apply All"
            onClick={applyAllClips}
            className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-[5px] border border-slate-700 bg-slate-900 px-2.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800"
          >
            <ListPlus className="size-3.5" aria-hidden="true" />
            Insert all
          </button>
        ) : null}
        <p
          role={status === 'error' ? 'alert' : 'status'}
          className={
            status === 'error'
              ? 'basis-full truncate text-xs text-red-300'
              : 'basis-full truncate text-xs text-slate-400'
          }
        >
          {statusText}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-3 pb-3">
        <CandidateList
          clips={displayClips}
          onApplyClip={sidecarClient.getTimelineSpec && onApplyTimeline ? applyClip : undefined}
        />
      </div>
    </section>
  )
}
