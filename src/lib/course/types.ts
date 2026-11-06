import type { World } from "@/lib/sim/network"
import type { HostName, LabEvent } from "@/lib/sim/types"
import type { Bench, BenchScene } from "@/lib/wiring/bench"

/** Lessons run in teach or help. The section quiz has its own mode. */
export type Mode = "teach" | "help" | "quiz"

/** W is the section's world: a network for terminal sections, a bench for wiring. */
export interface Objective<W = unknown> {
  id: string
  title: string
  /** Teach mode: what Creeky says while this is the current step. Give shorthand and full command. */
  teach: string
  /** Help mode: progressively stronger hints. The last one gives the answer. */
  hints: string[]
  /** One line shown when the step is done. */
  why: string
  /** Only counts once every earlier objective in the lesson is done. */
  ordered?: boolean
  done: (event: LabEvent, world: W) => boolean
}

export interface BriefSection {
  heading: string
  points: string[]
  /** Optional terminal snippet. */
  example?: string
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

export type Character = "gus" | "dot" | "ray"

/** The complaint that kicks off a section. */
export interface Ticket {
  from: string
  role: string
  /** Which beaver is complaining. */
  who: Character
  /** What they say before the fix. */
  message: string
  /** Hard facts, as bullets. */
  facts: string[]
  /** What they say once it's fixed. */
  solved: string
}

export interface Lesson<W = unknown> {
  id: string
  /** 1-based position in its section. */
  number: number
  title: string
  summary: string
  tags: string[]
  brief: BriefSection[]
  objectives: Objective<W>[]
  /** The "aha" line when the lesson is done. Leads into the next lesson. */
  aha: string
  /** Terminal sections: lesson needs the command prompt already open. */
  needsCmd?: boolean
  /**
   * What completes this lesson, used to fast-forward into later lessons.
   * Terminal: lines to type. Wiring: "cable:portA>portB" connections.
   */
  solution: string[]
}

export interface Quiz<W = unknown> {
  /** Par time in seconds. */
  par: number
  summary: string
  objectives: Objective<W>[]
}

interface SectionBase<W> {
  id: string
  number: number
  title: string
  summary: string
  ticket: Ticket
  lessons: Lesson<W>[]
  quiz: Quiz<W>
  /** Quiz worlds may differ from lesson worlds (e.g. a different port). */
  createWorld: (opts?: { quiz?: boolean }) => W
  /** Teach-mode reactions to events, shared by every lesson. */
  react: (event: LabEvent, mode: Mode, world: W) => string | null
  /** Ticket is solved in this world. */
  solved: (world: W) => boolean
}

/** Command-line work on a simulated network, from the Creekdows desktop. */
export interface TerminalSection extends SectionBase<World> {
  kind: "terminal"
  network: string[]
  topology: { nodes: TopoNode[]; links: TopoLink[] }
}

/** Cabling gear on a workbench. */
export interface WiringSection extends SectionBase<Bench> {
  kind: "wiring"
  scene: BenchScene
}

export type Section = TerminalSection | WiringSection

export interface LockedSection {
  id: string
  title: string
  summary: string
}

/** A subject: networking, wiring, ... */
export interface CourseClass {
  id: string
  title: string
  summary: string
  sections: Section[]
  upcoming: LockedSection[]
}
