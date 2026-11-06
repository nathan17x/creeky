import type { LabEvent } from "@/lib/sim/types"
import { Bench, type BenchScene, CONNECTOR_NAME, SIGNAL_NAME } from "@/lib/wiring/bench"
import { HDCU5500_PORTS, HDCU5500_SIZE } from "@/lib/wiring/panels/hdcu5500"
import type { Lesson, Mode, Objective, WiringSection } from "../types"

/** Wiring section 1: hook a Sony HDC-5500 camera up to its HDCU-5500 CCU, on the CCU's real rear panel. */

const scene: BenchScene = {
  devices: [
    {
      id: "ccu",
      label: "HDCU-5500 CCU",
      sub: "rear panel",
      kind: "converter",
      look: "hdcu5500",
      panel: HDCU5500_SIZE,
      ports: HDCU5500_PORTS,
      leds: [
        { label: "POWER", color: "#22c55e", when: "power" },
        { label: "CAMERA", color: "#38bdf8", when: "locked:camera" },
        { label: "REF", color: "#f59e0b", when: "locked:ref-1|ref-2" },
        { label: "RCP", color: "#a78bfa", when: "live:rcp" },
      ],
    },
    {
      id: "cam",
      label: "HDC-5500",
      sub: "Camera 3",
      kind: "camera",
      look: "camera",
      ports: [{ id: "fiber", label: "FIBER", connector: "fiber", role: "out" }],
      leds: [{ label: "PWR", color: "#22c55e", when: "power" }],
    },
    {
      id: "mon",
      label: "SDI monitor",
      sub: "",
      kind: "display",
      look: "monitor",
      ports: [{ id: "sdi-in", label: "SDI IN", connector: "bnc", role: "in" }],
    },
    {
      id: "sync",
      label: "Sync generator",
      sub: "house reference",
      kind: "source",
      look: "sync",
      ports: [{ id: "ref-out", label: "REF OUT", connector: "bnc", role: "out", signal: "ref" }],
      leds: [{ label: "LOCK", color: "#f59e0b", when: "power" }],
    },
    {
      id: "rcp",
      label: "RCP-3500",
      sub: "shader's panel",
      kind: "control",
      look: "rcp",
      ports: [{ id: "ccu", label: "CCU", connector: "rcp", role: "in", signal: "control" }],
      leds: [{ label: "ONLINE", color: "#a78bfa", when: "locked:ccu" }],
    },
    {
      id: "console",
      label: "Audio console",
      sub: "",
      kind: "display",
      look: "console",
      ports: [{ id: "mic-in", label: "MIC IN 3", connector: "xlr", role: "in", signal: "audio" }],
      leds: [{ label: "SIG", color: "#22c55e", when: "locked:mic-in" }],
    },
    {
      id: "strip",
      label: "Power strip",
      sub: "",
      kind: "power",
      look: "strip",
      ports: [{ id: "ac-1", label: "", connector: "ac", role: "outlet" }],
    },
  ],
  cables: [
    { id: "fiber", label: "SMPTE fiber", ends: ["fiber", "fiber"], color: "#facc15", note: "hybrid fiber" },
    { id: "power", label: "Power cord", ends: ["ac", "iec"], color: "#a1a1aa", note: "wall plug ↔ IEC" },
    { id: "sdi", label: "SDI cable", ends: ["bnc", "bnc"], color: "#38bdf8", note: "BNC coax" },
    { id: "ref", label: "Reference cable", ends: ["bnc", "bnc"], color: "#f59e0b", note: "BNC coax" },
    { id: "rcp", label: "RCP cable", ends: ["rcp", "rcp"], color: "#a78bfa", note: "8-pin" },
    { id: "xlr", label: "XLR cable", ends: ["xlr", "xlr"], color: "#f472b6", note: "XLR" },
    { id: "hdmi", label: "HDMI cable", ends: ["hdmi", "hdmi"], color: "#d4d4d8", note: "HDMI" },
  ],
  labels: [
    { id: "fiber-cam", cable: "fiber", text: "SMPTE fiber · from camera", from: "cam.fiber" },
    { id: "power-strip", cable: "power", text: "Power cord · from power strip", from: "strip.ac-1" },
    { id: "sdi-mon", cable: "sdi", text: "SDI · from monitor SDI IN", from: "mon.sdi-in" },
    { id: "ref-sync", cable: "ref", text: "Reference · from sync generator", from: "sync.ref-out" },
    { id: "rcp-panel", cable: "rcp", text: "RCP cable · from RCP", from: "rcp.ccu" },
    { id: "xlr-console", cable: "xlr", text: "XLR · from audio console", from: "console.mic-in" },
    { id: "hdmi-spare", cable: "hdmi", text: "HDMI · spare" },
  ],
}

