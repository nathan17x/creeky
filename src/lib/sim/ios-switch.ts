import { type World, resolve } from "./network"
import { type Port, type SwitchDevice, shortName } from "./switch-device"
import type { Proto, Shell, ShellContext } from "./types"

type Priv = 1 | 15
type Mode = "exec" | "config" | "config-if"

interface Node {
  word: string
  help: string
  /** Argument nodes match a value instead of a keyword. */
  arg?: RegExp
  children?: Node[]
  minPriv?: Priv
  run?: (args: string[], ctx: ShellContext) => void | Promise<void>
}

interface Token {
  text: string
  pos: number
}

const GREEDY = /.+/

function tokenize(line: string): Token[] {
  const tokens: Token[] = []
  const re = /\S+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(line))) tokens.push({ text: m[0], pos: m.index })
  return tokens
}

type Resolved =
  | { kind: "error"; error: "ambiguous" | "invalid"; token: Token; index: number }
  | { kind: "ok"; node?: Node; args: string[]; argPos: number; options: Node[] }

const pad = (s: string, n: number) => s + " ".repeat(Math.max(1, n - s.length))

export interface IosSession {
  proto: Proto
  /** Where the session came from (for show users). */
  from: string
}

/**
 * A small Cisco IOS emulator: abbreviated keywords, `?` help, tab
 * completion, privilege levels, config / interface modes and the classic
 * error messages. State lives in the SwitchDevice so it survives logouts.
 */
export class IosSwitch implements Shell {
  readonly questionHelp = true
  priv: Priv = 1
  mode: Mode = "exec"
  iface = ""
  termLength = 24
  /** Column where the current greedy argument starts (for ^ markers). */
  private argPos = 0
  private failedEnables = 0

  constructor(
    private dev: SwitchDevice,
    private world: World,
    private session: IosSession,
    private onExit: (ctx: ShellContext) => void
  ) {}

  get host() {
    return this.dev.hostname
  }

  prompt() {
    const h = this.dev.hostname
    if (this.mode === "config") return `${h}(config)#`
    if (this.mode === "config-if") return `${h}(config-if)#`
    return h + (this.priv === 15 ? "#" : ">")
  }

  // ---------------------------------------------------------------- trees

  private execTree(): Node[] {
    return [
      { word: "clear", help: "Reset functions", minPriv: 15, children: [
        { word: "screen", help: "Clear the terminal screen", run: (_, ctx) => ctx.clear() },
      ] },
      { word: "configure", help: "Enter configuration mode", minPriv: 15, children: [
        { word: "terminal", help: "Configure from the terminal", run: (_, ctx) => {
          ctx.print("Enter configuration commands, one per line.  End with CNTL/Z.\n")
          this.mode = "config"
          ctx.emit({ type: "config-mode", host: this.host, entered: true })
        } },
      ] },
      { word: "copy", help: "Copy from one file to another", minPriv: 15, children: [
        { word: "running-config", help: "Copy from current system configuration", children: [
          { word: "startup-config", help: "Copy to startup configuration", run: (_, ctx) => this.copyRunStart(ctx) },
        ] },
      ] },
      { word: "disable", help: "Turn off privileged commands", run: (_, ctx) => {
        this.priv = 1
        ctx.emit({ type: "disable", host: this.host })
      } },
      { word: "enable", help: "Turn on privileged commands", run: (_, ctx) => this.enable(ctx) },
      { word: "exit", help: "Exit from the EXEC", run: (_, ctx) => this.onExit(ctx) },
      { word: "logout", help: "Exit from the EXEC", run: (_, ctx) => this.onExit(ctx) },
      { word: "ping", help: "Send echo messages", children: [
        { word: "WORD", help: "Ping destination address or hostname", arg: GREEDY, run: (a, ctx) => this.ping(a[0], ctx) },
      ] },
      { word: "reload", help: "Halt and perform a cold restart", minPriv: 15, run: (_, ctx) =>
        ctx.print("% Reload is disabled in this lab.\n") },
      { word: "show", help: "Show running system information", children: this.showTree() },
      { word: "terminal", help: "Set terminal line parameters", children: [
        { word: "length", help: "Set number of lines on a screen", children: [
          { word: "<0-512>", help: "Number of lines on screen (0 for no pausing)", arg: /^\d+$/, run: (a) => {
            this.termLength = Number(a[0])
          } },
        ] },
      ] },
      { word: "write", help: "Write running configuration to memory", minPriv: 15, run: (_, ctx) => this.save(ctx), children: [
        { word: "memory", help: "Write to NV memory", run: (_, ctx) => this.save(ctx) },
      ] },
    ]
  }

