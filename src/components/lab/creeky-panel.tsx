import { Beaver, type BeaverMood } from "@/components/beaver"
import { cn } from "@/lib/utils"
import { RichText } from "./rich-text"

export type CreekyTone = "teach" | "hint" | "react" | "success" | "quiet"

export function CreekyPanel({
  message,
  tone,
  mood,
  children,
}: {
  message: string
  tone: CreekyTone
  mood: BeaverMood
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-end gap-3">
      <div className="animate-bob">
        <Beaver size={64} mood={mood} />
      </div>
      <div
        key={message}
        className={cn(
          "animate-pop-in relative flex-1 rounded-xl border bg-card px-4 py-3 text-sm leading-relaxed shadow-sm",
          "before:absolute before:-left-[7px] before:bottom-5 before:size-3 before:rotate-45 before:border-b before:border-l before:bg-card",
          tone === "success" && "border-success/50 before:border-success/50",
          tone === "react" && "border-primary/50 before:border-primary/50",
          tone === "hint" && "border-chart-3/60 before:border-chart-3/60",
          tone === "quiet" && "text-muted-foreground"
        )}
      >
        <div className="font-pixel mb-1.5 text-[9px] tracking-wide text-primary">CREEKY</div>
        <p>
          <RichText text={message} />
        </p>
        {children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  )
}
