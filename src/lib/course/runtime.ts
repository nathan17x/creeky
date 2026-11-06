import type { World } from "@/lib/sim/network"
import type { LabEvent } from "@/lib/sim/types"
import type { Bench } from "@/lib/wiring/bench"
import type { Lesson, Mode, Objective, Quiz, Section } from "./types"

/** An objective with its world baked in, so the runner doesn't care what kind of world it is. */
export type BoundObjective = Omit<Objective, "done"> & { done: (event: LabEvent) => boolean }

export interface Runtime {
  /** Narrow with section.kind: World for terminal sections, Bench for wiring. */
  world: World | Bench
  lesson: (idx: number) => BoundObjective[]
  quiz: BoundObjective[]
  react: (event: LabEvent, mode: Mode) => string | null
  solved: () => boolean
}

interface Parts<W> {
  lessons: Lesson<W>[]
  quiz: Quiz<W>
  react: (event: LabEvent, mode: Mode, world: W) => string | null
  solved: (world: W) => boolean
}

function bind<W>(objectives: Objective<W>[], world: W): BoundObjective[] {
  return objectives.map((o) => ({ ...o, done: (e: LabEvent) => o.done(e, world) }))
}

function make<W extends World | Bench>(s: Parts<W>, world: W): Runtime {
  const lessons = s.lessons.map((l) => bind(l.objectives, world))
  return {
    world,
    lesson: (idx) => lessons[idx],
    quiz: bind(s.quiz.objectives, world),
    react: (e, mode) => s.react(e, mode, world),
    solved: () => s.solved(world),
  }
}

export function createRuntime(section: Section, quiz: boolean): Runtime {
  if (section.kind === "terminal") return make(section, section.createWorld({ quiz }))
  return make(section, section.createWorld({ quiz }))
}
