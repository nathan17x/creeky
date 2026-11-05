"use client"

import { useEffect, useRef } from "react"
import "@xterm/xterm/css/xterm.css"
import type { TerminalBackend } from "@/lib/sim/types"

/** xterm.js bound to any TerminalBackend (simulator today, a real device later). */
export function LabTerminal({ backend, onKey }: { backend: TerminalBackend; onKey?: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const onKeyRef = useRef(onKey)
  useEffect(() => {
    onKeyRef.current = onKey
  }, [onKey])

  useEffect(() => {
    let disposed = false
    let cleanup = () => {}
    ;(async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([import("@xterm/xterm"), import("@xterm/addon-fit")])
      if (disposed || !ref.current) return
      const mono = getComputedStyle(document.documentElement).getPropertyValue("--font-geist-mono").trim()
      const term = new Terminal({
        cursorBlink: true,
        fontFamily: `${mono ? mono + ", " : ""}ui-monospace, Menlo, monospace`,
        fontSize: 14,
        lineHeight: 1.25,
        scrollback: 2000,
        theme: {
          background: "#00000000",
          foreground: "#dfe6ee",
          cursor: "#f2c230",
          selectionBackground: "#f2c23044",
          green: "#5fd7a0",
          brightGreen: "#7ee8b8",
          blue: "#7aa7ff",
          brightBlue: "#9dbdff",
          yellow: "#f2c230",
        },
        allowTransparency: true,
      })
      const fit = new FitAddon()
      term.loadAddon(fit)
      term.open(ref.current)
      fit.fit()
      backend.connect((d) => term.write(d))
      const sub = term.onData((d) => {
        onKeyRef.current?.()
        backend.input(d)
      })
      const ro = new ResizeObserver(() => {
        fit.fit()
        backend.resize?.(term.cols, term.rows)
      })
      ro.observe(ref.current)
      term.focus()
      cleanup = () => {
        ro.disconnect()
        sub.dispose()
        term.dispose()
      }
    })()
    return () => {
      disposed = true
      cleanup()
    }
  }, [backend])

  return <div ref={ref} className="h-full w-full" onClick={() => ref.current?.querySelector("textarea")?.focus()} />
}
