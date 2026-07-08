export function EditorPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section aria-label="OpenCut AI Shorts editor" className="flex min-h-screen flex-col">
        <header className="border-b px-5 py-3">
          <h1 className="text-lg font-semibold">OpenCut AI Shorts</h1>
        </header>
        <div className="grid flex-1 grid-cols-[280px_1fr_320px] grid-rows-[1fr_220px] gap-px bg-border">
          <aside className="bg-background p-4">
            <h2 className="text-sm font-medium">Source Media</h2>
          </aside>
          <section className="bg-background p-4">
            <h2 className="text-sm font-medium">Preview</h2>
          </section>
          <aside className="bg-background p-4">
            <h2 className="text-sm font-medium">AI Shorts</h2>
          </aside>
          <section className="col-span-3 bg-background p-4">
            <h2 className="text-sm font-medium">Timeline</h2>
          </section>
        </div>
      </section>
    </main>
  )
}
