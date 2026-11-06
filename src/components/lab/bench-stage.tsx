"use client"

import { X } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import type { WiringSection } from "@/lib/course/types"
import type { LabEvent } from "@/lib/sim/types"
import { type Bench, CONNECTOR_NAME, type DeviceDef, portKey } from "@/lib/wiring/bench"
import { Hdcu5500Panel } from "./panels/hdcu5500-panel"
import { cn } from "@/lib/utils"

interface Pt {
  x: number
  y: number
}

/** Drawn rear panels, by device look. */
const PANELS: Partial<Record<DeviceDef["look"], () => React.ReactNode>> = {
  hdcu5500: () => <Hdcu5500Panel />,
}

/**
 * A workbench for wiring sections: one device's rear panel drawn large, the
 * rest of the gear as status tiles. Each tray label is a cable with one end
 * already plugged in: drag it onto the jack the other end goes into.
 * Click a used jack to unplug it.
 */
export function BenchStage({
  section,
  bench,
  startIdx,
  quiz,
  onEvent,
}: {
  section: WiringSection
  bench: Bench
  startIdx: number
  quiz: boolean
  onEvent: (e: LabEvent, silent: boolean) => void
}) {
  // Fast-forward earlier lessons. apply() skips anything already plugged, so a double run is harmless.
  useState(() => {
    if (!quiz) section.lessons.slice(0, startIdx).flatMap((l) => l.solution).forEach((line) => bench.apply(line))
    return null
  })
  const [, setVersion] = useState(0)
  const bump = () => setVersion((v) => v + 1)
  const [drag, setDrag] = useState<{ label: string; at: Pt } | null>(null)
  const [hover, setHover] = useState<string | null>(null)

  const emit = useCallback((e: LabEvent) => onEvent(e, false), [onEvent])
  const { labels } = section.scene

  const unplug = useCallback(
    (id: number) => {
      const c = bench.remove(id)
      bump()
      if (c) emit({ type: "unwire", cable: c.cable, a: c.a, b: c.b })
    },
    [bench, emit]
  )

  const drop = useCallback(
    (labelId: string, key: string) => {
      const label = labels.find((l) => l.id === labelId)!
      const fail = (problem: "connector" | "occupied" | "same") => emit({ type: "plug", cable: label.cable, port: key, ok: false, problem })
      if (!label.from) return fail("connector")
      if (key === label.from) return fail("same")
      const moving = bench.placed(label.id)
      if (moving?.b === key) return
      const occupant = bench.at(key)
      if (occupant && occupant !== moving) return fail("occupied")
      if (moving) bench.remove(moving.id)
      const problem = bench.fits(label.cable, key, bench.port(label.from)!.port.connector)
      if (problem) {
        if (moving) bench.connect(moving.cable, moving.a, moving.b, moving.label)
        return fail(problem)
      }
      bench.connect(label.cable, label.from, key, label.id)
      bump()
      emit({ type: "plug", cable: label.cable, port: key, ok: true })
      emit({ type: "wire", cable: label.cable, a: label.from, b: key, direction: bench.direction(label.from, key) })
    },
    [bench, emit, labels]
  )

  // Pointer drag: follow the pointer, find the jack under it, drop on release.
  useEffect(() => {
    if (!drag) return
    const jackAt = (x: number, y: number) =>
      (document.elementFromPoint(x, y)?.closest("[data-jack]") as HTMLElement | null)?.dataset.jack ?? null
    const move = (e: PointerEvent) => {
      setDrag((d) => (d ? { ...d, at: { x: e.clientX, y: e.clientY } } : d))
      setHover(jackAt(e.clientX, e.clientY))
    }
    const up = (e: PointerEvent) => {
      const key = jackAt(e.clientX, e.clientY)
      if (key) drop(drag.label, key)
      setDrag(null)
      setHover(null)
    }
    const cancel = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrag(null)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("keydown", cancel)
    return () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("keydown", cancel)
    }
  }, [drag, drop])

  const status = bench.status()
  const dragging = drag ? labels.find((l) => l.id === drag.label)! : null
  const fitsNow = (key: string) => {
    if (!dragging?.from || key === dragging.from) return false
    const own = bench.placed(dragging.id)
    const occupant = bench.at(key)
    if (occupant && occupant !== own) return false
    const used = bench.port(dragging.from)!.port.connector
    const cable = bench.cable(dragging.cable)!
    const free = cable.ends[cable.ends.indexOf(used) === 0 ? 1 : 0]
    return bench.port(key)!.port.connector === free
  }
  const where = (key: string) => {
    const p = bench.port(key)!
    return `${p.device.label} ${p.port.label || "outlet"}`
  }

  const main = section.scene.devices.find((d) => d.panel)!
  const tiles = section.scene.devices.filter((d) => d !== main)
  const size = main.panel!

  return (
    <div className={cn("flex h-full w-full flex-col bg-[#1b1d22] select-none", drag && "cursor-grabbing")}>
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
        {/* panel header: name + front-panel status lights */}
        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold text-white/90">{main.label}</span>
          <span className="text-[11px] text-white/45">{main.sub}</span>
          <div className="ml-auto flex gap-3">
            {main.leds?.map((l) => (
              <Led key={l.label} on={bench.lit(main, l.when, status)} color={l.color} label={l.label} />
            ))}
          </div>
        </div>

        {/* the drawn panel, as large as fits, with drop targets on its jacks */}
        <div className="relative min-h-0 flex-1 [container-type:size]">
          <div
            className="relative mx-auto"
            style={{ width: `min(100cqw, calc(100cqh * ${size.w} / ${size.h}))`, aspectRatio: `${size.w} / ${size.h}` }}
          >
            {PANELS[main.look]?.()}
            {main.ports.map((p) => {
              const key = portKey(main.id, p.id)
              const conn = bench.at(key)
              const color = conn ? bench.cable(conn.cable)!.color : undefined
              const ok = drag ? fitsNow(key) : null
              const r = p.r ?? 20
              return (
                <button
                  key={key}
                  data-jack={key}
                  title={`${p.label} · ${CONNECTOR_NAME[p.connector]}${conn ? " · click to unplug" : ""}`}
                  aria-label={`${p.label}${conn ? ", plugged in, click to unplug" : ""}`}
                  onClick={() => conn && unplug(conn.id)}
                  className={cn(
                    "absolute aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full transition-[box-shadow,transform] focus-visible:outline-2 focus-visible:outline-primary",
                    conn ? "cursor-pointer" : "cursor-default",
                    drag && ok && "ring-2 ring-success ring-offset-1 ring-offset-transparent",
                    drag && ok && hover === key && "scale-110 bg-success/20",
                    !drag && "hover:bg-white/10"
                  )}
                  style={{
                    left: `${(p.pos!.x / size.w) * 100}%`,
                    top: `${(p.pos!.y / size.h) * 100}%`,
                    width: `${((2 * r + 6) / size.w) * 100}%`,
                    boxShadow: color ? `0 0 0 3px ${color}, 0 0 14px ${color}` : undefined,
                  }}
                />
              )
            })}
          </div>
        </div>

        {/* the rest of the gear */}
        <div className="grid shrink-0 gap-2" style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}>
          {tiles.map((d) => (
            <Tile key={d.id} device={d} status={status} bench={bench} />
          ))}
        </div>
      </div>

      {/* label tray */}
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-t-4 border-[#3a2f24] bg-[#2a2219] px-3 py-2">
        <span className="mr-1 font-pixel text-[9px] tracking-wide text-[#c8a982]">CABLES</span>
        {labels.map((l) => {
          const cable = bench.cable(l.cable)!
          const placed = bench.placed(l.id)
          return (
            <div
              key={l.id}
              role="button"
              tabIndex={0}
              aria-label={`${l.text}${placed ? `, plugged into ${where(placed.b)}` : ""}. Drag onto a jack.`}
              title={placed ? `Plugged into ${where(placed.b)}` : "Drag onto a jack"}
              onPointerDown={(e) => {
                e.preventDefault()
                setDrag({ label: l.id, at: { x: e.clientX, y: e.clientY } })
                emit({ type: "cable-pick", cable: l.cable })
              }}
              className={cn(
                "flex cursor-grab touch-none items-center gap-1.5 rounded-md border border-white/10 bg-black/30 py-1 pl-1 pr-1.5 transition-colors hover:border-white/30",
                drag?.label === l.id && "opacity-40",
                placed && "bg-black/10"
              )}
            >
              <span className="h-4 w-1.5 rounded-full" style={{ background: cable.color }} />
              <span className={cn("text-[11px] font-medium", placed ? "text-white/55" : "text-white")}>
                {placed && "✓ "}
                {l.text}
              </span>
              {placed && (
                <button
                  aria-label={`Unplug ${l.text}`}
                  className="ml-1 rounded p-0.5 text-white/60 hover:bg-white/10 hover:text-white"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => unplug(placed.id)}
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* label being dragged */}
      {drag && dragging && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-md border border-white/30 bg-black/85 px-2.5 py-1.5 text-xs font-medium text-white shadow-xl"
          style={{ left: drag.at.x, top: drag.at.y, borderLeft: `6px solid ${bench.cable(dragging.cable)!.color}` }}
        >
          {dragging.text}
        </div>
      )}
    </div>
  )
}

/** A camera shot, for monitors and viewfinders. */
function Graphic() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[linear-gradient(180deg,#38bdf8_0%,#7dd3fc_48%,#16a34a_48%,#15803d_100%)]">
      <div className="absolute left-[18%] top-[40%] h-[22%] w-[10%] rounded-sm bg-white/90" />
      <div className="absolute right-[20%] top-[40%] h-[22%] w-[10%] rounded-sm bg-white/90" />
      <div className="absolute inset-x-[8%] bottom-[10%] flex items-stretch overflow-hidden rounded-sm shadow-lg">
        <div className="bg-[#ef4444] px-1.5 py-1 font-pixel text-[7px] text-white">CAM 3</div>
        <div className="flex-1 bg-white/90 px-1.5 py-1 text-[8px] font-semibold text-slate-900">CREEK VALLEY vs. DAM CITY</div>
      </div>
    </div>
  )
}

function Led({ on, color, label }: { on: boolean; color: string; label: string }) {
  return (
    <span className="flex flex-col items-center gap-0.5">
      <span
        className="size-2 rounded-full"
        style={{ background: on ? color : "#2a2a2a", boxShadow: on ? `0 0 8px ${color}` : undefined }}
      />
      <span className="font-mono text-[7px] text-white/70">{label}</span>
    </span>
  )
}

/** Small status card for gear that isn't the main panel. */
function Tile({ device: d, status, bench }: { device: DeviceDef; status: ReturnType<Bench["status"]>; bench: Bench }) {
  const on = status.powered.has(d.id)
  let visual: React.ReactNode
  switch (d.look) {
    case "camera":
      visual = <div className="h-full overflow-hidden rounded-sm border-2 border-[#3f3f46] bg-black">{on && <Graphic />}</div>
      break
    case "monitor":
      visual = (
        <div className="h-full overflow-hidden rounded-sm border-2 border-[#26272b] bg-black">
          {status.picture.has(d.id) ? (
            <Graphic />
          ) : (
            <div className="flex h-full items-center justify-center bg-[#0a0f2c] font-mono text-[8px] tracking-widest text-white/80">NO SIGNAL</div>
          )}
        </div>
      )
      break
    case "rcp":
      visual = (
        <div className="flex h-full items-center justify-center rounded-sm bg-[#27272a]">
          <div className="size-6 rounded-full border-2 border-black/50 bg-[radial-gradient(circle_at_40%_35%,#71717a,#18181b)]" />
        </div>
      )
      break
    case "console":
      visual = (
        <div className="flex h-full items-end justify-between rounded-sm bg-[#1c1917] px-1.5 pb-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="relative h-[80%] w-1 rounded-full bg-black/70">
              <div className="absolute left-1/2 h-1.5 w-3 -translate-x-1/2 rounded-[1px] bg-[#d4d4d8]" style={{ top: `${15 + ((i * 37) % 55)}%` }} />
            </div>
          ))}
        </div>
      )
      break
    case "strip":
      visual = (
        <div className="flex h-full items-center justify-center gap-1 rounded-sm bg-[#27272a]">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-3 w-2.5 rounded-[2px] bg-[#e5e7eb]" />
          ))}
          <span className="ml-1 size-2 rounded-[2px] bg-[#f97316] shadow-[0_0_6px_#f97316]" />
        </div>
      )
      break
    default:
      visual = <div className="h-full rounded-sm bg-gradient-to-b from-[#2f3b52] to-[#1e2636]" />
  }
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-md border border-white/10 bg-black/25 p-1.5">
      <div className="h-10">{visual}</div>
      <div className="flex items-center gap-1.5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[10px] font-semibold text-white/90">{d.label}</div>
          {d.sub && <div className="truncate text-[9px] text-white/45">{d.sub}</div>}
        </div>
        {d.leds?.map((l) => (
          <Led key={l.label} on={bench.lit(d, l.when, status)} color={l.color} label={l.label} />
        ))}
      </div>
    </div>
  )
}
