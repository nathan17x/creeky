import { IosSwitch, iosLogin } from "./ios-switch"
import { WORKSTATION, type World, deviceAt, resolve, sameSubnet24 } from "./network"
import type { SwitchDevice } from "./switch-device"
import type { Proto, Shell, ShellContext } from "./types"

export const CMD_BANNER = "Creekdows 98 [Version 4.10.2222]\n(C) Creek Systems. All rights reserved.\n\n"

/**
 * A Windows-style command prompt: ping, telnet, ssh, ipconfig.
 * `exit` closes the window via onExit.
 */
export class WindowsCmd implements Shell {
  readonly host = WORKSTATION.hostname
  private knownHosts = new Set<string>()

  constructor(private world: World, private onExit: () => void) {}

  prompt() {
    return `C:\\Users\\${WORKSTATION.user}>`
  }

  async handle(line: string, ctx: ShellContext) {
    const argv = line.trim().split(/\s+/).filter(Boolean)
    if (!argv.length) return
    const cmd = argv[0].toLowerCase().replace(/\.exe$/, "")
    const args = argv.slice(1)
    const trimmed = line.trim()
    const ok = (canonical = cmd) => ctx.emit({ type: "command", host: this.host, line: trimmed, ok: true, canonical })
    const fail = () => ctx.emit({ type: "command", host: this.host, line: trimmed, ok: false })

    switch (cmd) {
      case "help":
        ok()
        ctx.print(
          "PING      Checks if another computer answers.\n" +
          "TELNET    Opens a session to a network device.\n" +
          "SSH       Opens a secure session to a network device.\n" +
          "IPCONFIG  Shows this computer's IP address.\n" +
          "CLS       Clears the screen.\n" +
          "EXIT      Closes this window.\n\n"
        )
        return
      case "cls":
        ok()
        ctx.clear()
        return
      case "whoami":
        ok()
        ctx.print(`${WORKSTATION.computerName.toLowerCase()}\\${WORKSTATION.user}\n\n`)
        return
      case "hostname":
        ok()
        ctx.print(WORKSTATION.computerName + "\n\n")
        return
      case "echo":
        ok()
        ctx.print(args.join(" ") + "\n\n")
        return
      case "ver":
        ok()
        ctx.print("\n" + CMD_BANNER.split("\n")[0] + "\n\n")
        return
      case "exit":
        ok()
        this.onExit()
        return
      case "ipconfig":
        ok()
        ctx.print(
          "\nCreekdows IP Configuration\n\n\nEthernet adapter Ethernet:\n\n" +
          "   Connection-specific DNS Suffix  . :\n" +
          `   IPv4 Address. . . . . . . . . . . : ${WORKSTATION.ip}\n` +
          `   Subnet Mask . . . . . . . . . . . : ${WORKSTATION.mask}\n` +
          `   Default Gateway . . . . . . . . . : ${WORKSTATION.gateway}\n\n`
        )
        return
      case "ping":
        return this.ping(args, trimmed, ctx)
      case "telnet":
        return this.telnet(args, trimmed, ctx)
      case "ssh":
        return this.ssh(args, trimmed, ctx)
      default:
        fail()
        ctx.print(`'${argv[0]}' is not recognized as an internal or external command,\noperable program or batch file.\n\n`)
    }
  }

