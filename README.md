# Creeky: broadcast engineering basics (demo)

Hands-on lessons for beginner broadcast engineers, guided by Creeky the pixel beaver.
Next.js 16 · Tailwind 4 · shadcn/ui · xterm.js.

## Run

```bash
docker compose up --build -d   # http://localhost:3001
# or
npm install && npm run dev     # http://localhost:3000
```

## Classes

Each class has sections. Each section is one ticket from a grumpy colleague. Lessons run back to back in one
lab (Teach or Help mode, not scored), then a section quiz (timed, scored).

### Networking: Router panel down (Gus, A2)

Creekdows 98 desktop with a command prompt and a simulated Cisco switch, CREEKY_EXT_9003.

- 1.1 Open the command prompt: Start → Run, type `cmd`
- 1.2 Get on the switch: ping the panel (10.1.14.203) and switch (10.1.69.203), `telnet`, admin / Creeky, `en`
- 1.3 Find the port: `sh int status`, `sh run`, `sh run int gi1/0/11` (VLAN 112, Dante)
- 1.4 Fix it: `conf t`, `int gi1/0/11`, `sw acc vlan 114`, `desc ROUTER`, `end`, `wr`, `exit`, ping the panel
- Quiz: the whole job; the panel is on a random other port

### Wiring: Camera 3's CCU (Ray, Camera 3)

A drawing of the Sony HDCU-5500 rear panel (measured from a photo), with the camera, monitor, sync generator,
RCP, audio console and power strip as status tiles. Each tray label is a cable with one end already plugged in:
drag it onto the right jack. Jacks only lock onto matching signals (reference into SDI RET does nothing).

- 1.1 Camera to CCU: SMPTE fiber into CAMERA, power cord into the AC inlet; the CCU powers the camera
- 1.2 Picture and reference: monitor on SDI OUT 1, sync generator into REFERENCE
- 1.3 Control and audio: RCP into RCP/CNU, audio console on AUDIO OUT CH1
- Quiz: the whole chain from an empty bench

Progress lives in `localStorage` (no accounts).

## Layout

```
src/lib/course/          classes, sections, lessons, objectives, ticket text, Creeky reactions
src/lib/course/runtime.ts binds a section's world to its objectives for the shared runner
src/lib/sim/             terminal simulator: line editor, Windows-style cmd, IOS switch
src/lib/wiring/          workbench: devices, typed jacks, cables, signal flow; panels/ = drawn rear-panel jack maps
src/components/lab/      section runner, terminal stage (desktop), bench stage, panels/ (rear-panel drawings), ticket, Creeky, quiz results
src/components/course/   home page course map
```

To add a section: create `src/lib/course/<name>/` exporting a `TerminalSection` or `WiringSection`
and add it to a class in `src/lib/course/index.ts`. Lesson text is short bullet points only.
