import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { SectionRunner } from "@/components/lab/section-runner"
import { type Part, getSection, lessonCode, sections } from "@/lib/course"

type Params = PageProps<"/sections/[id]/[part]">["params"]

export function generateStaticParams() {
  return sections.flatMap((s) => [...s.lessons.map((l) => ({ id: s.id, part: String(l.number) })), { id: s.id, part: "quiz" }])
}

function parse(id: string, raw: string): { part: Part } | undefined {
  const section = getSection(id)
  if (!section) return undefined
  if (raw === "quiz") return { part: "quiz" }
  const n = Number(raw)
  return Number.isInteger(n) && n >= 1 && n <= section.lessons.length ? { part: n } : undefined
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id, part } = await params
  const section = getSection(id)
  const p = parse(id, part)
  if (!section || !p) return { title: "Creeky" }
  const label = p.part === "quiz" ? `Section ${section.number} quiz` : `${lessonCode(section, p.part)} ${section.lessons[p.part - 1].title}`
  return { title: `${label} · Creeky` }
}

async function Runner({ params }: { params: Params }) {
  const { id, part } = await params
  const p = parse(id, part)
  if (!p) notFound()
  return <SectionRunner sectionId={id} part={p.part} />
}

export default function SectionPartPage({ params }: { params: Params }) {
  return (
    <Suspense>
      <Runner params={params} />
    </Suspense>
  )
}
