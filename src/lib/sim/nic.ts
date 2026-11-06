/** The workstation's network adapter, as set in its IPv4 Properties dialog. */

export interface IpSettings {
  /** Obtain an IP address automatically. */
  dhcp: boolean
  ip: string
  mask: string
  gateway: string
  /** Obtain DNS server address automatically. */
  dnsAuto: boolean
  dns1: string
  dns2: string
}

export const DHCP_DEFAULT: IpSettings = { dhcp: true, ip: "", mask: "", gateway: "", dnsAuto: true, dns1: "", dns2: "" }

/** What the adapter is actually using right now. */
export interface Address {
  ip: string
  mask: string
  gateway: string
  dns: string[]
  /** DHCP found no server: Windows picked a 169.254.x.x address. */
  apipa: boolean
}

const APIPA = "169.254.83.107"

/**
 * Three layers, like Windows: the IPv4 dialog edits `draft`, its OK stores
 * `pending`, and the adapter Properties OK makes it `applied`.
 */
export class Nic {
  applied: IpSettings
  pending: IpSettings | null = null
  draft: IpSettings | null = null

  constructor(
    initial: IpSettings,
    /** Address handed out by DHCP, if a DHCP server exists. */
    private dhcpLease?: Omit<Address, "apipa">
  ) {
    this.applied = { ...initial }
  }

  /** Opening IPv4 Properties: start from what's pending or applied. */
  openDraft() {
    if (!this.draft) this.draft = { ...(this.pending ?? this.applied) }
    return this.draft
  }
  saveDraft() {
    if (this.draft) this.pending = this.draft
    this.draft = null
  }
  dropDraft() {
    this.draft = null
  }
  /** Adapter Properties OK. */
  apply() {
    if (this.pending) this.applied = this.pending
    this.pending = null
    this.draft = null
  }
  /** Adapter Properties Cancel. */
  discard() {
    this.pending = null
    this.draft = null
  }

  get address(): Address {
    const s = this.applied
    if (s.dhcp) {
      if (this.dhcpLease) return { ...this.dhcpLease, apipa: false }
      return { ip: APIPA, mask: "255.255.0.0", gateway: "", dns: [], apipa: true }
    }
    return { ip: s.ip, mask: s.mask, gateway: s.gateway, dns: [s.dns1, s.dns2].filter(isIp), apipa: false }
  }
}

export function isIp(s: string) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(s) && s.split(".").every((o) => Number(o) <= 255)
}

const toInt = (ip: string) => ip.split(".").reduce((n, o) => (n << 8) + Number(o), 0) >>> 0

/** Contiguous ones, like 255.255.255.0. */
export function isMask(s: string) {
  if (!isIp(s)) return false
  const n = toInt(s)
  const inv = ~n >>> 0
  return n !== 0 && (inv & (inv + 1)) === 0
}

export function prefixOf(mask: string) {
  return toInt(mask).toString(2).replace(/0/g, "").length
}

export function inSubnet(a: string, b: string, mask: string) {
  if (!isIp(a) || !isIp(b) || !isMask(mask)) return false
  const m = toInt(mask)
  return (toInt(a) & m) === (toInt(b) & m)
}

/** What Windows fills in when you tab past the IP with no mask: the old class default. */
export function classfulMask(ip: string) {
  const first = Number(ip.split(".")[0])
  if (first < 128) return "255.0.0.0"
  if (first < 192) return "255.255.0.0"
  return "255.255.255.0"
}
