import { GraduationCap, LifeBuoy, Timer, type LucideIcon } from "lucide-react"
import type { Mode } from "@/lib/course/types"

export const MODE_META: Record<Mode, { label: string; icon: LucideIcon; blurb: string }> = {
  teach: { label: "Teach", icon: GraduationCap, blurb: "Creeky tells you what to type." },
  help: { label: "Help", icon: LifeBuoy, blurb: "You drive. Ask Creeky for hints." },
  quiz: { label: "Quiz", icon: Timer, blurb: "No help. Timed and scored." },
}
