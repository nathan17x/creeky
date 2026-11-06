import type { PortDef } from "../bench"

/**
 * Sony HDCU-5500 rear panel. Positions are in panel units (764 x 476),
 * measured off a rear-panel photo so jacks and labels sit where they really are.
 */
export const HDCU5500_SIZE = { w: 764, h: 476 }

const ROWS = [43, 116, 190, 263]
const bnc = (id: string, label: string, x: number, y: number, role: PortDef["role"], signal: PortDef["signal"]): PortDef => ({
  id,
  label,
  connector: "bnc",
  role,
  signal,
  pos: { x, y },
  r: 21,
})

export const HDCU5500_PORTS: PortDef[] = [
  { ...bnc("character", "CHARACTER / AES/EBU / SYNC", 148, 38, "out", "aux"), r: 20 },
  { id: "rcp", label: "RCP/CNU", connector: "rcp", role: "out", signal: "control", pos: { x: 144, y: 119 }, r: 19 },
  { id: "trunk", label: "TRUNK", connector: "trunk", role: "out", signal: "aux", pos: { x: 144, y: 203 }, r: 26 },
  ...ROWS.map((y, i) => bnc(`sdi-out-${i + 1}`, `SDI OUT ${i + 1}`, 224, y, "out", "video")),
  ...ROWS.map((y, i) => bnc(`sdi-io-${i + 1}`, `SDI I/O ${i + 1}`, 290, y, "out", "video")),
  ...ROWS.map((y, i) => bnc(`sdi-ret-${i + 1}`, `SDI RET ${i + 1}`, 360, y, "in", "return")),
  bnc("ref-1", "REFERENCE", 426, ROWS[0], "in", "ref"),
  bnc("ref-2", "REFERENCE (loop)", 426, ROWS[1], "in", "ref"),
  bnc("prompter-1", "PROMPTER 1", 426, ROWS[2], "in", "prompter"),
  bnc("prompter-2", "PROMPTER 2 / VBS RET", 426, ROWS[3], "in", "prompter"),
  ...[116, 190, 263, 338].map((y, i) => ({ ...bnc(`uhd-${"abcd"[i]}`, `UHD SDI ${"ABCD"[i]}`, 504, y, "out", "video"), r: 19 })),
  { id: "camera", label: "CAMERA", connector: "fiber", role: "in", signal: "video", pos: { x: 657, y: 93 }, r: 56 },
  { id: "ac-in", label: "AC IN", connector: "iec", role: "power", pos: { x: 653, y: 401 }, r: 34 },
  { id: "net-trunk", label: "NETWORK TRUNK", connector: "rj45", role: "out", signal: "aux", pos: { x: 274, y: 343 }, r: 20 },
  { id: "lan-com", label: "LAN COM", connector: "rj45", role: "out", signal: "aux", pos: { x: 362, y: 343 }, r: 20 },
  { id: "audio-1", label: "AUDIO OUT CH1", connector: "xlr", role: "out", signal: "audio", pos: { x: 90, y: 406 }, r: 38 },
  { id: "audio-2", label: "AUDIO OUT CH2", connector: "xlr", role: "out", signal: "audio", pos: { x: 182, y: 406 }, r: 38 },
  { id: "intercom", label: "INTERCOM / TALLY / IO PORT", connector: "dsub", role: "out", signal: "aux", pos: { x: 391, y: 426 }, r: 30 },
]
