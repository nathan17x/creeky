import { type Bench, portKey } from "@/lib/wiring/bench"
import { cn } from "@/lib/utils"

/** Sidebar view of the bench: each device's jacks and whether signal or power is there. */
export function SignalFlow({ bench }: { bench: Bench }) {
  const status = bench.status()
  const devices = bench.scene.devices.filter((d) => d.kind !== "power")
  return (
    <ol className="flex flex-col gap-2 text-xs">
      {devices.map((d, i) => (
        <li key={d.id} className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{d.label}</span>
            {d.kind === "display" && d.ports.some((p) => p.role === "in" && (p.signal ?? "video") === "video") && (
              <span className={cn("ml-auto rounded px-1.5 text-[10px]", status.picture.has(d.id) ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
                {status.picture.has(d.id) ? "PICTURE" : "NO SIGNAL"}
              </span>
            )}
          </div>
          <ul className="flex flex-wrap gap-x-3 gap-y-1 pl-1">
            {!d.ports.some((p) => p.role === "power" || bench.at(portKey(d.id, p.id))) && <li className="text-muted-foreground/60">nothing plugged in</li>}
            {d.ports.filter((p) => p.role === "power" || bench.at(portKey(d.id, p.id))).map((p) => {
              const k = portKey(d.id, p.id)
              const on =
                p.role === "power" ? status.powered.has(d.id) : p.role === "in" ? status.locked.has(k) : status.live.has(k)
              const plugged = !!bench.at(k)
              return (
                <li key={p.id} className="flex items-center gap-1.5 text-muted-foreground">
                  <span className={cn("size-2 rounded-full", on ? "bg-success" : plugged ? "bg-chart-3" : "bg-muted-foreground/30")} />
                  {p.label}
                </li>
              )
            })}
          </ul>
          {i < devices.length - 1 && <div className="pl-1 text-muted-foreground/50">↓</div>}
        </li>
      ))}
      <li className="flex gap-3 pt-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-success" /> signal / power</span>
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-chart-3" /> plugged, nothing yet</span>
      </li>
    </ol>
  )
}
