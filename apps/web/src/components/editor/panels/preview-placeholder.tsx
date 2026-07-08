export function PreviewPlaceholder() {
  return (
    <section className="flex min-h-0 flex-col bg-card p-4">
      <h2 className="text-sm font-semibold tracking-tight">Preview</h2>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="aspect-[9/16] h-[min(72vh,520px)] max-h-full rounded-md border bg-zinc-950 shadow-xl shadow-black/10" />
      </div>
    </section>
  )
}
