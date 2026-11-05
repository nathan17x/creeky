/** Renders the tiny markup used in Creeky's lines: **command** becomes inline code. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? (
          <code key={i} className="rounded bg-primary/15 px-1 py-0.5 font-mono text-[0.92em] text-primary">
            {p}
          </code>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  )
}
