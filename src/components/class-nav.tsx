"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { classOf, classes, getSection } from "@/lib/course"
import { cn } from "@/lib/utils"

/** Top-level nav: one item per class. Lesson pages highlight their own class. */
export function ClassNav() {
  const path = usePathname()
  const [, root, id] = path.split("/")
  const section = root === "sections" ? getSection(id) : undefined
  const activeId = root === "classes" ? id : section ? classOf(section).id : path === "/" ? classes[0].id : undefined

  return (
    <nav className="flex items-center gap-4 text-sm text-muted-foreground">
      {classes.map((c) => (
        <Link
          key={c.id}
          href={`/classes/${c.id}`}
          aria-current={c.id === activeId ? "page" : undefined}
          className={cn("hover:text-foreground", c.id === activeId && "font-medium text-foreground")}
        >
          {c.title}
        </Link>
      ))}
    </nav>
  )
}
