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

### Networking 0: No internet (Dot, EIC)

Creekdows 98 desktop with Win11-layout network dialogs. The PC starts on DHCP with no DHCP server (169.254.x.x).

- 0.1 What is a network?: video in the desktop media player
- 0.2 Open network settings: Start → Run, `ncpa.cpl`, Ethernet → Properties → IPv4 → Properties
- 0.3 Set the IP address: static, 10.1.1.199 (Windows auto-fills mask 255.0.0.0)
- 0.4 Set the gateway: 10.1.1.1
- 0.5 Set the subnet mask: 255.255.255.0 (/24), OK, OK
- 0.6 Test: `ping 10.1.1.1`, `ping 8.8.8.8`, `ping google.com` (fails: no DNS)
- 0.7 Set DNS: 10.1.20.2 and 8.8.8.8, `ping google.com`
- Quiz: all of it from a fresh desktop

### Networking 1: Router panel down (Gus, A2)

Creekdows 98 desktop with a command prompt and a simulated Cisco switch, CREEKY_EXT_9003.

- 1.1 Open the command prompt: Start → Run, type `cmd`
- 1.2 Get on the switch: ping the panel (10.1.14.203) and switch (10.1.69.203), `telnet`, admin / Creeky, `en`
- 1.3 Find the port: `sh int status`, `sh run`, `sh run int gi1/0/11` (VLAN 112, Dante)
- 1.4 Fix it: `conf t`, `int gi1/0/11`, `sw acc vlan 114`, `desc ROUTER`, `end`, `wr`, `exit`, ping the panel
- Quiz: the whole job; the panel is on a random other port

Progress lives in `localStorage` (no accounts).

## Layout

```
src/lib/course/          classes, sections, lessons, objectives, ticket text, Creeky reactions
src/lib/course/runtime.ts binds a section's world to its objectives for the shared runner
src/lib/sim/             simulator: line editor, Windows-style cmd, IOS switch, network adapter (nic.ts)
src/components/lab/      section runner, terminal stage, Creekdows desktop + windows, ticket, Creeky, quiz results
src/components/course/   home page course map
```

To add a section: create `src/lib/course/<name>/` exporting a `TerminalSection`
and add it to a class in `src/lib/course/index.ts`. Lesson text is short bullet points only.
