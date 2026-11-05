"use client"

import { ArrowRight, BookOpen, CheckCircle2, Circle, Clock, LifeBuoy, RotateCcw, Target, Timer, XCircle } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useReducer, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getSection, lessonCode, partHref, type Part } from "@/lib/course"
import type { Mode, Objective, Section } from "@/lib/course/types"
import { markLesson, saveQuiz } from "@/lib/progress"
import { ERROR_PENALTY, formatTime, score } from "@/lib/scoring"
import { SimulatedLab } from "@/lib/sim/simulated-lab"
import type { LabEvent } from "@/lib/sim/types"
import { CMD_BANNER, WindowsCmd } from "@/lib/sim/windows-cmd"
import { WORKSTATION, type World } from "@/lib/sim/network"
import { cn } from "@/lib/utils"
import { CreekyPanel, type CreekyTone } from "./creeky-panel"
import { Desktop } from "./desktop"
import { MODE_META } from "./modes"
import { QuizResults } from "./results-dialog"
import { RichText } from "./rich-text"
import { TicketPanel } from "./ticket-panel"
import { Topology } from "./topology"

// ------------------------------------------------------------------ state

interface State {
  /** Lesson index (0-based). Unused in the quiz. */
  idx: number
  done: string[]
  revealed: Record<string, number>
  errors: number
  host: string
  creeky: { text: string; tone: CreekyTone }
  complete: boolean
  startedAt: number | null
  finishedAt: number | null
  /** Bumps on every event so derived world state re-renders. */
  tick: number
}

/** What the reducer needs to know about the current lesson / quiz. */
interface Ctx {
  world: World
  objectives: Objective[]
  mode: Mode
  aha: string
  react: Section["react"]
}

type Action =
  | { type: "event"; event: LabEvent; now: number; ctx: Ctx; silent?: boolean }
  | { type: "hint"; ctx: Ctx }
  | { type: "intro"; ctx: Ctx }
  | { type: "lesson"; idx: number; ctx: Ctx }
  | { type: "start"; now: number }

function intro(ctx: Ctx, done: string[]): State["creeky"] {
  const current = ctx.objectives.find((o) => !done.includes(o.id))
  if (ctx.mode === "quiz") return { text: "Zzz… quiz mode. You're on your own. Gus's ticket has everything you need.", tone: "quiet" }
  if (ctx.mode === "help") return { text: "You drive. Stuck? Hit **Ask Creeky** for a hint.", tone: "quiet" }
  return { text: current ? current.teach : "", tone: "teach" }
}

function initial(idx: number, ctx: Ctx): State {
  return {
    idx,
    done: [],
    revealed: {},
    errors: 0,
    host: WORKSTATION.hostname,
    creeky: intro(ctx, []),
    complete: false,
    startedAt: null,
    finishedAt: null,
    tick: 0,
  }
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "start":
      return s.startedAt ? s : { ...s, startedAt: a.now }
    case "intro":
      return s.complete ? s : { ...s, creeky: intro(a.ctx, s.done) }
    case "lesson":
      return { ...s, idx: a.idx, done: [], revealed: {}, complete: false, creeky: intro(a.ctx, []) }
    case "hint": {
      const current = a.ctx.objectives.find((o) => !s.done.includes(o.id))
      if (!current || s.complete) return s
      const n = s.revealed[current.id] ?? 0
      if (n >= current.hints.length) return s
      return { ...s, revealed: { ...s.revealed, [current.id]: n + 1 }, creeky: { text: current.hints[n], tone: "hint" } }
    }
    case "event": {
      const e = a.event
      const next: State = { ...s, tick: s.tick + 1 }
      if (e.type === "command") next.host = e.host
      if (e.type === "login" && e.success) next.host = e.host
      if (e.type === "logout" || e.type === "cmd-closed") next.host = WORKSTATION.hostname
      if (a.silent || s.complete) return next
      const { ctx } = a
      const failed =
        (e.type === "command" && !e.ok) ||
        (e.type === "login" && !e.success) ||
        (e.type === "enable" && !e.success) ||
        (e.type === "run" && !e.ok)
      if (failed) next.errors++

      // Ordered objectives only count once everything before them is done.
      const newlyDone: Objective[] = []
      let priorDone = true
      for (const o of ctx.objectives) {
        if (next.done.includes(o.id)) continue
        if ((!o.ordered || priorDone) && o.done(e, ctx.world)) newlyDone.push(o)
        else priorDone = false
      }
      if (newlyDone.length) {
        next.done = [...next.done, ...newlyDone.map((o) => o.id)]
        const upcoming = ctx.objectives.find((o) => !next.done.includes(o.id))
        const last = newlyDone[newlyDone.length - 1]
        if (!upcoming) {
          next.complete = true
          next.finishedAt = a.now
          next.creeky = ctx.mode === "quiz" ? { text: "Huh? Done already? Let's see that score.", tone: "success" } : { text: ctx.aha, tone: "success" }
        } else if (ctx.mode === "teach") {
          next.creeky = { text: `${last.why} Next: ${upcoming.teach}`, tone: "teach" }
        } else if (ctx.mode === "help") {
          next.creeky = { text: `${last.why}`, tone: "success" }
        }
        return next
      }
      const reaction = ctx.mode === "quiz" ? null : ctx.react(e, ctx.mode, ctx.world)
      if (reaction) next.creeky = { text: reaction, tone: "react" }
      return next
    }
  }
}

