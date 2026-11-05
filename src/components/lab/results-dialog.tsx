"use client"

import Link from "next/link"
import { Beaver } from "@/components/beaver"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Section } from "@/lib/course/types"
import { type RunStats, type ScoreBreakdown, formatTime } from "@/lib/scoring"

export function QuizResults({
  open,
  onOpenChange,
  section,
  stats,
  result,
  onRetry,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  section: Section
  stats: RunStats
  result: ScoreBreakdown
  onRetry: () => void
}) {
  const rows: [string, string][] = [
    ["Time", `${formatTime(stats.seconds)} (par ${formatTime(section.quiz.par)})`],
    ["Steps", `${stats.objectives}/${stats.total}`],
    ["Errors", String(stats.errors)],
    ["Steps", `+${result.base}`],
    ["Time bonus", `+${result.timeBonus}`],
    ["Error penalty", `−${result.errorPenalty}`],
  ]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <Beaver size={72} mood="happy" />
          <DialogTitle className="font-pixel text-sm leading-relaxed text-primary">SECTION {section.number} QUIZ DONE</DialogTitle>
          <DialogDescription>{section.title}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center gap-6 py-2">
          <div className="text-center">
            <div className="font-pixel text-4xl text-primary">{result.grade}</div>
            <div className="mt-2 text-xs text-muted-foreground">grade</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-4xl font-semibold tabular-nums">{result.total}</div>
            <div className="mt-1 text-xs text-muted-foreground">points</div>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
          {rows.map(([k, v], i) => (
            <div key={i} className="contents">
              <dt className={i === 3 ? "mt-2 border-t pt-2 text-muted-foreground" : "text-muted-foreground"}>{k}</dt>
              <dd className={(i === 3 ? "mt-2 border-t pt-2 " : "") + "text-right font-mono tabular-nums"}>{v}</dd>
            </div>
          ))}
        </dl>
        <DialogFooter>
          <Link href="/" className={buttonVariants({ variant: "ghost" })}>
            All sections
          </Link>
          <Button onClick={onRetry}>Retry</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