  private showTree(): Node[] {
    return [
      { word: "clock", help: "Display the system clock", run: (_, ctx) => ctx.print(`*${this.clock()}\n`) },
      { word: "history", help: "Display the session command history", run: (_, ctx) =>
        ctx.print("  (use the up arrow to scroll through history)\n") },
      { word: "interfaces", help: "Interface status and configuration", run: (_, ctx) => this.showAllInterfaces(ctx), children: [
        { word: "status", help: "Show interface line status", run: (_, ctx) => this.showIntStatus(ctx, this.dev.ports) },
        { word: "WORD", help: "Interface name, e.g. Gi1/0/1", arg: GREEDY, run: (a, ctx) => this.showInterface(a[0], ctx) },
      ] },
      { word: "ip", help: "IP information", children: [
        { word: "interface", help: "IP interface status and configuration", children: [
          { word: "brief", help: "Brief summary of IP status and configuration", run: (_, ctx) => this.showIpIntBrief(ctx) },
        ] },
        { word: "ssh", help: "Information on SSH", run: (_, ctx) => ctx.print(
          this.dev.cfg.ssh
            ? "SSH Enabled - version 2.0\nAuthentication timeout: 120 secs; Authentication retries: 3\n"
            : "SSH Disabled - version 1.99\n%Please create RSA keys to enable SSH (and of atleast 768 bits for SSH v2).\n"
        ) },
      ] },
      { word: "mac", help: "MAC configuration", children: [
        { word: "address-table", help: "MAC forwarding table", run: (_, ctx) => this.showMac(ctx) },
      ] },
      { word: "privilege", help: "Show current privilege level", run: (_, ctx) =>
        ctx.print(`Current privilege level is ${this.priv}\n`) },
      { word: "running-config", help: "Current operating configuration", minPriv: 15, run: (_, ctx) => this.showRun(ctx), children: [
        { word: "interface", help: "Show interface configuration", children: [
          { word: "WORD", help: "Interface name", arg: GREEDY, run: (a, ctx) => this.showRunInterface(a[0], ctx) },
        ] },
      ] },
      { word: "users", help: "Display information about terminal lines", run: (_, ctx) => ctx.print(
        "    Line       User       Host(s)              Idle       Location\n" +
        `*  1 vty 0     ${pad(this.dev.cfg.username, 11)}idle                 00:00:00 ${this.session.from}\n\n` +
        "  Interface    User               Mode         Idle     Peer Address\n"
      ) },
      { word: "version", help: "System hardware and software status", run: (_, ctx) => this.showVersion(ctx) },
      { word: "vlan", help: "VTP VLAN status", children: [
        { word: "brief", help: "VTP all VLAN status in brief", run: (_, ctx) => this.showVlanBrief(ctx) },
      ] },
    ]
  }

  private configTree(): Node[] {
    return [
      { word: "do", help: "To run exec commands in config mode", children: [
        { word: "LINE", help: "Exec Command", arg: GREEDY, run: () => {} },
      ] },
      { word: "end", help: "Exit from configure mode", run: (_, ctx) => this.end(ctx) },
      { word: "exit", help: "Exit from configure mode", run: (_, ctx) => this.end(ctx) },
      { word: "hostname", help: "Set system's network name", children: [
        { word: "WORD", help: "This system's network name", arg: GREEDY, run: (_, ctx) =>
          ctx.print("% Hostname changes are disabled in this lab.\n") },
      ] },
      { word: "interface", help: "Select an interface to configure", children: [
        { word: "WORD", help: "Interface name, e.g. Gi1/0/1", arg: GREEDY, run: (a, ctx) => this.enterInterface(a[0], ctx) },
      ] },
      { word: "vlan", help: "Vlan commands", children: [
        { word: "<1-4094>", help: "ISL VLAN IDs 1-1005, 802.1Q VLAN IDs 1-4094", arg: /^\d+$/, run: (a, ctx) => {
          const id = Number(a[0])
          if (id < 1 || id > 4094) return this.invalid(ctx, "vlan ".length)
          this.ensureVlan(id)
        } },
      ] },
    ]
  }

