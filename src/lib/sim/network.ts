import type { SwitchDevice } from "./switch-device"

/** The student's workstation. Same box for every section. */
export const WORKSTATION = {
  /** Event / topology id. */
  hostname: "workstation",
  /** What the PC calls itself. */
  computerName: "CREEK-PC",
  user: "student",
  ip: "10.1.1.12",
  mask: "255.255.255.0",
  prefix: 24,
  gateway: "10.1.1.1",
  mac: "02-42-0A-01-01-0C",
}

/** Everything a lab's shells need to know about the network around them. */
export interface World {
  /** Names the workstation can resolve (/etc/hosts). */
  hosts: Record<string, string>
  /** Managed devices, looked up by IP. */
  devices: SwitchDevice[]
  /** Does this address answer pings right now? */
  alive(ip: string): boolean
  /** Per-run scenario facts (e.g. which port the problem device is on). */
  vars: Record<string, string>
}

export function isIp(s: string) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(s) && s.split(".").every((o) => Number(o) <= 255)
}

export function resolve(world: World, name: string): string | undefined {
  if (isIp(name)) return name
  return world.hosts[name.toLowerCase()]
}

export function sameSubnet24(a: string, b: string) {
  return a.split(".").slice(0, 3).join(".") === b.split(".").slice(0, 3).join(".")
}

export function deviceAt(world: World, ip: string) {
  return world.devices.find((d) => d.cfg.ip === ip)
}
