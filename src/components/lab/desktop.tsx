"use client"

import { Clapperboard, HardDrive, Monitor, Network, Trash2 } from "lucide-react"
import { useRef, useState, useSyncExternalStore } from "react"
import type { Video } from "@/lib/course/types"
import type { World } from "@/lib/sim/network"
import type { LabEvent, TerminalBackend, WindowName } from "@/lib/sim/types"
import { cn } from "@/lib/utils"
import { AdapterProperties, Ipv4Properties, MediaPlayer, NetworkConnections, Win } from "./creekdows-windows"
import { LabTerminal } from "./terminal"

const CMD_NAMES = ["cmd", "cmd.exe", "command", "command.com"]
const NCPA_NAMES = ["ncpa.cpl", "control ncpa.cpl", "control netconnections"]

type WinId = WindowName | "cmd"

const TITLES: Record<WindowName, string> = {
  video: "Creek Media Player",
  ncpa: "Network Connections",
  adapter: "Ethernet Properties",
  ipv4: "Internet Protocol Version 4 (TCP/IPv4) Properties",
}

const subscribeClock = (cb: () => void) => {
  const t = setInterval(cb, 15000)
  return () => clearInterval(t)
}
const clockNow = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })

/**
 * Creekdows 98: a vaporwave desktop with a Run dialog and a command prompt
 * window that hosts the terminal. Run opens from Start only: a real Win+R
 * would open the host OS's Run box on Windows, so we don't teach it here.
 */
