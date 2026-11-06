"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { TerminalSection } from "@/lib/course/types"
import type { World } from "@/lib/sim/network"
import { SimulatedLab } from "@/lib/sim/simulated-lab"
import type { LabEvent } from "@/lib/sim/types"
import { CMD_BANNER, WindowsCmd } from "@/lib/sim/windows-cmd"
import { Desktop } from "./desktop"

/**
 * The Creekdows desktop for terminal sections. Owns the command prompt's
 * lifetime and fast-forwards earlier lessons when starting mid-section.
 */
export function TerminalStage({
  section,
  world,
  startIdx,
  quiz,
  onEvent,
}: {
  section: TerminalSection
  world: World
  startIdx: number
  quiz: boolean
  /** silent = replayed, don't grade it. */
  onEvent: (e: LabEvent, silent: boolean) => void
}) {
  const lesson = quiz ? undefined : section.lessons[startIdx]
  // Jumping in: put the world where earlier lessons left it, before anything renders.
  const [initialWindows] = useState(() => {
    if (!lesson) return []
    section.lessons.slice(0, startIdx).forEach((l) => l.prepare?.(world))
    return lesson.windows ?? []
  })
  const video = section.lessons.find((l) => l.video)?.video
  const [backend, setBackend] = useState<SimulatedLab | null>(null)
  const labRef = useRef<SimulatedLab | null>(null)
  const replaying = useRef(false)
  const replayToken = useRef<object | null>(null)
  const onEventRef = useRef(onEvent)
  useEffect(() => {
    onEventRef.current = onEvent
  })

  const emit = useCallback((e: LabEvent) => onEventRef.current(e, replaying.current), [])

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

  return (
    <Desktop
      backend={backend}
      world={world}
      video={quiz ? undefined : video}
      initialWindows={initialWindows}
      onEvent={emit}
      onOpenCmd={openCmd}
      onCloseCmd={closeCmd}
    />
  )
}
