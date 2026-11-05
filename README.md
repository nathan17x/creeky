# Creeky: network trainer (demo)

Networking trainer for beginner broadcast engineers, guided by Creeky the pixel beaver. Next.js 16 · Tailwind 4 · shadcn/ui · xterm.js.

## Run

```bash
docker compose up --build     # http://localhost:3000
# or
npm install && npm run dev
```

## What's here

**Section 1: Router panel down.** Gus (A2) says his router panel on field switch CREEKY_EXT_9003 is dead.
Lessons run back to back in one lab, on a Creekdows 98 desktop:

- 1.1 Open the command prompt: Start → Run, type `cmd` (brief mentions Windows key + R on a real PC)
- 1.2 Get on the switch: ping the panel (10.1.14.203) and switch (10.1.69.203), `telnet`, admin / Creeky, `en`
- 1.3 Find the port: `sh int status`, `sh run`, `sh run int gi1/0/11` (VLAN 112, Dante)
- 1.4 Fix it: `conf t`, `int gi1/0/11`, `sw acc vlan 114`, `desc ROUTER`, `end`, `wr`, `exit`, ping the panel
- Section quiz: the whole job from a fresh desktop, timed and scored

Lessons have Teach and Help modes and aren't scored. Jumping to a later lesson fast-forwards the lab.
Quiz: 100 per step, up to +400 time bonus against par, −15 per error. Progress lives in `localStorage`.

## Layout

```
src/lib/sim/            simulator: TerminalBackend, line editor, Windows-style cmd (ping/telnet/ssh), IOS switch
src/lib/course/         sections and lessons: briefs, objectives (event predicates), Creeky reactions
src/components/course/  course map (home page)
src/components/lab/     section runner, desktop, terminal, Gus ticket, Creeky, topology, quiz results
labs/level-1/           old ContainerLab sketch (pre-section-1; needs updating)
docs/containerlab.md    plan for real Arista EOS / Cisco IOS behind a lab-gateway container
```

To add a section, create `src/lib/course/section-N/` exporting a `Section` (ticket, lessons, quiz, world) and register it in
`src/lib/course/index.ts`. Lesson text is short bullet points only.
