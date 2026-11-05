/** Demo persistence: browser-only until users/auth exist. */

export interface QuizAttempt {
  sectionId: string
  completed: boolean
  seconds: number
  score: number
  grade: string
  at: number
}

export interface Progress {
  /** Completed lesson ids, as "sectionId/lessonId". */
  lessons: string[]
  quizzes: QuizAttempt[]
}

export const PROGRESS_KEY = "creeky.progress.v3"
const EMPTY: Progress = { lessons: [], quizzes: [] }

export function loadProgress(): Progress {
  try {
    return { ...EMPTY, ...JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "{}") }
  } catch {
    return EMPTY
  }
}

function save(p: Progress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p))
    // Same-tab listeners (storage events only fire in other tabs).
    window.dispatchEvent(new StorageEvent("storage", { key: PROGRESS_KEY }))
  } catch {
    // storage unavailable (private mode); progress just won't persist
  }
}

export const lessonKey = (sectionId: string, lessonId: string) => `${sectionId}/${lessonId}`

export function markLesson(sectionId: string, lessonId: string) {
  const p = loadProgress()
  const k = lessonKey(sectionId, lessonId)
  if (!p.lessons.includes(k)) save({ ...p, lessons: [...p.lessons, k] })
}

export function saveQuiz(a: QuizAttempt) {
  const p = loadProgress()
  save({ ...p, quizzes: [...p.quizzes, a].slice(-100) })
}

export function bestQuiz(sectionId: string, p: Progress) {
  const done = p.quizzes.filter((a) => a.sectionId === sectionId && a.completed)
  if (!done.length) return null
  const best = [...done].sort((a, b) => b.score - a.score)[0]
  return { score: best.score, grade: best.grade, fastest: Math.min(...done.map((a) => a.seconds)) }
}
