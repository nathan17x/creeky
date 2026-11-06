"use client"

import { CheckCircle2, Lock, Play, Timer, Trophy } from "lucide-react"
import { useSyncExternalStore } from "react"
import { Beaver } from "@/components/beaver"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { classes, lessonCode, partHref } from "@/lib/course"
import { PROGRESS_KEY, type Progress, bestQuiz, lessonKey, loadProgress } from "@/lib/progress"
import { formatTime } from "@/lib/scoring"
import { cn } from "@/lib/utils"

const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb)
  return () => window.removeEventListener("storage", cb)
}
let cache: { raw: string | null; value: Progress } = { raw: null, value: { lessons: [], quizzes: [] } }
function snapshot() {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(PROGRESS_KEY)
  } catch {}
  if (raw !== cache.raw) cache = { raw, value: loadProgress() }
  return cache.value
}
const serverSnapshot: Progress = { lessons: [], quizzes: [] }

/** One class's sections. */
export function CourseMap({ classId }: { classId: string }) {
  const progress = useSyncExternalStore(subscribe, snapshot, () => serverSnapshot)
  const cls = classes.find((c) => c.id === classId) ?? classes[0]

  return (
    <div className="flex flex-col gap-6">
        <div key={cls.id} className="flex flex-col gap-5">
          <p className="text-sm text-muted-foreground">{cls.summary}</p>
      {cls.sections.map((s) => {
        const done = s.lessons.filter((l) => progress.lessons.includes(lessonKey(s.id, l.id)))
        const next = s.lessons.find((l) => !done.includes(l)) ?? s.lessons[0]
        const best = bestQuiz(s.id, progress)
        return (
          <section key={s.id} className="flex flex-col gap-4 rounded-2xl border bg-card/40 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-pixel text-[10px] tracking-wide text-primary">SECTION {s.number}</span>
              <h2 className="text-lg font-semibold">{s.title}</h2>
              <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                {done.length}/{s.lessons.length} lessons
              </span>
            </div>
            <div className="flex items-start gap-3">
              <Beaver variant={s.ticket.who} mood="grumpy" size={40} />
              <p className="flex-1 rounded-xl border bg-card px-3 py-2 text-sm italic text-muted-foreground">&ldquo;{s.ticket.message}&rdquo;</p>
            </div>
            <ol className="flex flex-col gap-2">
              {s.lessons.map((l) => {
                const isDone = done.includes(l)
                return (
                  <li key={l.id}>
                    <a
                      href={partHref(s, l.number)}
                      className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/60"
                    >
                      <span
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-lg border-2 font-pixel text-[10px]",
                          isDone ? "border-success text-success" : "border-primary text-primary"
                        )}
                      >
                        {isDone ? <CheckCircle2 className="size-5" /> : lessonCode(s, l.number)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium">{l.title}</h3>
                          {l.tags.map((t) => (
                            <Badge key={t} variant="secondary">{t}</Badge>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground">{l.summary}</p>
                      </div>
                    </a>
                  </li>
                )
              })}
              <li>
                <a
                  href={partHref(s, "quiz")}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed p-3 transition-colors hover:border-primary/60"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border-2 border-chart-3 text-chart-3">
                    <Timer className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium">Section quiz</h3>
                    <p className="text-sm text-muted-foreground">{s.quiz.summary}</p>
                    {best && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Trophy className="size-3.5 text-primary" />
                        Best: <span className="font-mono text-foreground">{best.score} pts</span> · grade {best.grade} · fastest{" "}
                        <span className="font-mono text-foreground">{formatTime(best.fastest)}</span>
                      </p>
                    )}
                  </div>
                </a>
              </li>
            </ol>
            <a href={partHref(s, next.number)} className={cn(buttonVariants(), "self-start")}>
              <Play /> {done.length === 0 ? "Start section" : done.length === s.lessons.length ? `Replay from ${lessonCode(s, 1)}` : `Continue: ${lessonCode(s, next.number)}`}
            </a>
          </section>
        )
      })}

      {cls.upcoming.map((u) => (
        <section key={u.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed p-4 opacity-60">
          <h3 className="font-semibold">{u.title}</h3>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3.5" /> Coming soon
          </span>
          <p className="w-full text-sm text-muted-foreground">{u.summary}</p>
        </section>
      ))}
        </div>
    </div>
  )
}
