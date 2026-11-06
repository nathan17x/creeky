/**
 * A workbench of gear and cables. Devices have typed ports, cables have
 * typed ends, and signal flows from sources through converters to displays.
 */

export type Connector = "hdmi" | "bnc" | "dc" | "ac" | "iec" | "xlr" | "fiber" | "rcp" | "trunk" | "rj45" | "dsub"

/** What a jack carries. An input only locks onto an output of the same kind. */
export type Signal = "video" | "ref" | "control" | "audio" | "return" | "prompter" | "aux"

export const SIGNAL_NAME: Record<Signal, string> = {
  video: "video",
  ref: "reference",
  control: "control",
  audio: "audio",
  return: "return video",
  prompter: "prompter video",
  aux: "something else",
}

/** out/in carry signal. power takes power from an outlet. */
export type PortRole = "out" | "in" | "power" | "outlet"

export const CONNECTOR_NAME: Record<Connector, string> = {
  hdmi: "HDMI",
  bnc: "BNC (SDI)",
  dc: "12V DC barrel",
  ac: "wall plug",
  iec: "IEC power",
  xlr: "XLR",
  fiber: "SMPTE fiber",
  rcp: "RCP 8-pin",
  trunk: "TRUNK multi-pin",
  rj45: "RJ-45 network",
  dsub: "D-sub",
}

export interface PortDef {
  id: string
  label: string
  connector: Connector
  role: PortRole
  /** Where the jack is drawn on a panel device, in the panel's own units. */
  pos?: { x: number; y: number }
  /** Hit radius in panel units. */
  r?: number
  /** What it carries (in/out jacks). Default video. */
  signal?: Signal
}

/**
 * source: outputs always live (laptop, sync generator).
 * camera: outputs live once powered over fiber from a converter (CCU).
 * converter: needs power; video/audio outs live when a video input locks, control outs live when powered.
 * display: picture when a video input locks; loop outs pass it on.
 * control: a panel that comes online when its control input locks.
 */
export type DeviceKind = "source" | "camera" | "converter" | "display" | "control" | "power"

/** A status light. `when`: "power", "picture", "locked:<port>[|<port>]" or "live:<port>[|<port>]". */
export interface LedDef {
  label: string
  color: string
  when: string
}

export interface DeviceDef {
  id: string
  label: string
  sub: string
  kind: DeviceKind
  /** Look on the bench. "hdcu5500" is a drawn rear panel; the rest are status tiles. */
  look: "hdcu5500" | "camera" | "monitor" | "sync" | "rcp" | "console" | "strip"
  /** Set for the device whose rear panel fills the bench: its drawing size in panel units. */
  panel?: { w: number; h: number }
  ports: PortDef[]
  leds?: LedDef[]
}

export interface CableDef {
  id: string
  label: string
  /** What plugs into each end. */
  ends: [Connector, Connector]
  color: string
  /** One-line description for the bin. */
  note: string
}

/**
 * A labelled cable in the tray. One end is already plugged into `from`; the
 * student drags the label to the jack the other end goes into.
 * No `from` = a decoy that doesn't belong on this bench.
 */
export interface CableLabel {
  id: string
  cable: string
  text: string
  from?: string
}

export interface BenchScene {
  devices: DeviceDef[]
  cables: CableDef[]
  labels: CableLabel[]
}

export interface Connection {
  id: number
  cable: string
  /** Which tray label made this connection. */
  label?: string
  /** Port keys, "device.port". */
  a: string
  b: string
}

export type PlugProblem = "connector" | "occupied" | "same"

/** How a finished cable runs: out→in is right; anything else carries nothing. */
export type Direction = "ok" | "in-in" | "out-out" | "no-power" | "mixed"

export interface BenchStatus {
  /** Device has power. */
  powered: Set<string>
  /** Output ports carrying a signal. */
  live: Set<string>
  /** Input ports receiving a signal. */
  locked: Set<string>
  /** Displays showing a picture. */
  picture: Set<string>
}

export const portKey = (device: string, port: string) => `${device}.${port}`

export class Bench {
  connections: Connection[] = []
  private nextId = 1

  constructor(readonly scene: BenchScene) {}

  device(id: string) {
    return this.scene.devices.find((d) => d.id === id)
  }

  cable(id: string) {
    return this.scene.cables.find((c) => c.id === id)
  }

  port(key: string) {
    const [d, p] = key.split(".")
    const device = this.device(d)
    const port = device?.ports.find((x) => x.id === p)
    return device && port ? { device, port } : undefined
  }

  at(key: string) {
    return this.connections.find((c) => c.a === key || c.b === key)
  }

  /** Can this cable's free end go into this port? `used` is the connector already plugged in, if any. */
  fits(cableId: string, key: string, used?: Connector): PlugProblem | null {
    const cable = this.cable(cableId)
    const p = this.port(key)
    if (!cable || !p) return "connector"
    if (this.at(key)) return "occupied"
    const free = used ? [cable.ends[cable.ends.indexOf(used) === 0 ? 1 : 0]] : cable.ends
    return free.includes(p.port.connector) ? null : "connector"
  }

