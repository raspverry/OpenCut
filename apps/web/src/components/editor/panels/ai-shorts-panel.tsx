import { useMemo, useState } from 'react'

import type { CandidateClip, TimelineClip } from '../../../lib/editor/types'
import { createSidecarClient, type SidecarClient } from '../../../lib/editor/sidecar-client'
import type { LanguageCode, SidecarProvider } from '../../../lib/editor/types'
import { Button } from '../../ui/button'
import { NativeSelect, NativeSelectOption } from '../../ui/native-select'
import { CandidateList } from './candidate-list'

type AiShortsPanelProps = {
  sessionId: string
  clips: TimelineClip[]
  client?: Pick<SidecarClient, 'analyze'>
}

const MAX_CLIP_SEC = 30

export function AiShortsPanel({ sessionId, clips, client }: AiShortsPanelProps) {
  const sidecarClient = useMemo(() => client ?? createSidecarClient(), [client])
  const [provider, setProvider] = useState<SidecarProvider>('anthropic')
  const [language, setLanguage] = useState<LanguageCode>('ja')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [candidateCount, setCandidateCount] = useState(0)
  const [analyzedClips, setAnalyzedClips] = useState<CandidateClip[] | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  async function analyze() {
    setStatus('loading')
    setErrorMessage('')
    try {
      const result = await sidecarClient.analyze(sessionId, {
        provider,
        language,
        max_clip_sec: MAX_CLIP_SEC,
        force: true,
      })
      setAnalyzedClips(result.candidates.clips)
      setCandidateCount(result.candidates.clips.length)
      setStatus('success')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'analyze 실패')
      setStatus('error')
    }
  }

  const statusText =
    status === 'loading'
      ? 'Analyzing...'
      : status === 'success'
        ? `${candidateCount} candidate${candidateCount === 1 ? '' : 's'} ready`
        : status === 'error'
          ? errorMessage
          : 'Ready'

  return (
    <aside className="bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">AI Shorts</h2>
        <span className="text-xs text-muted-foreground">Max 30s</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
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
          <span>Language</span>
          <NativeSelect
            aria-label="Language"
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
        <Button onClick={analyze} disabled={status === 'loading'}>Analyze</Button>
        <p
          role={status === 'error' ? 'alert' : 'status'}
          className="truncate text-xs text-muted-foreground"
        >
          {statusText}
        </p>
      </div>
      <CandidateList clips={analyzedClips ?? clips} />
    </aside>
  )
}
