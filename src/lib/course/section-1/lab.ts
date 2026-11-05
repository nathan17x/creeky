import { WORKSTATION, type World } from "@/lib/sim/network"
import { type Port, type SwitchConfig, SwitchDevice, shortName } from "@/lib/sim/switch-device"
import type { LabEvent } from "@/lib/sim/types"
import type { Mode } from "../types"

/** Section 1: router panel plugged into a Dante port on a field switch. */

export const PASSWORD = "Creeky"

export const PANEL = {
  name: "Router panel",
  ip: "10.1.14.203",
  vlan: 114,
  mac: "001d.c1a4.0cb3",
}

export const WRONG_VLAN = 112
/** Where the panel is plugged in during the lessons. The quiz picks another port. */
export const PANEL_PORT = "GigabitEthernet1/0/11"
export const PANEL_PORT_SHORT = shortName(PANEL_PORT)
/** How people type it. */
export const PORT_TYPED = "gi1/0/11"

/** The panel's port in this world. */
export const portOf = (w: World) => w.vars.panelPort
const typed = (name: string) => name.replace("GigabitEthernet", "gi")
export const LABEL = "ROUTER"

function makePorts(panelPort: string): Port[] {
  return Array.from({ length: 16 }, (_, i) => {
    const name = `GigabitEthernet1/0/${i + 1}`
    const plugged = name === panelPort
    return { name, description: "DANTE", vlan: WRONG_VLAN, shutdown: false, link: plugged, mac: plugged ? PANEL.mac : undefined }
  })
}

export const SWITCH: SwitchConfig = {
  hostname: "CREEKY_EXT_9003",
  model: "C1000-16P",
  version: "15.2(7)E9",
  image: "c1000-universalk9-mz.152-7.E9.bin",
  ip: "10.1.69.203",
  mask: "255.255.255.0",
  mgmtVlan: 69,
  gateway: "10.1.69.1",
  username: "admin",
  password: PASSWORD,
  enableSecret: PASSWORD,
  telnet: true,
  ssh: false,
  banner: "CREEKY_EXT_9003 - field switch - authorized users only",
  vlans: { 1: "default", 69: "MGMT", 112: "DANTE", 114: "ROUTERS" },
  ports: makePorts(PANEL_PORT),
}

export function createWorld(opts: { quiz?: boolean } = {}): World {
  let panelPort = PANEL_PORT
  if (opts.quiz) {
    // Any port but the lesson one, so the quiz can't be done from memory.
    const others = Array.from({ length: 16 }, (_, i) => `GigabitEthernet1/0/${i + 1}`).filter((n) => n !== PANEL_PORT)
    panelPort = others[Math.floor(Math.random() * others.length)]
  }
  const sw = new SwitchDevice({ ...SWITCH, ports: makePorts(panelPort) })
  const gateways = [WORKSTATION.gateway, SWITCH.gateway, "10.1.14.1", "10.1.12.1"]
  return {
    hosts: { localhost: "127.0.0.1", creeky_ext_9003: SWITCH.ip },
    devices: [sw],
    vars: { panelPort },
    alive(ip) {
      if (ip === WORKSTATION.ip || ip === SWITCH.ip || gateways.includes(ip)) return true
      if (ip === PANEL.ip) return panelUp(sw, panelPort)
      return false
    },
  }
}

function panelUp(sw: SwitchDevice, panelPort: string) {
  const p = sw.port(panelPort)!
  return sw.up(p) && p.vlan === PANEL.vlan
}

export function solved(world: World) {
  const sw = world.devices[0]
  const port = portOf(world)
  return panelUp(sw, port) && sw.port(port)!.description === LABEL
}

// ------------------------------------------------------------ predicates

