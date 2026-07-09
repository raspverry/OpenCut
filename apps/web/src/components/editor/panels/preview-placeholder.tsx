import { useEffect, useState } from 'react'
import { Pause, Play, SkipBack, SkipForward, Volume2 } from 'lucide-react'

type PreviewPlaceholderProps = {
  sourceFile?: File | null
}

export function PreviewPlaceholder({ sourceFile }: PreviewPlaceholderProps) {
  const [sourceUrl, setSourceUrl] = useState('')

  useEffect(() => {
    if (!sourceFile) {
      setSourceUrl('')
      return
    }
    const url = URL.createObjectURL(sourceFile)
    setSourceUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [sourceFile])

  return (
    <section
      aria-label="Program monitor"
      className="flex h-full min-h-0 flex-col bg-[#07090d]"
    >
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-[#242b36] px-3">
        <h2 className="text-xs font-semibold tracking-tight text-slate-200">Program Monitor</h2>
        <div className="flex items-center gap-3 text-[0.625rem] font-medium uppercase tracking-[0.1em] text-slate-500">
          <span>Fit</span>
          <span>9:16</span>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center bg-black p-4">
        {sourceUrl ? (
          <video
            aria-label="Source preview"
            className="aspect-[9/16] h-full max-h-full rounded-[4px] border border-[#2b3442] bg-black object-contain shadow-2xl shadow-black/50"
            controls
            muted
            playsInline
            src={sourceUrl}
          />
        ) : (
          <div className="aspect-[9/16] h-full max-h-full rounded-[4px] border border-[#2b3442] bg-black shadow-2xl shadow-black/50" />
        )}
      </div>
      <div
        aria-label="Editor transport"
        className="flex h-12 shrink-0 items-center gap-3 border-t border-[#242b36] bg-[#0b0e13] px-3"
      >
        <span className="w-20 font-mono text-xs font-semibold text-slate-300">00:00:00:00</span>
        <div className="flex items-center gap-1">
          <button className={transportButtonClassName} type="button" aria-label="Previous frame">
            <SkipBack className="size-3.5" aria-hidden="true" />
          </button>
          <button className={transportButtonClassName} type="button" aria-label="Play">
            <Play className="size-4" aria-hidden="true" />
          </button>
          <button className={transportButtonClassName} type="button" aria-label="Pause">
            <Pause className="size-3.5" aria-hidden="true" />
          </button>
          <button className={transportButtonClassName} type="button" aria-label="Next frame">
            <SkipForward className="size-3.5" aria-hidden="true" />
          </button>
        </div>
        <div className="h-1 flex-1 rounded-full bg-[#1b2230]">
          <div className="h-1 w-1/4 rounded-full bg-blue-400" />
        </div>
        <Volume2 className="size-3.5 text-slate-500" aria-hidden="true" />
      </div>
    </section>
  )
}

const transportButtonClassName =
  'inline-flex size-8 items-center justify-center rounded-[4px] border border-[#2b3442] bg-[#151b24] text-slate-200 transition-colors hover:bg-[#1d2632] focus:outline-none focus:ring-2 focus:ring-blue-400/20'