  private async ping(args: string[], line: string, ctx: ShellContext) {
    let count = 4
    let forever = false
    const rest: string[] = []
    for (let i = 0; i < args.length; i++) {
      const a = args[i].toLowerCase()
      if (a === "-t" || a === "/t") forever = true
      else if (a === "-n" || a === "/n") count = Math.min(50, Math.max(1, Number(args[++i]) || 4))
      else rest.push(args[i])
    }
    const target = rest[0]
    if (!target) {
      ctx.emit({ type: "command", host: this.host, line, ok: false })
      ctx.print("\nUsage: ping [-t] [-n count] target_name\n\n")
      return
    }
    const ip = resolve(this.world, target)
    if (!ip) {
      ctx.emit({ type: "command", host: this.host, line, ok: false })
      ctx.print(`Ping request could not find host ${target}. Please check the name and try again.\n\n`)
      return
    }
    ctx.emit({ type: "command", host: this.host, line, ok: true, canonical: "ping" })
    const local = ip.startsWith("127.") || ip === WORKSTATION.ip
    const alive = local || this.world.alive(ip)
    const ttl = local ? 128 : sameSubnet24(ip, WORKSTATION.ip) ? 255 : 254
    ctx.print(`\nPinging ${ip} with 32 bytes of data:\n`)
    let sent = 0
    const times: number[] = []
    for (; (forever || sent < count) && !ctx.aborted(); sent++) {
      await ctx.sleep(alive ? 450 : 1200)
      if (ctx.aborted()) break
      if (alive) {
        const ms = 1 + Math.floor(Math.random() * 2)
        times.push(ms)
        ctx.print(`Reply from ${ip}: bytes=32 time=${ms}ms TTL=${ttl}\n`)
      } else {
        ctx.print("Request timed out.\n")
      }
    }
    const recv = times.length
    const lost = sent - recv
    ctx.print(
      `\nPing statistics for ${ip}:\n    Packets: Sent = ${sent}, Received = ${recv}, Lost = ${lost} (${sent ? Math.round((lost / sent) * 100) : 0}% loss),\n`
    )
    if (recv) {
      const avg = Math.round(times.reduce((a, b) => a + b, 0) / recv)
      ctx.print(`Approximate round trip times in milli-seconds:\n    Minimum = ${Math.min(...times)}ms, Maximum = ${Math.max(...times)}ms, Average = ${avg}ms\n`)
    }
    if (ctx.aborted()) ctx.print("Control-C\n")
    ctx.print("\n")
    ctx.emit({ type: "ping", host: this.host, target: ip, success: recv > 0 })
  }

  /** TCP connect. Returns the device if the port is open, else prints the client error. */
  private async open(proto: Proto, dest: string, port: number, user: string | undefined, ctx: ShellContext) {
    const ip = resolve(this.world, dest)
    if (!ip) {
      ctx.print(proto === "ssh" ? `ssh: Could not resolve hostname ${dest}: No such host is known.\n\n` : `Connecting To ${dest}...Could not open connection to the host, on port ${port}: Connect failed\n\n`)
      ctx.emit({ type: "connect", proto, target: dest, user, result: "unresolved" })
      return undefined
    }
    if (proto === "telnet") ctx.print(`Connecting To ${ip}...`)
    const dev = deviceAt(this.world, ip)
    const listening = dev && port === (proto === "ssh" ? 22 : 23) && (proto === "ssh" ? dev.cfg.ssh : dev.cfg.telnet)
    if (listening) {
      ctx.emit({ type: "connect", proto, target: ip, user, result: "open" })
      return dev
    }
    const alive = this.world.alive(ip)
    if (alive) await ctx.sleep(200)
    else for (let i = 0; i < 8 && !ctx.aborted(); i++) await ctx.sleep(250)
    const why = alive ? "Connection refused" : "Connection timed out"
    if (!ctx.aborted()) {
      ctx.print(
        proto === "ssh"
          ? `ssh: connect to host ${dest} port ${port}: ${why}\n\n`
          : `Could not open connection to the host, on port ${port}: Connect failed\n\n`
      )
    }
    ctx.emit({ type: "connect", proto, target: ip, user, result: alive ? "refused" : "timeout" })
    return undefined
  }

  private session(dev: SwitchDevice, proto: Proto, ctx: ShellContext) {
    const sw = new IosSwitch(dev, this.world, { proto, from: WORKSTATION.ip }, (c) => {
      c.pop()
      c.print(proto === "telnet" ? "\n\nConnection to host lost.\n\n" : `Connection to ${dev.cfg.ip} closed.\n\n`)
      c.emit({ type: "logout", proto, target: dev.cfg.ip, host: dev.hostname })
    })
    ctx.push(sw)
  }

