import { useEffect, useState } from 'react'

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
    <section className="flex h-full min-h-0 flex-col bg-[#080b10]">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-slate-800 px-3">
        <h2 className="text-xs font-semibold tracking-tight text-slate-200">Preview</h2>
        <span className="text-[0.625rem] font-medium uppercase text-slate-500">9:16</span>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        {sourceUrl ? (
          <video
            aria-label="Source preview"
            className="aspect-[9/16] h-full max-h-full rounded-[6px] border border-slate-700 bg-black object-cover shadow-2xl shadow-black/50"
            controls
            muted
            playsInline
            src={sourceUrl}
          />
        ) : (
          <div className="aspect-[9/16] h-full max-h-full rounded-[6px] border border-slate-800 bg-black shadow-2xl shadow-black/50" />
        )}
      </div>
    </section>
  )
}
