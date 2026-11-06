"use client"

import { Bluetooth, Check, Monitor, Wifi, X } from "lucide-react"
import { type ReactNode, useRef, useState } from "react"
import type { Video } from "@/lib/course/types"
import type { World } from "@/lib/sim/network"
import { type IpSettings, classfulMask, isIp, isMask } from "@/lib/sim/nic"
import type { LabEvent, NicField } from "@/lib/sim/types"
import { cn } from "@/lib/utils"

// ------------------------------------------------------------ window frame

/** A draggable Creekdows window. Position is kept inside the desktop by CSS min(). */
export function Win({
  title,
  icon,
  x,
  y,
  width,
  z,
  active,
  onFocus,
  onClose,
  children,
  label,
}: {
  title: string
  icon?: ReactNode
  x: number
  y: number
  width: number
  z: number
  active: boolean
  onFocus: () => void
  onClose?: () => void
  children: ReactNode
  label?: string
}) {
  const [pos, setPos] = useState({ x, y })
  const drag = useRef<{ dx: number; dy: number } | null>(null)
  return (
    <div
      role="dialog"
      aria-label={label ?? title}
      className="w98-raised absolute flex flex-col p-[3px]"
      style={{ left: `max(0px, min(${pos.x}px, calc(100% - ${width}px)))`, top: `max(0px, ${pos.y}px)`, width, zIndex: z }}
      onPointerDownCapture={onFocus}
    >
      <div
        className={cn("flex h-[22px] cursor-default touch-none items-center gap-1.5 px-1.5", active ? "w98-title" : "w98-title-inactive")}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return
          drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (drag.current) setPos({ x: e.clientX - drag.current.dx, y: Math.max(0, e.clientY - drag.current.dy) })
        }}
        onPointerUp={() => (drag.current = null)}
      >
        {icon}
        <span className="flex-1 truncate">{title}</span>
        {onClose && (
          <button className="w98-button !min-w-0 !px-1 !py-0 leading-none text-black" aria-label="Close" onClick={onClose}>
            ×
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function Tabs({ tabs }: { tabs: string[] }) {
  return (
    <div className="flex px-2 pt-2">
      {tabs.map((t, i) => (
        <span
          key={t}
          className={cn(
            "border border-b-0 border-t-white border-l-white border-r-[#808080] px-2.5 py-0.5",
            i === 0 ? "relative z-10 -mb-px bg-[#c0c0c0] pb-1" : "mt-0.5 text-[#808080]"
          )}
        >
          {t}
        </span>
      ))}
    </div>
  )
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-2 border border-t-white border-l-white border-r-[#808080] border-b-[#808080] p-3", className)}>{children}</div>
}

// ------------------------------------------------------------ IP address box

/** The four-box IP control: type digits, "." jumps to the next box. */
function IpBox({
  value,
  disabled,
  label,
  onChange,
  onCommit,
}: {
  value: string
  disabled?: boolean
  label: string
  onChange: (v: string) => void
  onCommit: (v: string) => void
}) {
  const parts = value ? value.split(".") : ["", "", "", ""]
  while (parts.length < 4) parts.push("")
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const join = (p: string[]) => (p.every((x) => x === "") ? "" : p.join("."))
  const go = (i: number) => {
    const el = refs.current[i]
    if (el) {
      el.focus()
      el.select()
    }
  }
  return (
    <div
      className={cn("w98-sunken flex h-[21px] w-[150px] items-center px-1 font-mono text-[12px]", disabled && "!bg-[#c0c0c0] text-[#808080]")}
      aria-label={label}
      role="group"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) onCommit(value)
      }}
      onPaste={(e) => {
        const text = e.clipboardData.getData("text").trim()
        if (isIp(text)) {
          e.preventDefault()
          onChange(text)
        }
      }}
    >
      {parts.map((p, i) => (
        <span key={i} className="flex items-center">
          <input
            ref={(el) => {
              refs.current[i] = el
            }}
            aria-label={`${label} part ${i + 1}`}
            disabled={disabled}
            value={p}
            inputMode="numeric"
            className="w-[28px] bg-transparent text-center outline-none"
            onKeyDown={(e) => {
              e.stopPropagation()
              const el = e.currentTarget
              if ((e.key === "." || e.key === " ") && p !== "") {
                e.preventDefault()
                go(i + 1)
              } else if (e.key === "." || e.key === " ") {
                e.preventDefault()
              } else if (e.key === "Backspace" && p === "" && i > 0) {
                e.preventDefault()
                go(i - 1)
              } else if (e.key === "ArrowRight" && el.selectionStart === p.length && i < 3) {
                e.preventDefault()
                go(i + 1)
              } else if (e.key === "ArrowLeft" && el.selectionStart === 0 && i > 0) {
                e.preventDefault()
                go(i - 1)
              }
            }}
            onChange={(e) => {
              // Typed or pasted dots spill into the following boxes.
              const chunks = e.target.value.split(/[.\s]/)
              const next = [...parts]
              let at = i
              chunks.forEach((c, k) => {
                if (at > 3) return
                const digits = c.replace(/\D/g, "").slice(0, 3)
                next[at] = digits === "" ? (k === 0 ? "" : next[at]) : String(Math.min(255, Number(digits)))
                if (k < chunks.length - 1) at++
              })
              onChange(join(next))
              const last = Math.min(at, 3)
              if (last !== i) go(last)
              else if (next[i].length === 3 && i < 3) go(i + 1)
            }}
          />
          {i < 3 && <span>.</span>}
        </span>
      ))}
    </div>
  )
}