  private interfaceTree(): Node[] {
    const vlanArg = (run: (id: number, ctx: ShellContext) => void): Node => ({
      word: "<1-4094>", help: "VLAN ID of the VLAN when this port is in access mode", arg: /^\d+$/,
      run: (a, ctx) => run(Number(a[0]), ctx),
    })
    return [
      { word: "description", help: "Interface specific description", children: [
        { word: "LINE", help: "Up to 240 characters describing this interface", arg: GREEDY, run: (a, ctx) =>
          this.change(ctx, (p) => (p.description = a[0].slice(0, 240))) },
      ] },
      { word: "do", help: "To run exec commands in config mode", children: [
        { word: "LINE", help: "Exec Command", arg: GREEDY, run: () => {} },
      ] },
      { word: "end", help: "Exit from configure mode", run: (_, ctx) => this.end(ctx) },
      { word: "exit", help: "Exit from interface configuration mode", run: () => {
        this.mode = "config"
      } },
      { word: "interface", help: "Select an interface to configure", children: [
        { word: "WORD", help: "Interface name, e.g. Gi1/0/1", arg: GREEDY, run: (a, ctx) => this.enterInterface(a[0], ctx) },
      ] },
      { word: "no", help: "Negate a command or set its defaults", children: [
        { word: "description", help: "Interface specific description", run: (_, ctx) => this.change(ctx, (p) => (p.description = "")) },
        { word: "shutdown", help: "Shutdown the selected interface", run: (_, ctx) => this.change(ctx, (p) => (p.shutdown = false)) },
        { word: "switchport", help: "Set switching mode characteristics", children: [
          { word: "access", help: "Set access mode characteristics of the interface", children: [
            { word: "vlan", help: "Set VLAN when interface is in access mode", run: (_, ctx) => this.change(ctx, (p) => (p.vlan = 1)) },
          ] },
        ] },
      ] },
      { word: "shutdown", help: "Shutdown the selected interface", run: (_, ctx) => this.change(ctx, (p) => (p.shutdown = true)) },
      { word: "switchport", help: "Set switching mode characteristics", children: [
        { word: "access", help: "Set access mode characteristics of the interface", children: [
          { word: "vlan", help: "Set VLAN when interface is in access mode", children: [
            vlanArg((id, ctx) => {
              if (id < 1 || id > 4094) return ctx.print("% Bad VLAN list\n")
              if (!this.dev.vlans[id]) {
                ctx.print(`% Access VLAN does not exist. Creating vlan ${id}\n`)
                this.ensureVlan(id)
              }
              this.change(ctx, (p) => (p.vlan = id))
            }),
          ] },
        ] },
        { word: "mode", help: "Set trunking mode of the interface", children: [
          { word: "access", help: "Set trunking mode to ACCESS unconditionally", run: () => {} },
          { word: "trunk", help: "Set trunking mode to TRUNK unconditionally", run: (_, ctx) =>
            ctx.print("% Trunk ports are disabled in this lab. Keep it an access port.\n") },
        ] },
      ] },
    ]
  }

  private tree() {
    const nodes = this.mode === "config" ? this.configTree() : this.mode === "config-if" ? this.interfaceTree() : this.execTree()
    return this.visible(nodes)
  }

  private visible(nodes: Node[] = []) {
    return nodes.filter((n) => (n.minPriv ?? 1) <= this.priv && !(n.word === "disable" && this.priv === 1))
  }

  // ------------------------------------------------------------- parsing

