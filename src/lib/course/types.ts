import type { World } from "@/lib/sim/network"
import type { HostName, LabEvent } from "@/lib/sim/types"

/** Lessons run in teach or help. The section quiz has its own mode. */
export type Mode = "teach" | "help" | "quiz"

export interface Objective {
  id: string
  title: string
  /** Teach mode: what Creeky says while this is the current step. Give shorthand and full command. */
  teach: string
  /** Help mode: progressively stronger hints. The last one names the command. */
  hints: string[]
  /** One line shown when the step is done. */
  why: string
  /** Only counts once every earlier objective in the lesson is done. */
  ordered?: boolean
  done: (event: LabEvent, world: World) => boolean
}

export interface BriefSection {
  heading: string
  points: string[]
  /** Optional terminal snippet. */
  example?: string
}

export interface DeviceInfo {
  name: string
  role: string
  platform: string
  mgmt: string
  access: string
  /** What this becomes when backed by ContainerLab. */
  future: string
}

export interface TopoNode {
  /** Matches the HostName in lab events, so the active node can light up. */
  id: HostName
  label: string
  sub: string
  ip: string
  icon: "pc" | "switch" | "panel"
}

export interface TopoLink {
  a?: string
  b?: string
  note?: string
}

/** The complaint that kicks off a section, told by Gus. */
export interface Ticket {
  from: string
  role: string
  /** What Gus says before the fix. */
  message: string
  /** Hard facts, as bullets. */
  facts: string[]
  /** What Gus says once it's fixed. */
  solved: string
}

export interface Lesson {
  id: string
  /** 1-based position in its section. */
  number: number
  title: string
  summary: string
  tags: string[]
  brief: BriefSection[]
  objectives: Objective[]
  /** The "aha" line when the lesson is done. Leads into the next lesson. */
  aha: string
  /** Lesson needs the command prompt already open. */
  needsCmd: boolean
  /** Terminal lines that complete this lesson. Used to fast-forward into later lessons. */
  solution: string[]
}

export interface Quiz {
  /** Par time in seconds. */
  par: number
  summary: string
  objectives: Objective[]
}

export interface Section {
  id: string
  number: number
  title: string
  summary: string
  ticket: Ticket
  network: string[]
  devices: DeviceInfo[]
  topology: { nodes: TopoNode[]; links: TopoLink[] }
  lessons: Lesson[]
  quiz: Quiz
  /** Quiz worlds may differ from lesson worlds (e.g. a different port). */
  createWorld: (opts?: { quiz?: boolean }) => World
  /** Teach-mode reactions to events, shared by every lesson. */
  react: (event: LabEvent, mode: Mode, world: World) => string | null
  /** Ticket is solved in this world. */
  solved: (world: World) => boolean
}

export interface LockedSection {
  id: string
  number: number
  title: string
  summary: string
  tags: string[]
  locked: true
}
