import { WORKSTATION, type World } from "@/lib/sim/network"
import { DHCP_DEFAULT, type IpSettings, Nic, inSubnet, isIp, isMask } from "@/lib/sim/nic"
import type { LabEvent } from "@/lib/sim/types"
import type { Mode } from "../types"

/** Section 0: the PC has no address. Set IP, gateway, mask and DNS by hand. */

export const PC = {
  ip: WORKSTATION.ip,
  mask: WORKSTATION.mask,
  prefix: WORKSTATION.prefix,
  gateway: WORKSTATION.gateway,
  dns1: WORKSTATION.dns1,
  dns2: WORKSTATION.dns2,
}
/** What Windows fills in for a 10.x address. */
export const GUESSED_MASK = "255.0.0.0"
export const INTERNET = "8.8.8.8"
export const NAME = "google.com"
const GOOGLE = "142.250.80.46"

/** The real LAN the PC's cable is plugged into. */
const LAN = { net: "10.1.1.0", mask: "255.255.255.0" }
const LAN_HOSTS = [PC.gateway, "10.1.1.12", "10.1.1.20"]
/** Reachable through the gateway. */
const REMOTE_HOSTS = [PC.dns1, INTERNET, "1.1.1.1", GOOGLE]
const DNS_SERVERS = [PC.dns1, INTERNET, "1.1.1.1"]
const DNS_TABLE: Record<string, string> = {
  "google.com": GOOGLE,
  "www.google.com": GOOGLE,
  "maps.google.com": GOOGLE,
}

export function createWorld(): World {
  // DHCP is on, but nothing on this network hands out addresses.
  const nic = new Nic(DHCP_DEFAULT)
  const onLan = (ip: string) => inSubnet(ip, LAN.net, LAN.mask)

  function alive(ip: string): boolean {
    const a = nic.address
    if (a.apipa || !isIp(a.ip) || !isMask(a.mask)) return false
    // Off the real LAN, or clashing with something already on it.
    if (!onLan(a.ip) || LAN_HOSTS.includes(a.ip)) return false
    if (inSubnet(ip, a.ip, a.mask)) return onLan(ip) && LAN_HOSTS.includes(ip)
    // Not local: it has to go via a gateway that is really there.
    if (a.gateway !== PC.gateway || !inSubnet(a.gateway, a.ip, a.mask)) return false
    return REMOTE_HOSTS.includes(ip)
  }

  return {
    hosts: { localhost: "127.0.0.1" },
    nic,
    devices: [],
    vars: {},
    alive,
    dns(name) {
      if (!nic.address.dns.some((d) => DNS_SERVERS.includes(d) && alive(d))) return undefined
      return DNS_TABLE[name]
    },
  }
}

export function solved(world: World) {
  return !!world.dns?.(NAME) && world.alive(GOOGLE)
}

// ------------------------------------------------------------ predicates

const good = (s: IpSettings, dns = false) =>
  !s.dhcp && s.ip === PC.ip && s.mask === PC.mask && s.gateway === PC.gateway && (!dns || (s.dns1 === PC.dns1 && s.dns2 === PC.dns2))

const field = (e: LabEvent, name: string, value: string) => e.type === "nic-field" && e.field === name && e.value === value
const W = WORKSTATION.hostname

export const is = {
  watched: (e: LabEvent) => e.type === "watched",
  runDialog: (e: LabEvent) => e.type === "run-dialog",
  ncpa: (e: LabEvent) => e.type === "run" && e.ok && /ncpa|netconnections/i.test(e.command),
  adapterProps: (e: LabEvent) => e.type === "window" && e.name === "adapter" && e.open && e.adapter === "Ethernet",
  ipv4Props: (e: LabEvent) => e.type === "window" && e.name === "ipv4" && e.open,
  staticIp: (e: LabEvent) => field(e, "dhcp", "false"),
  ip: (e: LabEvent) => field(e, "ip", PC.ip),
  gateway: (e: LabEvent) => field(e, "gateway", PC.gateway),
  mask: (e: LabEvent) => field(e, "mask", PC.mask),
  dns1: (e: LabEvent) => field(e, "dns1", PC.dns1),
  dns2: (e: LabEvent) => field(e, "dns2", PC.dns2),
  ipv4Ok: (e: LabEvent) => e.type === "nic" && e.stage === "pending" && good(e.settings),
  applied: (e: LabEvent) => e.type === "nic" && e.stage === "applied" && good(e.settings),
  appliedDns: (e: LabEvent) => e.type === "nic" && e.stage === "applied" && good(e.settings, true),
  cmdOpen: (e: LabEvent) => e.type === "cmd-open",
  pingGateway: (e: LabEvent) => e.type === "ping" && e.host === W && e.target === PC.gateway && e.success,
  pingInternet: (e: LabEvent) => e.type === "ping" && e.host === W && e.target === INTERNET && e.success,
  nameFails: (e: LabEvent) => e.type === "resolve" && e.name === NAME && !e.ip,
  pingName: (e: LabEvent) => e.type === "ping" && e.name === NAME && e.success,
}

/** Teach-mode reactions shared by every lesson in the section. */
export function react(e: LabEvent, mode: Mode, world: World): string | null {
  if (mode !== "teach") return null
  const a = world.nic.address
  switch (e.type) {
    case "run":
      return e.ok ? null : `Not a program. Network settings: **ncpa.cpl**. Command prompt: **cmd**.`
    case "window":
      if (e.name === "adapter" && e.adapter && e.adapter !== "Ethernet") return `That's ${e.adapter}. Your PC is on a cable: use **Ethernet**.`
      return null
    case "cmd-closed":
      return "Closed it. **Start**, **Run…**, **cmd** brings it back."
    case "nic-field":
      if (e.field === "mask" && e.auto) return `Windows guessed the mask **${e.value}**. Wrong for this network. Leave it for now.`
      if (!e.commit || !e.value) return null
      if (e.field === "ip" && e.value !== PC.ip) return `Use **${PC.ip}**, the free address in Dot's ticket.`
      if (e.field === "gateway" && e.value !== PC.gateway) return `Gateway is **${PC.gateway}**.`
      if (e.field === "mask" && e.value !== PC.mask && e.value !== GUESSED_MASK) return `Mask is **${PC.mask}** (/24).`
      if (e.field === "dns1" && e.value !== PC.dns1) return `Preferred DNS is **${PC.dns1}**.`
      if (e.field === "dns2" && e.value !== PC.dns2) return `Alternate DNS is **${PC.dns2}**.`
      return null
    case "nic":
      if (e.stage === "applied") return null
      if (e.settings.dhcp) return "Still on automatic. Pick **Use the following IP address**."
      return null
    case "ping":
      if (e.success) return null
      if (a.apipa) return "Your PC has a 169.254.x.x address. That means no address was handed out. It can't reach anything."
      if (!isIp(a.gateway)) return "General failure = no gateway. Your PC has no way off its own network."
      return "No reply. Check the IP, mask and gateway in IPv4 Properties."
    case "resolve":
      if (e.ip || !a.dns.length) return null
      return "Name lookup failed. Check the DNS server addresses."
    case "command":
      if (e.ok) return null
      if (/^(ipconfig|ping|cmd)/i.test(e.line)) return null
      return "Not a command here. Try **ping**."
    default:
      return null
  }
}
