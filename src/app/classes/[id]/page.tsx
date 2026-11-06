import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { CourseMap } from "@/components/course/course-map"
import { classes } from "@/lib/course"

type Params = PageProps<"/classes/[id]">["params"]

export function generateStaticParams() {
  return classes.map((c) => ({ id: c.id }))
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params
  const cls = classes.find((c) => c.id === id)
  return { title: cls ? `${cls.title} · Creeky` : "Creeky" }
}

async function ClassMap({ params }: { params: Params }) {
  const { id } = await params
  if (!classes.some((c) => c.id === id)) notFound()
  return <CourseMap classId={id} />
}

export default function ClassPage({ params }: { params: Params }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Suspense>
        <ClassMap params={params} />
      </Suspense>
    </div>
  )
}