  private resolve(tokens: Token[]): Resolved {
    let options = this.tree()
    let node: Node | undefined
    const args: string[] = []
    let argPos = 0
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i]
      const word = t.text.toLowerCase()
      const keywords = options.filter((n) => !n.arg)
      const exact = keywords.find((n) => n.word === word)
      const prefix = exact ? [exact] : keywords.filter((n) => n.word.startsWith(word))
      if (prefix.length > 1) return { kind: "error", error: "ambiguous", token: t, index: i }
      if (prefix.length === 1) {
        node = prefix[0]
      } else {
        const arg = options.find((n) => n.arg)
        if (!arg) return { kind: "error", error: "invalid", token: t, index: i }
        node = arg
        // Greedy arguments (WORD / LINE) swallow the rest of the line.
        if (arg.arg === GREEDY) {
          args.push(tokens.slice(i).map((x) => x.text).join(" "))
          argPos = t.pos
          options = []
          break
        }
        if (!arg.arg!.test(t.text)) return { kind: "error", error: "invalid", token: t, index: i }
        args.push(t.text)
        argPos = t.pos
      }
      options = this.visible(node.children)
    }
    return { kind: "ok", node, args, argPos, options }
  }

  async handle(line: string, ctx: ShellContext) {
    const tokens = tokenize(line)
    if (!tokens.length) return
    const trimmed = line.trim()

    const first = tokens[0].text.toLowerCase()
    if (this.mode !== "exec" && "do".startsWith(first) && first.length >= 2) {
      const rest = line.slice(tokens[1]?.pos ?? line.length)
      if (!rest.trim()) return this.incomplete(ctx, trimmed)
      const saved = { mode: this.mode, iface: this.iface }
      this.mode = "exec"
      await this.handle(rest, ctx)
      if (this.mode === "exec") Object.assign(this, saved)
      return
    }

    const r = this.resolve(tokens)
    if (r.kind === "error") {
      const unknown = r.index === 0 && this.mode === "exec" && tokens.length === 1 && r.error === "invalid"
      ctx.emit({ type: "command", host: this.host, line: trimmed, ok: false, error: unknown ? "unknown" : r.error, privileged: this.priv === 15 })
      if (r.error === "ambiguous") {
        ctx.print(`% Ambiguous command:  "${line.slice(0, r.token.pos + r.token.text.length).trim()}"\n`)
        return
      }
      if (unknown) return this.translate(r.token.text, ctx)
      ctx.print(" ".repeat(this.prompt().length + r.token.pos) + "^\n")
      ctx.print("% Invalid input detected at '^' marker.\n\n")
      return
    }
    if (!r.node?.run) return this.incomplete(ctx, trimmed)

    this.argPos = r.argPos
    const canonical = this.canonical(tokens)
    ctx.emit({ type: "command", host: this.host, line: trimmed, ok: true, canonical, privileged: this.priv === 15 })
    await r.node.run(r.args, ctx)
  }

  private incomplete(ctx: ShellContext, line: string) {
    ctx.emit({ type: "command", host: this.host, line, ok: false, error: "incomplete" })
    ctx.print("% Incomplete command.\n\n")
  }

  private invalid(ctx: ShellContext, offset = 0) {
    ctx.print(" ".repeat(this.prompt().length + this.argPos + offset) + "^\n")
    ctx.print("% Invalid input detected at '^' marker.\n\n")
  }

  /** Expand abbreviations, e.g. "sh ip int br" -> "show ip interface brief". */
  canonical(tokens: Token[]) {
    let options = this.tree()
    const words: string[] = []
    for (let i = 0; i < tokens.length; i++) {
      const w = tokens[i].text.toLowerCase()
      const kw = options.find((n) => !n.arg && (n.word === w || n.word.startsWith(w)))
      const node = kw ?? options.find((n) => n.arg)
      if (!node) break
      if (!kw && node.arg === GREEDY) {
        words.push(tokens.slice(i).map((t) => t.text).join(" "))
        break
      }
      words.push(kw ? kw.word : tokens[i].text)
      options = this.visible(node.children)
    }
    return words.join(" ")
  }

  // ------------------------------------------------------------ help/tab

  help(buffer: string) {
    const tokens = tokenize(buffer)
    const partial = buffer.length > 0 && !/\s$/.test(buffer)
    const head = partial ? tokens.slice(0, -1) : tokens
    const r = this.resolve(head)
    if (r.kind === "error") return "% Unrecognized command\n"
    const options = r.options
    if (partial) {
      const w = tokens[tokens.length - 1].text.toLowerCase()
      const matches = options.filter((n) => !n.arg && n.word.startsWith(w)).map((n) => n.word)
      return matches.length ? matches.join("  ") + "\n\n" : "% Unrecognized command\n"
    }
    const lines = options.map((n) => "  " + pad(n.word, 16) + n.help)
    if (r.node?.run && head.length) lines.push("  <cr>")
    if (!head.length) {
      const title = this.mode === "exec" ? "Exec commands:" : this.mode === "config" ? "Configure commands:" : "Interface configuration commands:"
      return title + "\n" + lines.join("\n") + "\n\n"
    }
    return lines.join("\n") + "\n\n"
  }

  complete(buffer: string) {
    if (!buffer || /\s$/.test(buffer)) return {}
    const tokens = tokenize(buffer)
    const last = tokens[tokens.length - 1]
    const r = this.resolve(tokens.slice(0, -1))
    if (r.kind === "error") return {}
    const matches = r.options.filter((n) => !n.arg && n.word.startsWith(last.text.toLowerCase()))
    if (matches.length !== 1) return {}
    return { buffer: buffer.slice(0, last.pos) + matches[0].word + " " }
  }

  onControl(key: "ctrl-z" | "ctrl-d", ctx: ShellContext) {
    if (key === "ctrl-z" && this.mode !== "exec") {
      this.end(ctx)
      return true
    }
    return false
  }

  // ------------------------------------------------------------ actions

  private end(ctx: ShellContext) {
    this.mode = "exec"
    this.iface = ""
    ctx.emit({ type: "config-mode", host: this.host, entered: false })
  }

  private enterInterface(raw: string, ctx: ShellContext) {
    const name = this.dev.parseInterface(raw)
    if (!name) return this.invalid(ctx)
    if (name.startsWith("Vlan")) {
      ctx.print("% The management interface is locked in this lab.\n")
      return
    }
    this.mode = "config-if"
    this.iface = name
    ctx.emit({ type: "interface-mode", host: this.host, name })
  }

  private change(ctx: ShellContext, fn: (p: Port) => void) {
    const p = this.dev.port(this.iface)
    if (!p) return
    fn(p)
    this.dev.dirty = true
    ctx.emit({ type: "interface", host: this.host, name: p.name, description: p.description, vlan: p.vlan, shutdown: p.shutdown })
  }

  private ensureVlan(id: number) {
    if (!this.dev.vlans[id]) this.dev.vlans[id] = `VLAN${String(id).padStart(4, "0")}`
  }

  private enable(ctx: ShellContext) {
    if (this.priv === 15) return
    const prompt: Shell = {
      host: this.host,
      secret: true,
      transient: true,
      prompt: () => "Password: ",
      handle: (pw, c) => {
        c.pop()
        if (pw === this.dev.cfg.enableSecret) {
          this.priv = 15
          this.failedEnables = 0
          c.emit({ type: "enable", host: this.host, success: true })
          return
        }
        this.failedEnables++
        c.emit({ type: "enable", host: this.host, success: false })
        if (this.failedEnables >= 3) {
          this.failedEnables = 0
          c.print("% Bad secrets\n\n")
          return
        }
        c.push(prompt)
      },
    }
    ctx.push(prompt)
  }

  private async save(ctx: ShellContext) {
    ctx.print("Building configuration...\n")
    await ctx.sleep(600)
    ctx.print("[OK]\n")
    this.dev.dirty = false
    ctx.emit({ type: "save", host: this.host })
  }

  private copyRunStart(ctx: ShellContext) {
    const prompt: Shell = {
      host: this.host,
      transient: true,
      prompt: () => "Destination filename [startup-config]? ",
      handle: async (answer, c) => {
        c.pop()
        const a = answer.trim()
        if (a && a !== "startup-config") {
          c.print("%Error opening " + a + " (Permission denied)\n")
          return
        }
        await this.save(c)
      },
    }
    ctx.push(prompt)
  }

  private async translate(word: string, ctx: ShellContext) {
    ctx.print(`Translating "${word}"...domain server (255.255.255.255)\n`)
    for (let i = 0; i < 6 && !ctx.aborted(); i++) await ctx.sleep(250)
    ctx.print("% Unknown command or computer name, or unable to find computer address\n")
  }

  private async ping(target: string, ctx: ShellContext) {
    const ip = resolve(this.world, target.split(" ")[0])
    if (!ip) {
      ctx.print(`Translating "${target}"...domain server (255.255.255.255)\n`)
      await ctx.sleep(800)
      ctx.print("% Unrecognized host or address, or protocol not running.\n\n")
      ctx.emit({ type: "ping", host: this.host, target, success: false })
      return
    }
    ctx.print("Type escape sequence to abort.\n")
    ctx.print(`Sending 5, 100-byte ICMP Echos to ${ip}, timeout is 2 seconds:\n`)
    const ok = this.world.alive(ip)
    for (let i = 0; i < 5 && !ctx.aborted(); i++) {
      await ctx.sleep(ok ? 120 : 400)
      ctx.print(ok ? "!" : ".")
    }
    ctx.print(ok
      ? "\nSuccess rate is 100 percent (5/5), round-trip min/avg/max = 1/1/2 ms\n"
      : "\nSuccess rate is 0 percent (0/5)\n")
    ctx.emit({ type: "ping", host: this.host, target: ip, success: ok })
  }

  // ------------------------------------------------------------ show

  private clock() {
    const d = new Date()
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const t = d.toISOString().slice(11, 23)
    return `${t} UTC ${days[d.getUTCDay()]} ${months[d.getUTCMonth()]} ${d.getUTCDate()} ${d.getUTCFullYear()}`
  }

  private portStatus(p: Port) {
    return p.shutdown ? "disabled" : p.link ? "connected" : "notconnect"
  }

  private showIntStatus(ctx: ShellContext, ports: Port[]) {
    let s = "\n" + pad("Port", 13) + pad("Name", 19) + pad("Status", 13) + pad("Vlan", 11) + "Duplex  Speed Type\n"
    for (const p of ports) {
      const up = this.dev.up(p)
      s += pad(shortName(p.name), 13) + pad(p.description.slice(0, 18), 19) + pad(this.portStatus(p), 13) + pad(String(p.vlan), 11) +
        (up ? "a-full" : "  auto").padStart(6) + " " + (up ? "a-1000" : "auto").padStart(6) + " 10/100/1000BaseTX\n"
    }
    ctx.print(s)
  }

  /** Parses "gi1/0/11 [status|switchport]" and prints the right view. */
  private showInterface(raw: string, ctx: ShellContext) {
    const words = raw.trim().split(/\s+/)
    const last = words[words.length - 1].toLowerCase()
    const views = words.length > 1 && last.length >= 2 ? ["status", "switchport"].filter((v) => v.startsWith(last)) : []
    const view = views.length === 1 ? views[0] : undefined
    const name = this.dev.parseInterface((view ? words.slice(0, -1) : words).join(""))
    const p = name ? this.dev.port(name) : undefined
    if (!p) return this.invalid(ctx)
    ctx.emit({ type: "inspect", host: this.host, name: p.name })
    if (view === "status") return this.showIntStatus(ctx, [p])
    if (view === "switchport") {
      ctx.print(
        `Name: ${shortName(p.name)}\nSwitchport: Enabled\nAdministrative Mode: static access\n` +
        `Operational Mode: ${this.dev.up(p) ? "static access" : "down"}\n` +
        `Access Mode VLAN: ${p.vlan} (${this.dev.vlans[p.vlan] ?? "Inactive"})\n`
      )
      return
    }
    ctx.print(this.interfaceDetail(p))
  }

  private interfaceDetail(p: Port) {
    const up = this.dev.up(p)
    const state = p.shutdown
      ? "administratively down, line protocol is down (disabled)"
      : up ? "up, line protocol is up (connected)" : "down, line protocol is down (notconnect)"
    return (
      `${p.name} is ${state}\n` +
      "  Hardware is Gigabit Ethernet, address is 70b3.17d2.0" + p.name.split("/").pop()!.padStart(3, "0") + "\n" +
      (p.description ? `  Description: ${p.description}\n` : "") +
      "  MTU 1500 bytes, BW 1000000 Kbit/sec, DLY 10 usec,\n" +
      (up ? "  Full-duplex, 1000Mb/s, media type is 10/100/1000BaseTX\n" : "  Auto-duplex, Auto-speed, media type is 10/100/1000BaseTX\n") +
      `  5 minute input rate ${up ? 18000 : 0} bits/sec, ${up ? 21 : 0} packets/sec\n` +
      `  5 minute output rate ${up ? 4000 : 0} bits/sec, ${up ? 6 : 0} packets/sec\n`
    )
  }

  private showAllInterfaces(ctx: ShellContext) {
    ctx.print(this.dev.ports.map((p) => this.interfaceDetail(p)).join(""))
  }

  private showIpIntBrief(ctx: ShellContext) {
    const { cfg } = this.dev
    const row = (name: string, ip: string, method: string, status: string, proto: string) =>
      pad(name, 23) + pad(ip, 16) + "YES " + pad(method, 7) + pad(status, 22) + proto + "\n"
    let s = pad("Interface", 23) + pad("IP-Address", 16) + "OK? Method " + pad("Status", 22) + "Protocol\n"
    s += row("Vlan1", "unassigned", "unset", "administratively down", "down")
    s += row(`Vlan${cfg.mgmtVlan}`, cfg.ip, "NVRAM", "up", "up")
    for (const p of this.dev.ports) {
      const up = this.dev.up(p)
      s += row(p.name, "unassigned", "unset", p.shutdown ? "administratively down" : up ? "up" : "down", up ? "up" : "down")
    }
    ctx.print(s)
  }

  private showVlanBrief(ctx: ShellContext) {
    let s = "\nVLAN Name                             Status    Ports\n" +
      "---- -------------------------------- --------- -------------------------------\n"
    const ids = Object.keys(this.dev.vlans).map(Number).sort((a, b) => a - b)
    for (const id of ids) {
      const ports = this.dev.ports.filter((p) => p.vlan === id).map((p) => shortName(p.name))
      const chunks: string[] = []
      for (let i = 0; i < ports.length; i += 4) chunks.push(ports.slice(i, i + 4).join(", "))
      s += pad(String(id), 5) + pad(this.dev.vlans[id], 33) + pad("active", 10) + (chunks[0] ?? "") + "\n"
      for (const c of chunks.slice(1)) s += " ".repeat(48) + c + "\n"
    }
    s += "1002 fddi-default                     act/unsup \n1003 token-ring-default               act/unsup \n" +
      "1004 fddinet-default                  act/unsup \n1005 trnet-default                    act/unsup \n"
    ctx.print(s)
  }

  private showMac(ctx: ShellContext) {
    const rows = this.dev.ports.filter((p) => this.dev.up(p) && p.mac)
    let s = "          Mac Address Table\n-------------------------------------------\n\n" +
      "Vlan    Mac Address       Type        Ports\n----    -----------       --------    -----\n"
    for (const p of rows) s += " " + pad(String(p.vlan), 7) + pad(p.mac!, 18) + pad("DYNAMIC", 12) + shortName(p.name) + "\n"
    s += `Total Mac Addresses for this criterion: ${rows.length}\n`
    ctx.print(s)
  }

  private interfaceConfig(p: Port) {
    return (
      `interface ${p.name}\n` +
      (p.description ? ` description ${p.description}\n` : "") +
      (p.vlan !== 1 ? ` switchport access vlan ${p.vlan}\n` : "") +
      " switchport mode access\n" +
      (p.shutdown ? " shutdown\n" : "")
    )
  }

  private showRunInterface(raw: string, ctx: ShellContext) {
    const name = this.dev.parseInterface(raw)
    const p = name ? this.dev.port(name) : undefined
    if (!p) return this.invalid(ctx)
    ctx.emit({ type: "inspect", host: this.host, name: p.name })
    const body = this.interfaceConfig(p)
    ctx.print(`Building configuration...\n\nCurrent configuration : ${body.length + 4} bytes\n!\n${body}end\n\n`)
  }

  private showRun(ctx: ShellContext) {
    const { cfg } = this.dev
    const vlans = Object.entries(this.dev.vlans)
      .filter(([id]) => id !== "1")
      .map(([id, name]) => `vlan ${id}\n name ${name}\n!\n`)
      .join("")
    const body =
      "!\nversion 15.2\nno service pad\nservice timestamps debug datetime msec\nservice timestamps log datetime msec\n!\n" +
      `hostname ${cfg.hostname}\n!\nenable secret 9 $9$hT0kq8w3pL1mXe$Qy6fJ0yEw3bS1k2vB7cN8dR4tZ5uI9oP0aL2sD3fG4h\n!\n` +
      `username ${cfg.username} privilege 1 secret 9 $9$Wm4nR2sT8vXyZ1$aB3cD5eF7gH9iJ1kL3mN5oP7qR9sT1uV3wX5yZ7aB9c\n` +
      "no aaa new-model\n!\n" + vlans +
      this.dev.ports.map((p) => this.interfaceConfig(p) + "!\n").join("") +
      "interface Vlan1\n no ip address\n shutdown\n!\n" +
      `interface Vlan${cfg.mgmtVlan}\n ip address ${cfg.ip} ${cfg.mask}\n!\n` +
      `ip default-gateway ${cfg.gateway}\n!\n` +
      "line con 0\n logging synchronous\nline vty 0 4\n login local\n" +
      ` transport input ${cfg.telnet && cfg.ssh ? "telnet ssh" : cfg.ssh ? "ssh" : "telnet"}\n!\nend\n`
    ctx.print(`Building configuration...\n\nCurrent configuration : ${body.length} bytes\n${body}\n`)
  }

  private showVersion(ctx: ShellContext) {
    const { cfg } = this.dev
    ctx.print(
      `Cisco IOS Software, C1000 Software (C1000-UNIVERSALK9-M), Version ${cfg.version}, RELEASE SOFTWARE (fc1)\n` +
      "Technical Support: (simulated lab device)\n\n" +
      `${cfg.hostname} uptime is 41 days, 6 hours, 12 minutes\n` +
      `System image file is "flash:${cfg.image}"\n\n` +
      `cisco ${cfg.model} (ARM) processor with 524288K bytes of memory.\n` +
      `${this.dev.ports.length} Gigabit Ethernet interfaces\n\n` +
      "Configuration register is 0xF\n\n"
    )
  }
}