  direction(a: string, b: string): Direction {
    const ra = this.port(a)!.port.role
    const rb = this.port(b)!.port.role
    const pair = [ra, rb].sort().join("-")
    if (pair === "in-out" || pair === "outlet-power") return "ok"
    if (pair === "in-in") return "in-in"
    if (pair === "out-out") return "out-out"
    if (ra === "outlet" || rb === "outlet" || ra === "power" || rb === "power") return "no-power"
    return "mixed"
  }

  connect(cable: string, a: string, b: string, label?: string): Connection {
    const c = { id: this.nextId++, cable, a, b, label }
    this.connections.push(c)
    return c
  }

  remove(id: number) {
    const c = this.connections.find((x) => x.id === id)
    this.connections = this.connections.filter((x) => x.id !== id)
    return c
  }

  /** Where this tray label is plugged in, if anywhere. */
  placed(labelId: string) {
    return this.connections.find((c) => c.label === labelId)
  }

  /** Port at the other end of whatever is plugged in here. */
  peer(key: string) {
    const c = this.at(key)
    if (!c) return undefined
    return c.a === key ? c.b : c.a
  }

  /** A cable of this kind runs between these two ports (either way round). */
  linked(a: string, b: string, cable?: string) {
    return this.connections.some((c) => ((c.a === a && c.b === b) || (c.a === b && c.b === a)) && (!cable || c.cable === cable))
  }

  /** Apply a fast-forward line: "cable:portA>portB". */
  apply(line: string) {
    const m = /^([\w-]+):([\w.-]+)>([\w.-]+)$/.exec(line)
    if (!m || this.at(m[2]) || this.at(m[3])) return
    const label = this.scene.labels.find((l) => l.cable === m[1] && l.from === m[2])
    this.connect(m[1], m[2], m[3], label?.id)
  }

  signalOf(key: string): Signal {
    return this.port(key)?.port.signal ?? "video"
  }

  status(): BenchStatus {
    const powered = new Set<string>()
    const live = new Set<string>()
    const locked = new Set<string>()
    const picture = new Set<string>()
    const keys = (d: DeviceDef, role: PortRole) => d.ports.filter((p) => p.role === role).map((p) => portKey(d.id, p.id))
    const devices = this.scene.devices

    // Mains power first: a device with power jacks needs one fed from an outlet.
    for (const d of devices) {
      if (d.kind === "camera") continue
      const needs = keys(d, "power")
      const fed = needs.some((k) => {
        const other = this.peer(k)
        return other !== undefined && this.port(other)?.port.role === "outlet"
      })
      if (needs.length === 0 || fed) powered.add(d.id)
    }
    // Cameras are powered down the fiber by a powered CCU.
    for (const d of devices.filter((x) => x.kind === "camera")) {
      const fed = d.ports.some((p) => {
        if (p.connector !== "fiber") return false
        const other = this.peer(portKey(d.id, p.id))
        const dev = other ? this.port(other)?.device : undefined
        return dev !== undefined && dev.kind === "converter" && powered.has(dev.id)
      })
      if (fed) powered.add(d.id)
    }
    for (const d of devices) {
      if (d.kind === "source" || (d.kind === "camera" && powered.has(d.id))) keys(d, "out").forEach((k) => live.add(k))
      if (d.kind === "converter" && powered.has(d.id)) {
        for (const k of keys(d, "out")) if (this.signalOf(k) === "control") live.add(k)
      }
    }

    // Propagate until nothing changes.
    for (let changed = true; changed; ) {
      changed = false
      const set = (s: Set<string>, k: string) => {
        if (!s.has(k)) {
          s.add(k)
          changed = true
        }
      }
      for (const d of devices) {
        if (!powered.has(d.id)) continue
        for (const k of keys(d, "in")) {
          const src = this.peer(k)
          if (src && live.has(src) && this.signalOf(src) === this.signalOf(k)) set(locked, k)
        }
        const videoIn = keys(d, "in").some((k) => locked.has(k) && this.signalOf(k) === "video")
        if (!videoIn) continue
        if (d.kind === "display") picture.add(d.id)
        if (d.kind === "converter" || d.kind === "display") {
          for (const k of keys(d, "out")) if (["video", "audio"].includes(this.signalOf(k))) set(live, k)
        }
      }
    }
    return { powered, live, locked, picture }
  }

  /** Evaluate a LedDef.when against a status. */
  lit(device: DeviceDef, when: string, st: BenchStatus) {
    if (when === "power") return st.powered.has(device.id)
    if (when === "picture") return st.picture.has(device.id)
    const [what, ports] = when.split(":")
    const set = what === "locked" ? st.locked : what === "live" ? st.live : undefined
    return !!set && ports.split("|").some((p) => set.has(portKey(device.id, p)))
  }
}
