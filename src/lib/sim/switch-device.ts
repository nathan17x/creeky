export interface Port {
  /** Full name, e.g. GigabitEthernet1/0/11 */
  name: string
  description: string
  vlan: number
  shutdown: boolean
  /** Something is plugged in and has link. */
  link: boolean
  /** MAC learned on the port when it's up. */
  mac?: string
}

export interface SwitchConfig {
  hostname: string
  model: string
  version: string
  image: string
  ip: string
  mask: string
  mgmtVlan: number
  gateway: string
  username: string
  password: string
  enableSecret: string
  telnet: boolean
  ssh: boolean
  fingerprint?: string
  /** Login banner (motd). */
  banner: string
  vlans: Record<number, string>
  ports: Port[]
}

/** Live state of one simulated switch. Shared by every session into it. */
export class SwitchDevice {
  readonly cfg: SwitchConfig
  ports: Port[]
  vlans: Record<number, string>
  /** Running config differs from startup. */
  dirty = false

  constructor(cfg: SwitchConfig) {
    this.cfg = cfg
    this.ports = cfg.ports.map((p) => ({ ...p }))
    this.vlans = { ...cfg.vlans }
  }

  get hostname() {
    return this.cfg.hostname
  }

  port(name: string) {
    return this.ports.find((p) => p.name === name)
  }

  /** Port is up/up: cable in and not shut. */
  up(p: Port) {
    return p.link && !p.shutdown
  }

  /**
   * Accepts the forms IOS accepts: gi1/0/11, g 1/0/11, GigabitEthernet1/0/11,
   * vlan69, vl 69. Returns the full name or undefined.
   */
  parseInterface(raw: string): string | undefined {
    const s = raw.replace(/\s+/g, "").toLowerCase()
    const m = /^([a-z]+)([\d/]+)$/.exec(s)
    if (!m) return undefined
    const [, kind, num] = m
    if ("gigabitethernet".startsWith(kind)) {
      const name = `GigabitEthernet${num}`
      return this.port(name) ? name : undefined
    }
    if ("vlan".startsWith(kind) && kind.length >= 2 && /^\d+$/.test(num)) return `Vlan${num}`
    return undefined
  }
}

export function shortName(name: string) {
  return name.replace("GigabitEthernet", "Gi")
}
