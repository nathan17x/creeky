import { cn } from "@/lib/utils"

const BASE: Record<string, string> = {
  k: "#2a1709", // outline
  b: "#8a5426", // fur
  t: "#d8ac7a", // muzzle / belly
  n: "#1c0f06", // nose
  w: "#fbf7ef", // teeth / eye shine
  e: "#120a04", // eyes
  y: "#8b5cf6", // hat
  Y: "#6d28d9", // hat shade
}

// 16x18 grid; rows 7-8 are the eyes and are swapped per mood.
// Rows 2-5 differ: Creeky wears a cap; Gus is bare.
const BODY = [
  "................",
  "................",
  null,
  null,
  null,
  null,
  ".kbbbbbbbbbbbbk.",
  null,
  null,
  ".kbbbbttttbbbbk.",
  ".kbbbttnnttbbbk.",
  ".kbbbttttttbbbk.",
  "..kbbbtwwtbbbk..",
  "..kbbbtwwtbbbk..",
  "...kbbbbbbbbk...",
  "..kbbttttttbbk..",
  ".kbbttttttttbbk.",
  ".kkkkkkkkkkkkkk.",
]

const HEAD = {
  // Baseball cap: rounded crown with a button, bill sticking out to the right.
  hat: [
    "......yYyy......",
    "....yyyyyyyy....",
    "..kyyyyyyyyyyk..",
    "..kYYYYYYYYYYYYY",
  ],
  bare: [
    "................",
    "...kk......kk...",
    "..kbbk....kbbk..",
    "..kbbbkkkkbbbk..",
  ],
}

const EYES = {
  open: [".kbbwebbbbwebbk.", ".kbbeebbbbeebbk."],
  closed: [".kbbbbbbbbbbbbk.", ".kbbkkbbbbkkbbk."],
  happy: [".kbbeebbbbeebbk.", ".kbebbebbebbebk."],
  grumpy: [".kbkkbbbbbbkkbk.", ".kbbeebbbbeebbk."],
}

/** Gus: no hat, greyer fur. */
const GUS: Record<string, string> = { ...BASE, b: "#6e5a48", t: "#c4b29b" }


function pixels(rows: string[], palette: Record<string, string>, yOffset = 0) {
  const rects: React.ReactNode[] = []
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = palette[row[x]]
      if (c) rects.push(<rect key={`${x}-${y}`} x={x} y={y + yOffset} width={1.02} height={1.02} fill={c} />)
    }
  })
  return rects
}

export type BeaverMood = "idle" | "sleep" | "happy" | "grumpy"

export function Beaver({
  size = 64,
  mood = "idle",
  variant = "creeky",
  className,
}: {
  size?: number
  mood?: BeaverMood
  /** creeky: purple hat. gus: no hat, grey fur. */
  variant?: "creeky" | "gus"
  className?: string
}) {
  const gus = variant === "gus"
  const palette = gus ? GUS : BASE
  const head = gus ? HEAD.bare : HEAD.hat
  const body = BODY.map((r, i) => (i >= 2 && i <= 5 ? head[i - 2] : r ?? ""))
  // Crop to the sprite: the hat starts on row 2, Gus's ears on row 3.
  const top = gus ? 3 : 2
  const rows = 18 - top
  return (
    <svg
      viewBox={`0 ${top} 16 ${rows}`}
      width={size}
      height={(size * rows) / 16}
      shapeRendering="crispEdges"
      className={cn("shrink-0", className)}
      role="img"
      aria-label={gus ? "Gus the beaver" : "Creeky the beaver"}
    >
      {pixels(body, palette)}
      {mood === "idle" && (
        <>
          <g className="[animation:blink-open_4.5s_steps(1)_infinite]">{pixels(EYES.open, palette, 7)}</g>
          <g className="opacity-0 [animation:blink-closed_4.5s_steps(1)_infinite]">{pixels(EYES.closed, palette, 7)}</g>
        </>
      )}
      {mood === "sleep" && pixels(EYES.closed, palette, 7)}
      {mood === "happy" && pixels(EYES.happy, palette, 7)}
      {mood === "grumpy" && pixels(EYES.grumpy, palette, 7)}
    </svg>
  )
}