// ------------------------------------------------------------------ component

export function SectionRunner({ sectionId, part }: { sectionId: string; part: Part }) {
  const [mode, setMode] = useState<Mode>(part === "quiz" ? "quiz" : "teach")
  const [run, setRun] = useState(0)
  return <Session key={run} sectionId={sectionId} part={part} mode={mode} onMode={setMode} onReset={() => setRun((r) => r + 1)} />
}

function Session({
  sectionId,
  part,
  mode,
  onMode,
  onReset,
}: {
  sectionId: string
  part: Part
  mode: Mode
  onMode: (m: Mode) => void
  onReset: () => void
}) {
  const section = getSection(sectionId)!
  const quiz = part === "quiz"
  const [world] = useState(() => section.createWorld({ quiz }))
  const [backend, setBackend] = useState<SimulatedLab | null>(null)
  const [briefOpen, setBriefOpen] = useState(true)
  const [resultsOpen, setResultsOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const labRef = useRef<SimulatedLab | null>(null)
  const replaying = useRef(false)
  const replayToken = useRef<object | null>(null)

  const ctxFor = useCallback(
    (idx: number, m: Mode): Ctx => {
      if (quiz) return { world, objectives: section.quiz.objectives, mode: "quiz", aha: "", react: section.react }
      const l = section.lessons[idx]
      return { world, objectives: l.objectives, mode: m, aha: l.aha, react: section.react }
    },
    [quiz, section, world]
  )

  const startIdx = quiz ? 0 : (part as number) - 1
  const [state, dispatch] = useReducer(reducer, undefined, () => initial(startIdx, ctxFor(startIdx, mode)))
  const ctx = ctxFor(state.idx, mode)
  const ctxRef = useRef(ctx)
  useEffect(() => {
    ctxRef.current = ctx
  })

  const lesson = quiz ? null : section.lessons[state.idx]
  const objectives = ctx.objectives
  const current = objectives.find((o) => !state.done.includes(o.id))

  const emit = useCallback((event: LabEvent) => {
    dispatch({ type: "event", event, now: Date.now(), ctx: ctxRef.current, silent: replaying.current })
  }, [])

  const closeCmd = useCallback(() => {
    const lab = labRef.current
    if (!lab) return
    labRef.current = null
    lab.dispose()
    setBackend(null)
    emit({ type: "cmd-closed" })
  }, [emit])

  const openCmd = useCallback(() => {
    if (labRef.current) return labRef.current
    const lab = new SimulatedLab(new WindowsCmd(world, () => closeCmd()), CMD_BANNER)
    lab.onEvent(emit)
    labRef.current = lab
    setBackend(lab)
    emit({ type: "cmd-open" })
    return lab
  }, [world, emit, closeCmd])

  // Jumping into a later lesson: open cmd and replay earlier lessons' solutions.
  // The effect owns the lab's lifetime, so strict-mode remounts get a fresh one.
  useEffect(() => {
    const token = {}
    if (!quiz && section.lessons[startIdx].needsCmd) {
      replayToken.current = token
      replaying.current = true
      const lab = openCmd()
      const lines = section.lessons.slice(0, startIdx).flatMap((l) => l.solution)
      lab.replay(lines).finally(() => {
        if (replayToken.current === token) replaying.current = false
      })
    }
    return () => {
      const lab = labRef.current
      labRef.current = null
      lab?.dispose()
    }
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Lesson done: remember it. Quiz done: save the score and show results.
  const elapsed = state.startedAt ? ((state.finishedAt ?? now) - state.startedAt) / 1000 : 0
  const stats = { objectives: state.done.length, total: objectives.length, seconds: elapsed, errors: state.errors }
  const result = score(stats, section.quiz.par)
  const saved = useRef(false)
  useEffect(() => {
    if (!state.complete) return
    if (!quiz) {
      markLesson(section.id, section.lessons[state.idx].id)
      return
    }
    if (saved.current) return
    saved.current = true
    saveQuiz({ sectionId: section.id, completed: true, seconds: elapsed, score: result.total, grade: result.grade, at: Date.now() })
    const t = setTimeout(() => setResultsOpen(true), 900)
    return () => clearTimeout(t)
  }, [state.complete, state.idx, quiz, section, elapsed, result.total, result.grade])

  useEffect(() => {
    if (!quiz || !state.startedAt || state.finishedAt) return
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [quiz, state.startedAt, state.finishedAt])

  const nextLesson = !quiz && state.idx + 1 < section.lessons.length ? section.lessons[state.idx + 1] : null
  const goNext = () => {
    if (!nextLesson) return
    const idx = state.idx + 1
    dispatch({ type: "lesson", idx, ctx: ctxFor(idx, mode) })
    window.history.replaceState(null, "", partHref(section, idx + 1))
    document.title = `${lessonCode(section, idx + 1)} ${section.lessons[idx].title} · Creeky`
    setBriefOpen(true)
  }

  const changeMode = (m: Mode) => {
    onMode(m)
    dispatch({ type: "intro", ctx: ctxFor(state.idx, m) })
  }

  // state.tick changes on every event, so this re-reads the live switch each render.
  const solved = state.tick >= 0 && section.solved(world)
  const startQuiz = () => {
    setBriefOpen(false)
    if (quiz) dispatch({ type: "start", now: Date.now() })
  }

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 py-6">
      {/* header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-2">
          <div className="font-pixel text-[10px] tracking-wide text-primary">SECTION {section.number}</div>
          <h1 className="text-xl font-semibold tracking-tight">{section.title}</h1>
        </div>
        <nav className="flex flex-wrap items-center gap-1" aria-label="Lessons">
          {section.lessons.map((l, i) => {
            const isCurrent = !quiz && i === state.idx
            return (
              <a
                key={l.id}
                href={partHref(section, i + 1)}
                title={l.title}
                className={cn(
                  "rounded-md border px-2.5 py-1 font-mono text-xs transition-colors hover:border-primary/60",
                  isCurrent && "border-primary bg-primary/10 text-primary",
                  !quiz && i < state.idx && "text-success"
                )}
              >
                {lessonCode(section, l.number)}
              </a>
            )
          })}
          <a
            href={partHref(section, "quiz")}
            className={cn("flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs hover:border-primary/60", quiz && "border-primary bg-primary/10 text-primary")}
          >
            <Timer className="size-3" /> Quiz
          </a>
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {!quiz && (
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label="Guide mode">
              {(["teach", "help"] as const).map((m) => {
                const Icon = MODE_META[m].icon
                return (
                  <button
                    key={m}
                    role="radio"
                    aria-checked={mode === m}
                    title={MODE_META[m].blurb}
                    onClick={() => changeMode(m)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground",
                      mode === m && "bg-background text-foreground shadow-sm"
                    )}
                  >
                    <Icon className="size-3.5" /> {MODE_META[m].label}
                  </button>
                )
              })}
            </div>
          )}
          {quiz && (
            <>
              <Badge variant="outline" className="gap-1.5 font-mono tabular-nums">
                <Clock className="size-3.5" /> {formatTime(elapsed)}
              </Badge>
              <Badge variant="outline" className="gap-1.5 font-mono tabular-nums">
                <Target className="size-3.5" /> {result.total} pts
              </Badge>
              <Badge variant="outline" className="gap-1.5 tabular-nums">
                <XCircle className="size-3.5" /> {state.errors} errors
              </Badge>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={() => setBriefOpen(true)}>
            <BookOpen /> {quiz ? "Rules" : "Lesson notes"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Start over from a fresh switch"
            onClick={() => (quiz ? onReset() : window.location.assign(partHref(section, state.idx + 1)))}
          >
            <RotateCcw /> Reset
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* screen */}
        <div className="flex min-w-0 flex-col gap-2">
          <div className="h-[min(640px,72vh)] overflow-hidden rounded-xl border-4 border-[#2a2a35] shadow-xl">
            <Desktop
              backend={backend}
              onEvent={emit}
              onOpenCmd={openCmd}
              onCloseCmd={closeCmd}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Click the black window to type. On the switch: <kbd className="font-mono">?</kbd> lists commands, Tab completes, ↑ recalls,
            Ctrl+C stops a ping.
          </p>
        </div>

        {/* sidebar */}
        <div className="flex flex-col gap-4">
          <TicketPanel ticket={section.ticket} solved={solved} />

          <CreekyPanel message={state.creeky.text} tone={state.creeky.tone} mood={quiz ? (state.complete ? "happy" : "sleep") : state.complete ? "happy" : "idle"}>
            {!quiz && mode === "help" && current && !state.complete && (
              <Button
                size="sm"
                variant="secondary"
                disabled={(state.revealed[current.id] ?? 0) >= current.hints.length}
                onClick={() => dispatch({ type: "hint", ctx })}
              >
                <LifeBuoy /> Ask Creeky
              </Button>
            )}
            {!quiz && state.complete && nextLesson && (
              <Button size="sm" onClick={goNext}>
                Next: {lessonCode(section, nextLesson.number)} {nextLesson.title} <ArrowRight />
              </Button>
            )}
            {!quiz && state.complete && !nextLesson && (
              <a href={partHref(section, "quiz")} className={buttonVariants({ size: "sm" })}>
                <Timer /> Take the section quiz
              </a>
            )}
          </CreekyPanel>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span className="truncate">{quiz ? `Section ${section.number} quiz` : `${lessonCode(section, lesson!.number)} ${lesson!.title}`}</span>
                <span className="text-xs font-normal text-muted-foreground tabular-nums">
                  {state.done.length}/{objectives.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-2">
                {objectives.map((o, i) => {
                  const done = state.done.includes(o.id)
                  const isCurrent = o === current
                  return (
                    <li key={o.id} className={cn("flex gap-2.5 text-sm", !done && !isCurrent && "text-muted-foreground")}>
                      {done ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                      ) : (
                        <Circle className={cn("mt-0.5 size-4 shrink-0", isCurrent && "text-primary")} />
                      )}
                      <div>
                        <span className={cn(isCurrent && "font-medium")}>
                          {i + 1}. {o.title}
                        </span>
                        {!quiz && mode === "help" && isCurrent && (state.revealed[o.id] ?? 0) > 0 && (
                          <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
                            {o.hints.slice(0, state.revealed[o.id]).map((h) => (
                              <li key={h}>
                                <RichText text={h} />
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Network</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Topology nodes={section.topology.nodes} links={section.topology.links} active={state.host} />
              <ul className="list-disc pl-4 text-xs text-muted-foreground">
                {section.network.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
              {quiz && (
                <p className="text-xs text-muted-foreground">
                  Scoring: 100 per step, up to +400 for beating par ({formatTime(section.quiz.par)}), −{ERROR_PENALTY} per error.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* lesson notes / quiz rules */}
      <Dialog open={briefOpen} onOpenChange={(o) => (o ? setBriefOpen(true) : startQuiz())}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <div className="font-pixel text-[10px] tracking-wide text-primary">
              {quiz ? `SECTION ${section.number} QUIZ` : `LESSON ${lessonCode(section, lesson!.number)}`}
            </div>
            <DialogTitle className="text-lg">{quiz ? section.title : lesson!.title}</DialogTitle>
            <DialogDescription>{quiz ? section.quiz.summary : lesson!.summary}</DialogDescription>
          </DialogHeader>
          {quiz ? (
            <ul className="list-disc pl-5 leading-relaxed text-muted-foreground">
              <li>Fresh desktop, fresh switch. Same ticket.</li>
              <li>No hints. Creeky is asleep.</li>
              <li>Clock starts when you press Start.</li>
              <li>Par: {formatTime(section.quiz.par)}. Every error costs {ERROR_PENALTY} points.</li>
            </ul>
          ) : (
            <div className="flex flex-col gap-4">
              {lesson!.brief.map((b) => (
                <div key={b.heading}>
                  <h3 className="mb-1 font-medium">{b.heading}</h3>
                  <ul className="list-disc pl-5 leading-relaxed text-muted-foreground">
                    {b.points.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                  {b.example && (
                    <pre className="mt-2 overflow-x-auto rounded-lg bg-terminal p-3 font-mono text-xs leading-relaxed text-foreground/90">{b.example}</pre>
                  )}
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button onClick={startQuiz}>{quiz ? (state.startedAt ? "Back to the quiz" : "Start quiz") : state.done.length ? "Back to the lab" : "Start"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {quiz && (
        <QuizResults
          open={resultsOpen}
          onOpenChange={setResultsOpen}
          section={section}
          stats={stats}
          result={result}
          onRetry={onReset}
        />
      )}
      <Link href="/" className="sr-only">
        All sections
      </Link>
    </div>
  )
}