const H = SWITCH.hostname
export const is = {
  runDialog: (e: LabEvent) => e.type === "run-dialog",
  cmdOpen: (e: LabEvent) => e.type === "cmd-open",
  pingedPanel: (e: LabEvent) => e.type === "ping" && e.host === WORKSTATION.hostname && e.target === PANEL.ip,
  panelUp: (e: LabEvent) => e.type === "ping" && e.host === WORKSTATION.hostname && e.target === PANEL.ip && e.success,
  switchUp: (e: LabEvent) => e.type === "ping" && e.host === WORKSTATION.hostname && e.target === SWITCH.ip && e.success,
  telnetOpen: (e: LabEvent) => e.type === "connect" && e.proto === "telnet" && e.target === SWITCH.ip && e.result === "open",
  loggedIn: (e: LabEvent) => e.type === "login" && e.host === H && e.success,
  enabled: (e: LabEvent) => e.type === "enable" && e.host === H && e.success,
  intStatus: (e: LabEvent) => e.type === "command" && e.host === H && e.ok && e.canonical === "show interfaces status",
  showRun: (e: LabEvent) => e.type === "command" && e.host === H && e.ok && e.canonical === "show running-config",
  inspectedPort: (e: LabEvent, w: World) => e.type === "inspect" && e.name === portOf(w),
  configMode: (e: LabEvent) => e.type === "config-mode" && e.entered,
  onPort: (e: LabEvent, w: World) => e.type === "interface-mode" && e.name === portOf(w),
  vlanFixed: (e: LabEvent, w: World) => e.type === "interface" && e.name === portOf(w) && e.vlan === PANEL.vlan,
  labeled: (e: LabEvent, w: World) => e.type === "interface" && e.name === portOf(w) && e.description === LABEL,
  configExit: (e: LabEvent) => e.type === "config-mode" && !e.entered,
  saved: (e: LabEvent) => e.type === "save",
  loggedOut: (e: LabEvent) => e.type === "logout" && e.host === H,
}

/** Teach-mode reactions shared by every lesson in the section. */
export function react(e: LabEvent, mode: Mode, world: World): string | null {
  if (mode !== "teach") return null
  const port = portOf(world)
  switch (e.type) {
    case "run":
      return e.ok ? null : "Type **cmd** in the Run box, then press Enter."
    case "cmd-closed":
      return "Closed the window. Click **Start**, **Run…**, and run **cmd** to get it back."
    case "connect":
      if (e.target === SWITCH.ip && e.proto === "ssh") return `This switch only takes telnet. Type **telnet ${SWITCH.ip}**.`
      if (e.result !== "open") return `Nothing there. The switch is **${SWITCH.ip}**.`
      return null
    case "login":
      return e.success ? null : `Username **${SWITCH.username}**, password **${PASSWORD}** (capital C).`
    case "enable":
      return e.success ? null : `Enable password is **${PASSWORD}** (capital C).`
    case "inspect":
      if (e.name === port) return null
      return `${shortName(e.name)} has nothing plugged in. Find the one that says **connected**.`
    case "interface-mode":
      return e.name === port ? null : `Wrong port. The panel is on the **connected** one: **int ${typed(port)}**.`
    case "interface":
      if (e.name !== port) return `That changed ${shortName(e.name)}, not the panel's port.`
      if (e.vlan !== PANEL.vlan && e.vlan !== WRONG_VLAN) return `Wrong VLAN. The panel is 10.1.14.x, which is VLAN **${PANEL.vlan}**.`
      if (e.shutdown) return "Port is shut down. Type **no shut** (**no shutdown**)."
      if (e.description && e.description !== LABEL && e.description !== "DANTE") return `Label must be exactly **${LABEL}**, all caps.`
      return null
    case "ping":
      if (e.target === PANEL.ip || e.success) return null
      return "No reply. Check the address in Gus's ticket."
    case "command":
      if (e.ok) return null
      if (e.host === WORKSTATION.hostname && /^(en|enable|sh|show|conf|int)\b/i.test(e.line)) return "That's a switch command. Telnet to the switch first."
      if (e.host === H && /^sh\w*\s+ru/i.test(e.line)) return "**sh run** needs **en** (**enable**) first."
      if (e.host === H && !e.privileged && /^(conf|int|sw|desc)/i.test(e.line)) return "Config commands need **en** (**enable**), then **conf t** (**configure terminal**)."
      if (e.host === H && /^(sw|desc|shu)/i.test(e.line)) return `Port commands go in **(config-if)#**. Type **int ${typed(port)}** first.`
      if (e.host === H && e.error === "incomplete") return "Needs more words. Type a space then **?** to see options."
      if (e.host === H && e.error === "ambiguous") return "Abbreviation matches more than one command. Add a letter."
      if (e.host === H && e.error === "unknown") return "Not a command. Press **?** to list commands."
      if (e.host === H) return "The **^** marks where the switch got lost. Try **?**."
      return null
    default:
      return null
  }
}