// ------------------------------------------------------------ predicates

const refLocked = (b: Bench) => {
  const st = b.status()
  return st.locked.has("ccu.ref-1") || st.locked.has("ccu.ref-2")
}

const ccuVideoOuts = HDCU5500_PORTS.filter((p) => p.role === "out" && (p.signal ?? "video") === "video").map((p) => `ccu.${p.id}`)
const is = {
  fiber: (_: LabEvent, b: Bench) => b.linked("cam.fiber", "ccu.camera", "fiber"),
  ccuPower: (_: LabEvent, b: Bench) => b.status().powered.has("ccu"),
  camPower: (_: LabEvent, b: Bench) => b.status().powered.has("cam"),
  sdiOut: (_: LabEvent, b: Bench) => ccuVideoOuts.some((o) => b.linked(o, "mon.sdi-in", "sdi")),
  picture: (_: LabEvent, b: Bench) => b.status().picture.has("mon"),
  ref: (_: LabEvent, b: Bench) => refLocked(b),
  rcp: (_: LabEvent, b: Bench) => b.status().locked.has("rcp.ccu"),
  mic: (_: LabEvent, b: Bench) => b.status().locked.has("console.mic-in"),
}

function react(e: LabEvent, mode: Mode, bench: Bench): string | null {
  if (mode !== "teach") return null
  switch (e.type) {
    case "cable-pick":
      return e.cable === "hdmi" ? "Nothing here takes HDMI. Broadcast gear like this talks SDI." : null
    case "plug": {
      if (e.ok) return null
      if (e.problem === "occupied") return "Something's already plugged in there. Click the jack to unplug it."
      if (e.problem === "same") return "That's where this cable already starts. Drop it on the jack its other end goes to."
      const port = bench.port(e.port)!.port
      const cable = bench.cable(e.cable)!
      return `That jack is ${CONNECTOR_NAME[port.connector]}. The ${cable.label} has ${[...new Set(cable.ends)].map((c) => CONNECTOR_NAME[c]).join(" and ")} ends.`
    }
    case "wire": {
      if (e.direction === "in-in") return "Both ends are inputs. Nothing flows. Signal goes **OUT → IN**."
      if (e.direction === "out-out") return "Both ends are outputs. Nothing flows. Signal goes **OUT → IN**."
      if (e.direction !== "ok") return "That doesn't carry anything useful. Click the jack to unplug it."
      const [a, b] = [bench.signalOf(e.a), bench.signalOf(e.b)]
      if (a !== b) {
        const target = bench.port(e.b)!.port
        if (b === "aux") return `${target.label} isn't used today. Click the jack to unplug it.`
        return `${target.label} takes ${SIGNAL_NAME[b]}. This cable carries ${SIGNAL_NAME[a]}. Click the jack to unplug it.`
      }
      return null
    }
    default:
      return null
  }
}

// ------------------------------------------------------------ objectives