// ------------------------------------------------------------ media player

export function MediaPlayer({ video, onWatched }: { video: Video; onWatched: () => void }) {
  const src = `https://www.youtube-nocookie.com/embed/${video.youtube}${video.list ? `?list=${video.list}` : ""}`
  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="w98-sunken !bg-black p-[2px]">
        <iframe
          className="aspect-video w-full"
          src={src}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="flex-1 truncate font-bold">{video.title}</span>
        {video.list && (
          <a className="text-[#000080] underline" href={`https://www.youtube.com/playlist?list=${video.list}`} target="_blank" rel="noreferrer">
            Whole series ↗
          </a>
        )}
        <button className="w98-button" onClick={onWatched}>
          I watched it
        </button>
      </div>
    </div>
  )
}

// ------------------------------------------------------------ ncpa.cpl

const ADAPTERS = [
  { name: "Ethernet", device: "Creek Gigabit Network Adapter", icon: Monitor },
  { name: "Wi-Fi", device: "Creek Wireless AC 9560", icon: Wifi },
  { name: "Bluetooth Network Connection", device: "Bluetooth Device (Personal Area Network)", icon: Bluetooth },
]

export function NetworkConnections({ world, onProperties }: { world: World; onProperties: (adapter: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [menu, setMenu] = useState<{ adapter: string; x: number; y: number } | null>(null)
  const a = world.nic.address
  const working = !a.apipa && world.alive(world.nic.applied.gateway)
  const status = (name: string) => (name === "Ethernet" ? (working ? "Network" : "Unidentified network") : "Not connected")
  return (
    <div data-ncpa className="relative flex flex-col" onClick={() => setMenu(null)}>
      <div className="flex items-center gap-1 px-1 py-1">
        <span className="w98-sunken flex h-[22px] flex-1 items-center px-1.5 text-[11px]">
          Control Panel › Network and Internet › Network Connections
        </span>
      </div>
      <div className="flex gap-3 border-y border-y-[#808080] px-2 py-1 text-[11px]">
        <span>Organize ▾</span>
        <span className="text-[#808080]">Disable this network device</span>
        <span className="text-[#808080]">Diagnose this connection</span>
      </div>
      <div className="w98-sunken m-1 grid min-h-[170px] grid-cols-2 content-start gap-1 p-2">
        {ADAPTERS.map((ad) => {
          const Icon = ad.icon
          const on = selected === ad.name
          const down = ad.name !== "Ethernet"
          return (
            <button
              key={ad.name}
              className={cn("flex items-start gap-2 p-1.5 text-left", on && "bg-[#000080] text-white")}
              onClick={(e) => {
                e.stopPropagation()
                setSelected(ad.name)
                setMenu(null)
              }}
              onDoubleClick={() => onProperties(ad.name)}
              onContextMenu={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setSelected(ad.name)
                const box = e.currentTarget.closest("[data-ncpa]")!.getBoundingClientRect()
                setMenu({ adapter: ad.name, x: e.clientX - box.left, y: e.clientY - box.top })
              }}
            >
              <span className="relative mt-0.5">
                <Icon className="size-7" strokeWidth={1.4} />
                {down && <X className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-red-600 text-white" strokeWidth={3} />}
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block font-bold">{ad.name}</span>
                <span className={cn("block text-[11px]", !on && "text-[#404040]")}>{status(ad.name)}</span>
                <span className={cn("block truncate text-[11px]", !on && "text-[#404040]")}>{ad.device}</span>
              </span>
            </button>
          )
        })}
      </div>
      <div className="px-2 pb-1 text-[11px]">3 items{selected ? " · 1 item selected" : ""}</div>
      <div className="pointer-events-none absolute inset-0">
        {menu && (
          <ul className="w98-raised pointer-events-auto absolute w-44 p-[3px]" style={{ left: menu.x, top: menu.y }} role="menu">
            {["Disable", "Status", "Diagnose", "-", "Bridge Connections", "Create Shortcut", "Delete", "Rename", "-"].map((item, i) =>
              item === "-" ? (
                <li key={i} className="mx-1 my-1 border-t border-b border-t-[#808080] border-b-white" />
              ) : (
                <li key={item} className="px-4 py-0.5 text-[#808080]">
                  {item}
                </li>
              )
            )}
            <li>
              <button
                role="menuitem"
                className="w-full px-4 py-0.5 text-left font-bold hover:bg-[#000080] hover:text-white"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenu(null)
                  onProperties(menu.adapter)
                }}
              >
                Properties
              </button>
            </li>
          </ul>
        )}
      </div>
    </div>
  )
}

