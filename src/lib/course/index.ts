import { section1 } from "./section-1"
import type { CourseClass, Section } from "./types"
import { wiringCcu } from "./wiring-ccu"

export const classes: CourseClass[] = [
  {
    id: "networking",
    title: "Networking",
    summary: "IPs, VLANs and switch command lines.",
    sections: [section1],
    upcoming: [{ id: "ssh", title: "Turn on SSH", summary: "Set up SSH on CREEKY_EXT_9003 and turn telnet off." }],
  },
  {
    id: "wiring",
    title: "Wiring",
    summary: "Connectors, cables and signal flow.",
    sections: [wiringCcu],
    upcoming: [
      { id: "replay", title: "Replay server", summary: "Wire video ins and outs on an EVS replay server." },
      { id: "gfx", title: "Graphics", summary: "Fill and key from a Chyron graphics system." },
    ],
  },
]

export const sections: Section[] = classes.flatMap((c) => c.sections)

export function getSection(id: string) {
  return sections.find((s) => s.id === id)
}

export function classOf(section: Section) {
  return classes.find((c) => c.sections.includes(section))!
}

export const lessonCode = (section: Section, n: number) => `${section.number}.${n}`

/** URL part for a lesson ("1".."n") or the quiz. */
export type Part = number | "quiz"

export function partHref(section: Section, part: Part) {
  return `/sections/${section.id}/${part}`
}