export function Desktop({
  backend,
  world,
  video,
  initialWindows = [],
  onEvent,
  onOpenCmd,
  onCloseCmd,
  onKey,
}: {
  /** Set while the command prompt is open. */
  backend: TerminalBackend | null
  world: World
  /** The current lesson's video, if any. */
  video?: Video
  /** Windows already open (jumping into a lesson). */
  initialWindows?: WindowName[]
  onEvent: (e: LabEvent) => void
  onOpenCmd: () => void
  onCloseCmd: () => void
  onKey?: () => void
}) {
  /** Open windows, back to front. The command prompt joins while backend is set. */
  const [order, setOrder] = useState<WinId[]>(() => [...initialWindows, "cmd"])
  const isOpen = (id: WindowName) => order.includes(id)
  const focus = (id: WinId) => setOrder((o) => [...o.filter((x) => x !== id), id])
  const open = (id: WindowName, adapter?: string) => {
    focus(id)
    onEvent({ type: "window", name: id, open: true, adapter })
  }
  const close = (...ids: WindowName[]) => {
    setOrder((o) => o.filter((x) => !ids.includes(x as WindowName)))
    ids.forEach((id) => onEvent({ type: "window", name: id, open: false }))
  }
  const visible = order.filter((id) => (id === "cmd" ? !!backend : true))
  const top = visible[visible.length - 1]
  const z = (id: WinId) => 20 + visible.indexOf(id)

  const [startOpen, setStartOpen] = useState(false)
  const [runOpen, setRunOpen] = useState(false)
  const [runText, setRunText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const clock = useSyncExternalStore(subscribeClock, clockNow, () => "")
  const inputRef = useRef<HTMLInputElement>(null)

  const openRun = () => {
    setStartOpen(false)
    setError(null)
    setRunOpen(true)
    onEvent({ type: "run-dialog" })
    requestAnimationFrame(() => inputRef.current?.select())
  }

  const submitRun = () => {
    const text = runText.trim()
    if (!text) return
    const name = text.toLowerCase().replace(/\s+/g, " ")
    const cmd = CMD_NAMES.includes(name)
    const ncpa = NCPA_NAMES.includes(name)
    onEvent({ type: "run", command: text, ok: cmd || ncpa })
    setRunOpen(false)
    if (cmd) {
      onOpenCmd()
      focus("cmd")
    } else if (ncpa) open("ncpa")
    else setError(text)
  }

  return (
    <div className="w98 relative h-full w-full overflow-hidden select-none" onMouseDown={onKey}>
      {/* sky, sun, grid */}
      <div className="vapor-sky absolute inset-0" />
      <div className="vapor-sun absolute left-1/2 top-[18%] size-56 -translate-x-1/2 rounded-full" />
      <div className="absolute inset-x-0 bottom-0 isolate z-0 h-[38%] overflow-hidden">
        <div className="vapor-grid absolute -inset-x-1/2 top-0 h-[200%]" />
      </div>

      {/* icons */}
      <div className="absolute left-3 top-3 z-10 flex flex-col gap-5">
        {[
          { icon: HardDrive, label: "My Computer" },
          { icon: Network, label: "Network" },
          { icon: Trash2, label: "Recycle Bin" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex w-20 flex-col items-center gap-1 text-white">
            <Icon className="size-8 drop-shadow-[2px_2px_0_#000]" strokeWidth={1.5} />
            <span className="px-1 text-center text-[11px] [text-shadow:1px_1px_0_#000]">{label}</span>
          </div>
        ))}
        {video && (
          <button className="flex w-20 flex-col items-center gap-1 text-white" onDoubleClick={() => open("video")} title="Double-click to open">
            <Clapperboard className="size-8 drop-shadow-[2px_2px_0_#000]" strokeWidth={1.5} />
            <span className="px-1 text-center text-[11px] [text-shadow:1px_1px_0_#000]">Media Player</span>
          </button>
        )}
      </div>
      <div className="pointer-events-none absolute right-4 top-3 text-right font-mono text-[11px] tracking-[0.3em] text-white/70">
        C R E E K D O W S&nbsp;&nbsp;9 8
      </div>

      {/* command prompt window */}
      {backend && (
        <div
          className="w98-raised absolute inset-x-[3%] top-[3%] bottom-[46px] flex flex-col p-[3px]"
          style={{ zIndex: z("cmd") }}
          onPointerDownCapture={() => focus("cmd")}
        >
          <div className={cn("flex h-[22px] items-center gap-1.5 px-1.5", top === "cmd" ? "w98-title" : "w98-title-inactive")}>
            <span className="rounded-[1px] bg-black px-0.5 font-mono text-[9px] leading-tight">C:\</span>
            <span className="flex-1 truncate">Command Prompt</span>
            <button className="w98-button !min-w-0 !px-1 !py-0 leading-none text-black" aria-label="Close" onClick={onCloseCmd}>
              ×
            </button>
          </div>
          <div className="mt-[2px] min-h-0 flex-1 bg-black p-1.5">
            <LabTerminal backend={backend} onKey={onKey} />
          </div>
        </div>
      )}

      {/* control panel windows */}
      {video && isOpen("video") && (
        <Win title={TITLES.video} x={110} y={20} width={560} z={z("video")} active={top === "video"} onFocus={() => focus("video")} onClose={() => close("video")}>
          <MediaPlayer
            video={video}
            onWatched={() => {
              onEvent({ type: "watched", video: video.id })
              close("video")
            }}
          />
        </Win>
      )}
      {isOpen("ncpa") && (
        <Win
          title={TITLES.ncpa}
          icon={<Network className="size-3.5" />}
          x={24}
          y={16}
          width={540}
          z={z("ncpa")}
          active={top === "ncpa"}
          onFocus={() => focus("ncpa")}
          onClose={() => {
            world.nic.discard()
            close("ncpa", "adapter", "ipv4")
          }}
        >
          <NetworkConnections
            world={world}
            onProperties={(adapter) => (adapter === "Ethernet" ? open("adapter", adapter) : onEvent({ type: "window", name: "adapter", open: true, adapter }))}
          />
        </Win>
      )}
      {isOpen("adapter") && (
        <Win
          title={TITLES.adapter}
          icon={<Monitor className="size-3.5" />}
          x={330}
          y={36}
          width={350}
          z={z("adapter")}
          active={top === "adapter"}
          onFocus={() => focus(isOpen("ipv4") ? "ipv4" : "adapter")}
          onClose={() => {
            world.nic.discard()
            close("adapter", "ipv4")
          }}
        >
          <AdapterProperties
            blocked={isOpen("ipv4")}
            onIpv4={() => open("ipv4")}
            onOk={() => {
              world.nic.apply()
              onEvent({ type: "nic", stage: "applied", settings: { ...world.nic.applied } })
              close("adapter")
            }}
            onCancel={() => {
              world.nic.discard()
              close("adapter")
            }}
          />
        </Win>
      )}
      {isOpen("ipv4") && (
        <Win
          title={TITLES.ipv4}
          x={400}
          y={4}
          width={390}
          z={z("ipv4")}
          active={top === "ipv4"}
          onFocus={() => focus("ipv4")}
          onClose={() => {
            world.nic.dropDraft()
            close("ipv4")
          }}
        >
          <Ipv4Properties world={world} onEvent={onEvent} onOk={() => close("ipv4")} onCancel={() => close("ipv4")} />
        </Win>
      )}

      {/* run dialog */}
      {runOpen && (
        <div className="w98-raised absolute left-4 bottom-[52px] z-30 w-[360px] p-[3px]" role="dialog" aria-label="Run">
          <div className="w98-title flex h-[22px] items-center px-1.5">
            <span className="flex-1">Run</span>
            <button className="w98-button !min-w-0 !px-1 !py-0 leading-none" aria-label="Close" onClick={() => setRunOpen(false)}>
              ×
            </button>
          </div>
          <form
            className="flex flex-col gap-3 p-3"
            onSubmit={(e) => {
              e.preventDefault()
              submitRun()
            }}
          >
            <p>Type the name of a program, folder, or document, and Creekdows will open it for you.</p>
            <label className="flex items-center gap-2">
              <span>
                <u>O</u>pen:
              </span>
              <input
                ref={inputRef}
                autoFocus
                value={runText}
                onChange={(e) => setRunText(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === "Escape") setRunOpen(false)
                }}
                className="w98-sunken h-[22px] flex-1 px-1 outline-none"
                spellCheck={false}
                autoComplete="off"
              />
            </label>
            <div className="flex justify-end gap-1.5">
              <button type="submit" className="w98-button">OK</button>
              <button type="button" className="w98-button" onClick={() => setRunOpen(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* error */}
      {error && (
        <div className="w98-raised absolute left-1/2 top-1/3 z-40 w-[380px] -translate-x-1/2 p-[3px]" role="alertdialog">
          <div className="w98-title flex h-[22px] items-center px-1.5">{error}</div>
          <div className="flex gap-3 p-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-600 font-bold text-white">×</span>
            <p>
              Cannot find the file &apos;{error}&apos; (or one of its components). Make sure the path and filename are correct.
            </p>
          </div>
          <div className="flex justify-center pb-3">
            <button className="w98-button" autoFocus onClick={() => setError(null)}>OK</button>
          </div>
        </div>
      )}

      {/* start menu */}
      {startOpen && (
        <div className="w98-raised absolute left-0.5 bottom-[30px] z-40 flex w-48 p-[3px]">
          <div className="flex w-6 items-end justify-center bg-gradient-to-t from-[#000080] to-[#ff3fa4] pb-2">
            <span className="rotate-180 font-bold text-white [writing-mode:vertical-rl]">Creekdows<span className="font-normal">98</span></span>
          </div>
          <ul className="flex-1 py-1">
            {["Programs", "Documents", "Settings", "Find", "Help"].map((x) => (
              <li key={x} className="px-3 py-1.5 text-[#808080]">{x}</li>
            ))}
            <li>
              <button className="w-full px-3 py-1.5 text-left hover:bg-[#000080] hover:text-white" onClick={openRun}>
                <u>R</u>un…
              </button>
            </li>
            <li className="mx-1 my-1 border-t border-b border-t-[#808080] border-b-white" />
            <li className="px-3 py-1.5 text-[#808080]">Shut Down…</li>
          </ul>
        </div>
      )}

      {/* taskbar */}
      <div className="w98-raised absolute inset-x-0 bottom-0 z-30 flex h-[30px] items-center gap-1 px-1">
        <button
          className="w98-button flex !min-w-0 items-center gap-1 !px-2 font-bold"
          aria-pressed={startOpen}
          onClick={() => setStartOpen((o) => !o)}
        >
          <span className="inline-block size-3 bg-[conic-gradient(#ff3fa4_0_25%,#01cdfe_0_50%,#ffe66d_0_75%,#b967ff_0)]" />
          Start
        </button>
        {[...visible].sort().map((id) => (
          <button
            key={id}
            className="w98-button flex !min-w-0 max-w-44 items-center gap-1 !px-2 text-left"
            aria-pressed={top === id}
            onClick={() => focus(id)}
          >
            {id === "cmd" && <span className="bg-black px-0.5 font-mono text-[9px] text-white">C:\</span>}
            <span className="truncate">{id === "cmd" ? "Command Prompt" : id === "ipv4" ? "IPv4 Properties" : TITLES[id]}</span>
          </button>
        ))}
        <div className="w98-sunken ml-auto flex h-[22px] items-center !bg-transparent px-2.5">{clock}</div>
      </div>
    </div>
  )
}
