import type { Metadata } from "next"
import { Topology } from "@/components/lab/topology"
import { Badge } from "@/components/ui/badge"
import { section1 } from "@/lib/course/section-1"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = { title: "Lab environment · Creeky" }

function Flow({ steps }: { steps: { title: string; sub: string; tone?: "now" | "later" }[] }) {
  return (
    <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
      {steps.map((s, i) => (
        <div key={s.title} className="contents">
          {i > 0 && <div className="self-center font-mono text-muted-foreground md:rotate-0 rotate-90">→</div>}
          <div
            className={
              "flex-1 rounded-lg border p-3 " +
              (s.tone === "later" ? "border-dashed" : s.tone === "now" ? "border-primary/60 bg-primary/5" : "bg-card")
            }
          >
            <div className="text-sm font-medium">{s.title}</div>
            <div className="mt-0.5 font-mono text-xs text-muted-foreground">{s.sub}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

const YAML = `name: creeky-l1-\${SESSION}
topology:
  nodes:
    workstation:
      kind: linux
      image: ghcr.io/hellt/network-multitool
      exec: [ "ip addr add 10.10.10.10/24 dev eth1" ]
    sw1:
      kind: cisco_iol           # or: kind: arista_ceos, image: ceos:4.33
      image: vrnetlab/cisco_iol:L2-17.12.01
      type: L2
      startup-config: sw1.cfg   # admin/creek123, enable dam123, Vlan1 10.10.10.2
  links:
    - endpoints: ["workstation:eth1", "sw1:Ethernet0/1"]`

export default function EnvironmentPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lab environment</h1>
        <p className="mt-1 max-w-3xl text-muted-foreground">
          What you&apos;re typing into, how it&apos;s built, and how it grows into real Arista EOS and Cisco IOS devices
          running under ContainerLab.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Today: simulated in the browser <Badge>Live</Badge>
          </CardTitle>
          <CardDescription>Zero infrastructure. Every learner gets a private lab that starts instantly and resets in milliseconds.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Flow
            steps={[
              { title: "xterm.js terminal", sub: "raw keystrokes in, ANSI out" },
              { title: "TerminalBackend", sub: "connect · input · onEvent", tone: "now" },
              { title: "SimulatedLab", sub: "line editor + shell stack" },
              { title: "WindowsCmd → telnet → IosSwitch", sub: "cmd prompt, IOS parser" },
            ]}
          />
          <div className="grid gap-4 text-sm leading-relaxed text-muted-foreground md:grid-cols-2">
            <p>
              The simulator owns the line discipline a PTY would normally provide: echo, hidden password input, history,
              cursor keys, Tab completion and IOS&apos;s instant <code className="font-mono">?</code> help. The IOS shell is a
              keyword tree with unambiguous-prefix matching, so <code className="font-mono">sh ip int br</code>, the caret error
              marker, <code className="font-mono">% Ambiguous command</code> and even the infamous
              <code className="font-mono"> Translating &quot;foo&quot;…</code> domain lookup behave like the real thing.
            </p>
            <p>
              Grading doesn&apos;t scrape the screen. Each shell emits structured events (ping result, host key accepted, auth
              success, privilege change, canonical command) and each lesson&apos;s objectives are small predicates over those
              events. Creeky&apos;s teach-mode reactions use the same stream.
            </p>
          </div>
          <Topology nodes={section1.topology.nodes} links={section1.topology.links} className="max-w-xl" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Next: real devices with ContainerLab <Badge variant="outline">Planned</Badge>
          </CardTitle>
          <CardDescription>The browser keeps the same TerminalBackend contract. Only the implementation behind it changes.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Flow
            steps={[
              { title: "xterm.js", sub: "unchanged" },
              { title: "RemoteBackend", sub: "WebSocket", tone: "later" },
              { title: "lab-gateway container", sub: "session broker + SSH/PTY bridge", tone: "later" },
              { title: "containerlab", sub: "cEOS / IOL nodes per learner", tone: "later" },
            ]}
          />
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                t: "web",
                d: "This Next.js app. Stateless and unprivileged, it serves lessons and the terminal UI. Already its own container.",
              },
              {
                t: "lab-gateway",
                d: "Allocates a lab per session (clab deploy), bridges the WebSocket to an SSH session on the workstation node, runs objective checks against device state, and tears labs down on idle.",
              },
              {
                t: "containerlab host",
                d: "Needs the Docker socket and privileged networking, so it stays isolated from the web tier. Can be the same box at first, or a separate worker pool later.",
              },
            ].map((x) => (
              <div key={x.t} className="rounded-lg border p-3">
                <div className="font-mono text-sm text-primary">{x.t}</div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{x.d}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
              <h3 className="font-medium text-foreground">Section 1 as a real topology</h3>
              <p>The simulated network maps 1:1 to a two-node lab. Addresses, credentials and interface names stay the same, so lessons don&apos;t change.</p>
              <h3 className="mt-2 font-medium text-foreground">Grading on real gear</h3>
              <p>
                Instead of simulator events, the gateway checks state: <code className="font-mono">show users</code> for an active
                vty session, <code className="font-mono">~/.ssh/known_hosts</code> on the workstation, Arista eAPI for EOS, and
                command accounting/logging for what was run.
              </p>
              <h3 className="mt-2 font-medium text-foreground">Images and licensing</h3>
              <p>
                Arista cEOS-lab is a free download with an Arista account (imported with <code className="font-mono">docker import</code>).
                Cisco IOL images come with a Cisco Modeling Labs license and are packaged with vrnetlab. Neither can be bundled in
                this repo, so they&apos;re loaded onto the lab host separately.
              </p>
            </div>
            <pre className="overflow-x-auto rounded-lg bg-terminal p-4 font-mono text-xs leading-relaxed">{YAML}</pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
