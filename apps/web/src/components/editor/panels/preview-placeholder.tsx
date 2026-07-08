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
    <section className="flex min-h-0 flex-col bg-card p-4">
      <h2 className="text-sm font-semibold tracking-tight">Preview</h2>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        {sourceUrl ? (
          <video
            aria-label="Source preview"
            className="aspect-[9/16] h-[min(72vh,520px)] max-h-full rounded-md border bg-zinc-950 object-cover shadow-xl shadow-black/10"
            controls
            muted
            playsInline
            src={sourceUrl}
          />
        ) : (
          <div className="aspect-[9/16] h-[min(72vh,520px)] max-h-full rounded-md border bg-zinc-950 shadow-xl shadow-black/10" />
        )}
      </div>
    </section>
  )
}
