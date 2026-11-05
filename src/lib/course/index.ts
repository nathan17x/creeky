import { section1 } from "./section-1"
import type { LockedSection, Section } from "./types"

export const sections: Section[] = [section1]

export const upcoming: LockedSection[] = [
  { id: "ssh", number: 2, title: "Turn on SSH", summary: "Set up SSH on CREEKY_EXT_9003 and turn telnet off.", tags: ["SSH"], locked: true },
  { id: "eos", number: 3, title: "Arista EOS", summary: "Same kind of job on an Arista switch.", tags: ["Arista EOS"], locked: true },
]

export function getSection(id: string) {
  return sections.find((s) => s.id === id)
}

export const lessonCode = (section: Section, n: number) => `${section.number}.${n}`

/** URL part for a lesson ("1".."n") or the quiz. */
export type Part = number | "quiz"

export function partHref(section: Section, part: Part) {
  return `/sections/${section.id}/${part}`
}
