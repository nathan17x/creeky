import { Beaver } from "@/components/beaver"
import { CourseMap } from "@/components/course/course-map"

export default function Home() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-12">
      <section className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <div className="animate-bob">
          <Beaver size={112} />
        </div>
        <div>
          <h1 className="font-pixel text-xl leading-relaxed text-primary sm:text-2xl">Creeky network trainer</h1>
          <ul className="mt-3 list-disc pl-5 text-muted-foreground">
            <li>Networking basics for beginner broadcast engineers.</li>
            <li>Each section is one ticket from Gus.</li>
            <li>Lessons build up to the fix, then a quiz.</li>
            <li>Creeky the beaver guides you.</li>
          </ul>
        </div>
      </section>
      <CourseMap />
    </div>
  )
}
