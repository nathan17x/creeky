import { type Nic, inSubnet, isIp } from "./nic"
import type { SwitchDevice } from "./switch-device"

export { isIp }

/** The student's workstation. Same box for every section. */
export const WORKSTATION = {
  /** Event / topology id. */
  hostname: "workstation",
  /** What the PC calls itself. */
  computerName: "CREEK-PC",
  user: "student",
  /** The address the student sets in section 0. */
  ip: "10.1.1.199",
  mask: "255.255.255.0",
  prefix: 24,
  gateway: "10.1.1.1",
  dns1: "10.1.20.2",
  dns2: "8.8.8.8",
  mac: "02-42-0A-01-01-C7",
}

/** Everything a lab's shells need to know about the network around them. */
export interface World {
  /** Names the workstation can resolve (/etc/hosts). */
  hosts: Record<string, string>
  /** The workstation's network adapter. */
  nic: Nic
  /** Ask DNS for a name. Undefined = no answer. */
  dns?(name: string): string | undefined
  /** Managed devices, looked up by IP. */
  devices: SwitchDevice[]
  /** Does this address answer pings right now? */
  alive(ip: string): boolean
  /** Per-run scenario facts (e.g. which port the problem device is on). */
  vars: Record<string, string>
}

export function resolve(world: World, name: string): string | undefined {
  if (isIp(name)) return name
  return world.hosts[name.toLowerCase()] ?? world.dns?.(name.toLowerCase())
}

/** Can the PC even try to send to this address? False = no route (no gateway). */
export function routable(world: World, ip: string) {
  const a = world.nic.address
  return ip.startsWith("127.") || inSubnet(ip, a.ip, a.mask) || isIp(a.gateway)
}

export function deviceAt(world: World, ip: string) {
  return world.devices.find((d) => d.cfg.ip === ip)
}