// ------------------------------------------------------------ Ethernet Properties

const ITEMS = [
  { name: "Client for Creekdows Networks", desc: "Lets this PC open files and printers on the network." },
  { name: "File and Printer Sharing", desc: "Lets other PCs open files and printers on this PC." },
  { name: "QoS Packet Scheduler", desc: "Controls network traffic priority." },
  { name: "Internet Protocol Version 4 (TCP/IPv4)", desc: "The protocol that carries most network traffic. Set the IP address here.", ipv4: true },
  { name: "Internet Protocol Version 6 (TCP/IPv6)", desc: "The newer IP protocol. Not used on this network." },
  { name: "Link-Layer Topology Discovery Responder", desc: "Lets this PC be found on the network map." },
]

export function AdapterProperties({
  blocked,
  onIpv4,
  onOk,
  onCancel,
}: {
  /** IPv4 Properties is open on top. */
  blocked: boolean
  onIpv4: () => void
  onOk: () => void
  onCancel: () => void
}) {
  const [sel, setSel] = useState(0)
  const item = ITEMS[sel]
  return (
    <div className={cn("flex flex-col", blocked && "pointer-events-none")}>
      <Tabs tabs={["Networking", "Sharing"]} />
      <Panel className="flex flex-col gap-2">
        <span>Connect using:</span>
        <div className="flex items-center gap-2">
          <span className="w98-sunken flex h-[24px] flex-1 items-center gap-1.5 px-1.5">
            <Monitor className="size-3.5" /> Creek Gigabit Network Adapter
          </span>
        </div>
        <div className="flex justify-end">
          <button className="w98-button text-[#808080]" tabIndex={-1}>
            Configure...
          </button>
        </div>
        <span>This connection uses the following items:</span>
        <ul className="w98-sunken h-[118px] overflow-y-auto p-0.5" role="listbox" aria-label="Items">
          {ITEMS.map((it, i) => (
            <li
              key={it.name}
              role="option"
              aria-selected={sel === i}
              className={cn("flex cursor-default items-center gap-1.5 px-1 py-px", sel === i && "bg-[#000080] text-white")}
              onClick={() => setSel(i)}
              onDoubleClick={() => it.ipv4 && onIpv4()}
            >
              <span className="flex size-3 shrink-0 items-center justify-center border border-[#808080] bg-white text-black">
                {i !== 4 && <Check className="size-2.5" strokeWidth={4} />}
              </span>
              <span className="truncate">{it.name}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between gap-1.5">
          <button className="w98-button text-[#808080]" tabIndex={-1}>
            Install...
          </button>
          <button className="w98-button text-[#808080]" tabIndex={-1}>
            Uninstall
          </button>
          <button className={cn("w98-button", !item.ipv4 && "text-[#808080]")} onClick={() => item.ipv4 && onIpv4()}>
            Properties
          </button>
        </div>
        <fieldset className="border border-[#808080] px-2 pb-2">
          <legend className="px-1">Description</legend>
          <p className="min-h-[30px] text-[11px]">{item.desc}</p>
        </fieldset>
      </Panel>
      <div className="flex justify-end gap-1.5 p-2">
        <button className="w98-button" onClick={onOk}>
          OK
        </button>
        <button className="w98-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

// ------------------------------------------------------------ IPv4 Properties

export function Ipv4Properties({
  world,
  onEvent,
  onOk,
  onCancel,
}: {
  world: World
  onEvent: (e: LabEvent) => void
  onOk: () => void
  onCancel: () => void
}) {
  const nic = world.nic
  const [s, setS] = useState<IpSettings>(() => ({ ...nic.openDraft() }))
  const [alert, setAlert] = useState<string | null>(null)

  const update = (patch: Partial<IpSettings>) => {
    const next = { ...s, ...patch }
    setS(next)
    if (nic.draft) Object.assign(nic.draft, next)
    return next
  }
  const field = (f: NicField, value: string, extra: { commit?: boolean; auto?: boolean } = {}) =>
    onEvent({ type: "nic-field", field: f, value, ...extra })

  const text = (f: "ip" | "mask" | "gateway" | "dns1" | "dns2") => ({
    value: s[f],
    onChange: (v: string) => {
      update({ [f]: v })
      field(f, v)
    },
    onCommit: (v: string) => {
      field(f, v, { commit: true })
      // Windows fills in the old class default mask when you leave the IP box.
      if (f === "ip" && isIp(v) && !s.mask) {
        const m = classfulMask(v)
        update({ ip: v, mask: m })
        field("mask", m, { auto: true })
      }
    },
  })

  const ok = () => {
    if (!s.dhcp) {
      if (!isIp(s.ip)) return setAlert("You must enter an IP address.")
      if (!isMask(s.mask)) return setAlert("The subnet mask entered is not valid. Please enter a valid subnet mask.")
      if (s.gateway && !isIp(s.gateway)) return setAlert("The default gateway entered is not valid.")
    }
    nic.saveDraft()
    onEvent({ type: "nic", stage: "pending", settings: { ...s } })
    onOk()
  }

  const row = (label: string, el: ReactNode, disabled: boolean) => (
    <label className={cn("flex items-center justify-between gap-2", disabled && "text-[#808080]")}>
      <span>{label}</span>
      {el}
    </label>
  )
  const radio = (checked: boolean, label: string, onPick: () => void, disabled = false) => (
    <label className={cn("flex items-center gap-1.5", disabled && "text-[#808080]")}>
      <input type="radio" checked={checked} disabled={disabled} onChange={onPick} className="accent-[#000080]" />
      {label}
    </label>
  )

  return (
    <div className="relative flex flex-col">
      <Tabs tabs={s.dhcp ? ["General", "Alternate Configuration"] : ["General"]} />
      <Panel className="flex flex-col gap-2.5">
        <p className="text-[11px] leading-snug">
          You can get IP settings assigned automatically if your network supports this capability. Otherwise, you need to ask your network
          administrator for the appropriate IP settings.
        </p>
        {radio(s.dhcp, "Obtain an IP address automatically", () => {
          update({ dhcp: true })
          field("dhcp", "true")
        })}
        <fieldset className="flex flex-col gap-1.5 border border-[#808080] px-2 pb-2">
          <legend className="px-1">
            {radio(!s.dhcp, "Use the following IP address:", () => {
              update({ dhcp: false, dnsAuto: false })
              field("dhcp", "false")
            })}
          </legend>
          {row("IP address:", <IpBox label="IP address" disabled={s.dhcp} {...text("ip")} />, s.dhcp)}
          {row("Subnet mask:", <IpBox label="Subnet mask" disabled={s.dhcp} {...text("mask")} />, s.dhcp)}
          {row("Default gateway:", <IpBox label="Default gateway" disabled={s.dhcp} {...text("gateway")} />, s.dhcp)}
        </fieldset>
        {radio(s.dnsAuto, "Obtain DNS server address automatically", () => {
          update({ dnsAuto: true })
          field("dnsAuto", "true")
        }, !s.dhcp)}
        <fieldset className="flex flex-col gap-1.5 border border-[#808080] px-2 pb-2">
          <legend className="px-1">
            {radio(!s.dnsAuto, "Use the following DNS server addresses:", () => {
              update({ dnsAuto: false })
              field("dnsAuto", "false")
            })}
          </legend>
          {row("Preferred DNS server:", <IpBox label="Preferred DNS server" disabled={s.dnsAuto} {...text("dns1")} />, s.dnsAuto)}
          {row("Alternate DNS server:", <IpBox label="Alternate DNS server" disabled={s.dnsAuto} {...text("dns2")} />, s.dnsAuto)}
        </fieldset>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-[#808080]">
            <input type="checkbox" disabled /> Validate settings upon exit
          </label>
          <button className="w98-button text-[#808080]" tabIndex={-1}>
            Advanced...
          </button>
        </div>
      </Panel>
      <div className="flex justify-end gap-1.5 p-2">
        <button className="w98-button" onClick={ok}>
          OK
        </button>
        <button
          className="w98-button"
          onClick={() => {
            nic.dropDraft()
            onCancel()
          }}
        >
          Cancel
        </button>
      </div>
      {alert && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
          <div className="w98-raised w-[300px] p-[3px]" role="alertdialog">
            <div className="w98-title flex h-[22px] items-center px-1.5">Creekdows TCP/IP</div>
            <div className="flex gap-3 p-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-red-600 font-bold text-white">×</span>
              <p>{alert}</p>
            </div>
            <div className="flex justify-center pb-3">
              <button className="w98-button" autoFocus onClick={() => setAlert(null)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