/**
 * IOS `login local` on a vty line: Username / Password prompts, three tries.
 * Used for telnet; SSH clients send the password themselves.
 */
export function iosLogin(
  dev: SwitchDevice,
  ctx: ShellContext,
  proto: Proto,
  onSuccess: (c: ShellContext) => void,
  onClose: (c: ShellContext) => void
) {
  let tries = 0
  ctx.print(`\n${dev.cfg.banner}\n\nUser Access Verification\n\n`)
  const askUser = (c: ShellContext) => {
    const userPrompt: Shell = {
      host: "workstation",
      transient: true,
      prompt: () => "Username: ",
      handle: (user, c2) => {
        c2.pop()
        const pwPrompt: Shell = {
          host: "workstation",
          transient: true,
          secret: true,
          prompt: () => "Password: ",
          handle: async (pw, c3) => {
            c3.pop()
            await c3.sleep(300)
            const ok = user.trim() === dev.cfg.username && pw === dev.cfg.password
            tries++
            const final = !ok && tries >= 3
            c3.emit({ type: "login", proto, target: dev.cfg.ip, host: dev.hostname, user: user.trim(), success: ok, final })
            if (ok) {
              c3.print("\n")
              onSuccess(c3)
              return
            }
            c3.print("% Login invalid\n\n")
            if (final) onClose(c3)
            else askUser(c3)
          },
        }
        c2.push(pwPrompt)
      },
    }
    c.push(userPrompt)
  }
  askUser(ctx)
}

