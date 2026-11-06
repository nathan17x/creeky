import { CourseMap } from "@/components/course/course-map"
import { classes } from "@/lib/course"

export default function Home() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <CourseMap classId={classes[0].id} />
    </div>
  )
}
