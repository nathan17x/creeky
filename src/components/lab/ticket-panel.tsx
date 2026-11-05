import { Beaver } from "@/components/beaver"
import type { Ticket } from "@/lib/course/types"
import { cn } from "@/lib/utils"

/** Gus and his complaint. Always visible in the sidebar. */
export function TicketPanel({ ticket, solved }: { ticket: Ticket; solved: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex shrink-0 flex-col items-center gap-1 pt-1">
        <Beaver variant="gus" mood={solved ? "happy" : "grumpy"} size={52} />
        <span className="text-[10px] text-muted-foreground">
          {ticket.from} · {ticket.role}
        </span>
      </div>
      <div
        key={String(solved)}
        className={cn(
          "animate-pop-in relative flex-1 rounded-xl border bg-card px-4 py-3 text-sm leading-relaxed shadow-sm",
          "before:absolute before:-left-[7px] before:top-6 before:size-3 before:rotate-45 before:border-b before:border-l before:bg-card",
          solved ? "border-success/50 before:border-success/50" : "border-destructive/40 before:border-destructive/40"
        )}
      >
        <div className="mb-1.5 flex items-center gap-2">
          <span className="font-pixel text-[9px] tracking-wide text-muted-foreground">TICKET</span>
          <span className={cn("rounded px-1.5 text-[10px] font-medium", solved ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
            {solved ? "SOLVED" : "OPEN"}
          </span>
        </div>
        <p className="italic">&ldquo;{solved ? ticket.solved : ticket.message}&rdquo;</p>
        <ul className="mt-2 list-disc pl-4 font-mono text-xs text-muted-foreground">
          {ticket.facts.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