const o = {
  fiber: (): Objective<Bench> => ({
    id: "fiber",
    title: "Camera fiber → CCU CAMERA",
    teach: "Drag **SMPTE fiber · from camera** onto the CCU's **CAMERA** jack.",
    hints: ["The camera and CCU talk over one cable.", "It's the yellow hybrid fiber.", "Drag SMPTE fiber · from camera onto CCU CAMERA."],
    why: "Camera and CCU are linked.",
    done: is.fiber,
  }),
  ccuPower: (): Objective<Bench> => ({
    id: "ccu-power",
    title: "Power the CCU",
    teach: "Drag **Power cord · from power strip** onto the CCU's AC inlet (bottom right, marked **~**).",
    hints: ["The CCU runs on mains power.", "The power cord's IEC end goes into the CCU's AC inlet.", "Drag Power cord · from power strip onto the AC inlet, bottom right."],
    why: "CCU POWER light is on.",
    done: is.ccuPower,
  }),
  camPower: (): Objective<Bench> => ({
    id: "cam-power",
    title: "Camera powers up",
    teach: "Check the camera's **PWR** light. It needs fiber **and** a powered CCU.",
    hints: ["The camera has no power cord of its own.", "Power comes from the CCU, down the fiber.", "Fiber into CAMERA and power cord into AC IN."],
    why: "The CCU powers the camera down the fiber. CAM light is on.",
    ordered: true,
    done: is.camPower,
  }),
  sdiOut: (): Objective<Bench> => ({
    id: "sdi-out",
    title: "CCU SDI OUT 1 → monitor",
    teach: "Drag **SDI · from monitor SDI IN** onto the CCU's **SDI OUT 1**.",
    hints: ["The monitor needs the camera's picture.", "The CCU's picture comes out of the SDI OUT column. Not SDI RET: those are inputs.", "Drag SDI · from monitor SDI IN onto CCU SDI OUT 1."],
    why: "The CCU's output feeds the monitor.",
    done: is.sdiOut,
  }),
  ref: (): Objective<Bench> => ({
    id: "ref",
    title: "Reference into the CCU",
    teach: "Drag **Reference · from sync generator** onto the CCU's **REFERENCE** jack (top of the right-hand block).",
    hints: ["Every camera locks to the same house reference.", "Lots of BNC inputs on this CCU. Only the pair marked REFERENCE takes reference.", "Drag Reference · from sync generator onto CCU REFERENCE."],
    why: "REF light on. Camera 3 is timed with the rest of the house.",
    done: is.ref,
  }),
  picture: (): Objective<Bench> => ({
    id: "picture",
    title: "Picture on the monitor",
    teach: "Check the monitor.",
    hints: ["Follow the signal: camera → fiber → CCU → SDI → monitor.", "The camera needs power from the CCU.", "Fiber in CAMERA, power cord in the AC inlet, SDI OUT 1 to the monitor."],
    why: "Camera 3's picture is up.",
    ordered: true,
    done: is.picture,
  }),
  rcp: (): Objective<Bench> => ({
    id: "rcp",
    title: "Connect the RCP",
    teach: "Drag **RCP cable · from RCP** onto the CCU's **RCP/CNU** jack.",
    hints: ["The shader controls the camera from a panel.", "The panel connects with a round 8-pin cable. Not TRUNK.", "Drag RCP cable · from RCP onto CCU RCP/CNU."],
    why: "RCP is online. The shader can set iris and color.",
    done: is.rcp,
  }),
  mic: (): Objective<Bench> => ({
    id: "mic",
    title: "Camera mic → audio console",
    teach: "Drag **XLR · from audio console** onto the CCU's **AUDIO OUT CH1**.",
    hints: ["The camera mic's audio rides the fiber to the CCU.", "It comes out of the CCU on XLR, bottom left.", "Drag XLR · from audio console onto CCU AUDIO OUT CH1."],
    why: "Audio console hears the camera mic.",
    done: is.mic,
  }),
}

const howTo = {
  heading: "How to cable",
  points: [
    "Each label in the tray is a cable. One end is already plugged in.",
    "Drag the label onto the jack where the other end goes.",
    "Click a used jack to unplug it.",
  ],
}

