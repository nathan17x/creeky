import type { TopoLink, TopoNode } from "@/lib/course/types"
import { cn } from "@/lib/utils"

const W = 120
const GAP = 64
const H = 76

function Icon({ kind }: { kind: TopoNode["icon"] }) {
  const cls = "stroke-muted-foreground"
  if (kind === "pc")
    return (
      <g transform="translate(12,14)" className={cls} fill="none" strokeWidth="1.6">
        <rect x="0" y="0" width="22" height="15" rx="2" />
        <path d="M7 20h8M11 15v5" />
      </g>
    )
  if (kind === "switch")
    return (
      <g transform="translate(10,16)" className={cls} fill="none" strokeWidth="1.6">
        <rect x="0" y="0" width="26" height="12" rx="2" />
        <path d="M5 6h2M10 6h2M15 6h2M20 6h2" />
      </g>
    )
  if (kind === "router")
    return (
      <g transform="translate(10,14)" className={cls} fill="none" strokeWidth="1.6">
        <circle cx="13" cy="9" r="9" />
        <path d="M8 6l5-3 5 3M8 12l5 3 5-3M13 3v12" />
      </g>
    )
  if (kind === "cloud")
    return (
      <g transform="translate(9,15)" className={cls} fill="none" strokeWidth="1.6">
        <path d="M7 16h14a5 5 0 0 0 0-10 7 7 0 0 0-13-1A5.5 5.5 0 0 0 7 16z" />
      </g>
    )
  return (
    <g transform="translate(10,13)" className={cls} fill="none" strokeWidth="1.6">
      <rect x="0" y="0" width="26" height="18" rx="2" />
      <circle cx="7" cy="9" r="3" />
      <path d="M14 6h8M14 12h8" />
    </g>
  )
}

/** Nodes in a row, links between neighbours. */
export function Topology({
  nodes,
  links,
  className,
  active,
}: {
  nodes: TopoNode[]
  links: TopoLink[]
  className?: string
  active?: string
}) {
  const width = nodes.length * W + (nodes.length - 1) * GAP
  return (
    <svg viewBox={`0 0 ${width + 4} ${H + 24}`} className={cn("w-full", className)} role="img" aria-label="Lab topology">
      {links.map((l, i) => {
        const x1 = 2 + (i + 1) * W + i * GAP
        const x2 = x1 + GAP
        const y = 12 + H / 2
        return (
          <g key={i}>
            <line x1={x1} y1={y} x2={x2} y2={y} className="stroke-border" strokeWidth="2" />
            {l.a && <text x={x1 + 3} y={y - 6} className="fill-muted-foreground font-mono text-[9px]">{l.a}</text>}
            {l.b && <text x={x2 - 3} y={y - 6} textAnchor="end" className="fill-muted-foreground font-mono text-[9px]">{l.b}</text>}
            {l.note && <text x={(x1 + x2) / 2} y={y + 14} textAnchor="middle" className="fill-muted-foreground text-[9px]">{l.note}</text>}
          </g>
        )
      })}
      {nodes.map((n, i) => {
        const on = active === n.id
        return (
          <g key={n.id} transform={`translate(${2 + i * (W + GAP)},12)`}>
            <rect width={W} height={H} rx="10" className={cn("fill-card stroke-border transition-colors", on && "stroke-primary")} strokeWidth={on ? 2 : 1} />
            <Icon kind={n.icon} />
            <text x="44" y="25" className="fill-foreground text-[12px] font-semibold">{n.label}</text>
            <text x="44" y="39" className="fill-muted-foreground text-[10px]">{n.sub}</text>
            <text x="12" y="62" className="fill-primary font-mono text-[11px]">{n.ip}</text>
          </g>
        )
      })}
    </svg>
  )
}
