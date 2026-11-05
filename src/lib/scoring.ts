export interface RunStats {
  objectives: number
  total: number
  seconds: number
  errors: number
}

export interface ScoreBreakdown {
  base: number
  timeBonus: number
  errorPenalty: number
  total: number
  grade: "S" | "A" | "B" | "C" | "D"
}

export const ERROR_PENALTY = 15

/** Quiz scoring: 100 per objective, up to 400 for beating par (0 at 3x par), minus errors. */
export function score(stats: RunStats, par: number): ScoreBreakdown {
  const base = stats.objectives * 100
  const complete = stats.objectives === stats.total
  const timeBonus = complete ? Math.round(400 * Math.min(1, Math.max(0, (3 * par - stats.seconds) / (2 * par)))) : 0
  const errorPenalty = stats.errors * ERROR_PENALTY
  const total = Math.max(0, base + timeBonus - errorPenalty)
  const pct = total / (stats.total * 100 + 400)
  const grade = pct >= 0.9 ? "S" : pct >= 0.75 ? "A" : pct >= 0.6 ? "B" : pct >= 0.4 ? "C" : "D"
  return { base, timeBonus, errorPenalty, total, grade }
}

export function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}