const lessons: Lesson<Bench>[] = [
  {
    id: "camera-to-ccu",
    number: 1,
    title: "Camera to CCU",
    summary: "Fiber from the camera, power to the CCU.",
    tags: ["SMPTE fiber", "CCU"],
    brief: [
      {
        heading: "The CCU",
        points: [
          "CCU = camera control unit. One per camera, in the truck or rack room.",
          "Here: a Sony HDC-5500 camera and its HDCU-5500 CCU.",
          "The bench shows the CCU's real rear panel. Most jacks aren't needed today.",
        ],
      },
      {
        heading: "SMPTE fiber",
        points: [
          "One hybrid fiber cable between camera and CCU.",
          "Carries video, audio, intercom, tally and control both ways.",
          "Also carries power: the CCU powers the camera.",
        ],
      },
      { heading: "Power", points: ["The CCU needs mains power: power cord into the AC inlet (bottom right).", "The camera needs fiber and a powered CCU."] },
      howTo,
    ],
    objectives: [o.fiber(), o.ccuPower(), o.camPower()],
    aha: "Camera's alive, powered by the CCU over the fiber. Next: get its picture out.",
    solution: ["fiber:cam.fiber>ccu.camera", "power:strip.ac-1>ccu.ac-in"],
  },
  {
    id: "picture-and-ref",
    number: 2,
    title: "Picture and reference",
    summary: "SDI out to the monitor, reference in from the sync generator.",
    tags: ["SDI", "reference"],
    brief: [
      {
        heading: "SDI OUT 1-4",
        points: ["The camera's picture, for the router, switcher and monitors.", "SDI I/O and UHD SDI A-D are more outputs. Not needed today."],
      },
      {
        heading: "REFERENCE",
        points: [
          "Reference (genlock) from the house sync generator.",
          "Keeps every camera timed together, so cuts between them are clean.",
          "Two REFERENCE jacks: in and loop-through. Use the top one.",
        ],
      },
      {
        heading: "SDI RET and PROMPTER",
        points: ["SDI RET 1-4: video sent back to the camera's viewfinder (e.g. program).", "PROMPTER: teleprompter video for the camera.", "Inputs, but not reference. Same BNC, different job."],
      },
    ],
    objectives: [o.sdiOut(), o.ref(), o.picture()],
    aha: "Picture on the monitor and the CCU is locked to house reference. Next: control and audio.",
    solution: ["sdi:mon.sdi-in>ccu.sdi-out-1", "ref:sync.ref-out>ccu.ref-1"],
  },
  {
    id: "control-and-audio",
    number: 3,
    title: "Control and audio",
    summary: "Connect the shader's RCP and send the camera mic to audio.",
    tags: ["RCP", "XLR"],
    brief: [
      {
        heading: "RCP",
        points: [
          "RCP = remote control panel. The shader (video op) uses it.",
          "Iris, black level, color. Without it, nobody can match this camera to the others.",
          "RCP cable from the panel into the CCU's RCP/CNU jack. TRUNK is something else.",
        ],
      },
      {
        heading: "Camera mic",
        points: ["The camera's mic audio rides the fiber to the CCU.", "It comes out of AUDIO OUT CH1/CH2 on XLR, to the audio console."],
      },
    ],
    objectives: [o.rcp(), o.mic()],
    aha: "Picture, reference, control and audio. Camera 3 is ready for rehearsal.",
    solution: [],
  },
]

export const wiringCcu: WiringSection = {
  kind: "wiring",
  id: "ccu-setup",
  number: 1,
  title: "Camera 3's CCU",
  summary: "Hook a Sony HDC-5500 camera up to its HDCU-5500 CCU.",
  ticket: {
    from: "Ray",
    role: "Camera 3",
    who: "ray",
    message:
      "My CCU just came back from repair and it's sitting there with NO cables. I need picture, the shader needs control, " +
      "and audio wants my mic. Rehearsal's at four. Please?!",
    facts: ["Camera: Sony HDC-5500 (fiber)", "CCU: Sony HDCU-5500", "Sync gen, monitor, RCP and audio console are on the bench", "Cables are labelled in the tray"],
    solved: "Camera 3 is up! Picture, paint, mic. You're a legend.",
  },
  scene,
  lessons,
  quiz: {
    par: 75,
    summary: "Hook up the whole camera chain from an empty bench. No help. Timed.",
    objectives: [o.fiber(), o.ccuPower(), o.sdiOut(), o.ref(), o.rcp(), o.mic(), { ...o.picture(), ordered: false }],
  },
  createWorld: () => new Bench(scene),
  react,
  solved: (b) => {
    const st = b.status()
    return st.picture.has("mon") && refLocked(b) && st.locked.has("rcp.ccu") && st.locked.has("console.mic-in")
  },
}