  private async telnet(args: string[], line: string, ctx: ShellContext) {
    const dest = args[0]
    if (!dest) {
      ctx.emit({ type: "command", host: this.host, line, ok: false })
      ctx.print("\nUsage: telnet host [port]\n\n")
      return
    }
    const port = args[1] ? Number(args[1]) : 23
    ctx.emit({ type: "command", host: this.host, line, ok: true, canonical: "telnet" })
    const dev = await this.open("telnet", dest, port, undefined, ctx)
    if (!dev) return
    await ctx.sleep(300)
    ctx.print("\n")
    iosLogin(
      dev,
      ctx,
      "telnet",
      (c) => this.session(dev, "telnet", c),
      (c) => c.print("\nConnection to host lost.\n\n")
    )
  }

  private async ssh(args: string[], line: string, ctx: ShellContext) {
    let user = WORKSTATION.user
    let dest: string | undefined
    let port = 22
    for (let i = 0; i < args.length; i++) {
      const a = args[i]
      if (a === "-l") user = args[++i] ?? user
      else if (a === "-p") port = Number(args[++i]) || 22
      else if (a === "-o") i++
      else if (!a.startsWith("-")) dest = a
    }
    if (!dest) {
      ctx.emit({ type: "command", host: this.host, line, ok: false })
      ctx.print("usage: ssh [-l login_name] [-p port] [user@]hostname\n\n")
      return
    }
    if (dest.includes("@")) [user, dest] = [dest.slice(0, dest.lastIndexOf("@")), dest.slice(dest.lastIndexOf("@") + 1)]
    ctx.emit({ type: "command", host: this.host, line, ok: true, canonical: "ssh" })
    const dev = await this.open("ssh", dest, port, user, ctx)
    if (!dev) return
    await ctx.sleep(300)
    if (this.knownHosts.has(dev.cfg.ip)) return this.sshPassword(dev, user, dest, ctx)
    ctx.print(
      `The authenticity of host '${dest} (${dev.cfg.ip})' can't be established.\n` +
      `RSA key fingerprint is ${dev.cfg.fingerprint}.\n`
    )
    const prompt: Shell = {
      host: this.host,
      transient: true,
      prompt: () => "Are you sure you want to continue connecting (yes/no/[fingerprint])? ",
      handle: (answer, c) => {
        const a = answer.trim().toLowerCase()
        if (a === "yes") {
          c.pop()
          this.knownHosts.add(dev.cfg.ip)
          c.print(`Warning: Permanently added '${dest}' (RSA) to the list of known hosts.\n`)
          c.emit({ type: "hostkey", target: dev.cfg.ip, accepted: true })
          this.sshPassword(dev, user, dest!, c)
        } else if (a === "no") {
          c.pop()
          c.print("Host key verification failed.\n\n")
          c.emit({ type: "hostkey", target: dev.cfg.ip, accepted: false })
        } else {
          prompt.prompt = () => "Please type 'yes', 'no' or the fingerprint: "
        }
      },
    }
    ctx.push(prompt)
  }

  private sshPassword(dev: SwitchDevice, user: string, dest: string, ctx: ShellContext) {
    let tries = 0
    const prompt: Shell = {
      host: this.host,
      secret: true,
      transient: true,
      prompt: () => `${user}@${dest}'s password: `,
      handle: async (pw, c) => {
        await c.sleep(350)
        const good = user === dev.cfg.username && pw === dev.cfg.password
        tries++
        const final = !good && tries >= 3
        c.emit({ type: "login", proto: "ssh", target: dev.cfg.ip, host: dev.hostname, user, success: good, final })
        if (good) {
          c.pop()
          c.print(`\n${dev.cfg.banner}\n\n`)
          this.session(dev, "ssh", c)
        } else if (final) {
          c.pop()
          c.print(`${user}@${dest}: Permission denied (password).\n\n`)
        } else {
          c.print("Permission denied, please try again.\n")
        }
      },
    }
    ctx.push(prompt)
  }
}
