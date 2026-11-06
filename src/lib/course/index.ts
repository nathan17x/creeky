import { section0 } from "./section-0"
import { section1 } from "./section-1"
import type { CourseClass, Section } from "./types"

export const classes: CourseClass[] = [
  {
    id: "networking",
    title: "Networking",
    summary: "IPs, VLANs and switch command lines.",
    sections: [section0, section1],
    upcoming: [{ id: "ssh", title: "Turn on SSH", summary: "Set up SSH on CREEKY_EXT_9003 and turn telnet off." }],
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
