import type { LabEvent, Shell, ShellContext, TerminalBackend } from "./types"

const BELL = "\x07"

/**
 * Runs a stack of simulated shells behind a raw-byte terminal interface.
 * It owns the line discipline (echo, history, cursor keys, tab, `?`) that a
 * real device or PTY would otherwise provide.
 */
export class SimulatedLab implements TerminalBackend {
  private out: (data: string) => void = () => {}
  /** Everything printed so far, replayed to whichever terminal attaches. */
  private transcript = ""
  private listeners = new Set<(e: LabEvent) => void>()
  private stack: Shell[] = []
  private histories = new Map<Shell, string[]>()
  private buffer = ""
  private cursor = 0
  private histIndex = -1
  private busy = false
  private abortFlag = false
  private disposed = false
  private timers = new Set<ReturnType<typeof setTimeout>>()
  /** Replay mode: sleeps resolve immediately. */
  private fast = false

  constructor(root: Shell, banner = "") {
    this.stack.push(root)
    if (banner) this.print(banner)
    this.showPrompt()
  }

  connect(write: (data: string) => void) {
    this.out = write
    if (this.transcript) write(this.transcript)
  }

  onEvent(listener: (e: LabEvent) => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  dispose() {
    this.disposed = true
    this.timers.forEach(clearTimeout)
    this.listeners.clear()
  }

  private get shell() {
    return this.stack[this.stack.length - 1]
  }

  /** History is owned by the nearest non-transient shell. */
  private get history() {
    let owner = this.shell
    for (let i = this.stack.length - 1; i >= 0; i--) {
      if (!this.stack[i].transient) {
        owner = this.stack[i]
        break
      }
    }
    if (!this.histories.has(owner)) this.histories.set(owner, [])
    return this.histories.get(owner)!
  }

  private print(text: string) {
    if (this.disposed) return
    const data = text.replace(/\r?\n/g, "\r\n")
    this.transcript += data
    if (this.transcript.length > 400_000) this.transcript = this.transcript.slice(-200_000)
    this.out(data)
  }

  private showPrompt() {
    this.buffer = ""
    this.cursor = 0
    this.histIndex = -1
    this.print(this.shell.prompt())
  }

  private redraw() {
    const echo = this.shell.secret ? "" : this.buffer
    let s = "\r\x1b[K" + this.shell.prompt() + echo
    const back = this.shell.secret ? 0 : this.buffer.length - this.cursor
    if (back > 0) s += `\x1b[${back}D`
    this.print(s)
  }

  private insert(text: string) {
    this.buffer = this.buffer.slice(0, this.cursor) + text + this.buffer.slice(this.cursor)
    this.cursor += text.length
    if (this.shell.secret) return
    if (this.cursor === this.buffer.length) this.print(text)
    else this.redraw()
  }

  input(data: string) {
    if (this.disposed) return
    if (this.busy) {
      if (data.includes("\x03")) this.abortFlag = true
      return
    }
    let i = 0
    while (i < data.length && !this.busy) {
      const ch = data[i]
      if (ch === "\x1b") {
        const seq = data.slice(i, i + 3)
        i += this.handleEscape(seq)
        continue
      }
      i++
      switch (ch) {
        case "\r":
        case "\n":
          if (ch === "\n" && data[i - 2] === "\r") break
          this.submit()
          break
        case "\x7f":
        case "\b":
          if (this.cursor > 0) {
            this.buffer = this.buffer.slice(0, this.cursor - 1) + this.buffer.slice(this.cursor)
            this.cursor--
            if (!this.shell.secret) {
              if (this.cursor === this.buffer.length) this.print("\b \b")
              else this.redraw()
            }
          }
          break
        case "\t":
          this.tab()
          break
        case "\x03":
          this.print("^C\n")
          if (this.shell.transient) this.stack.pop()
          this.showPrompt()
          break
        case "\x0c":
          this.print("\x1b[2J\x1b[H")
          this.redraw()
          break
        case "\x15":
          this.buffer = ""
          this.cursor = 0
          this.redraw()
          break
        case "\x01":
          this.cursor = 0
          this.redraw()
          break
        case "\x05":
          this.cursor = this.buffer.length
          this.redraw()
          break
        case "\x1a":
        case "\x04": {
          const key = ch === "\x1a" ? "ctrl-z" : "ctrl-d"
          if (this.buffer === "" || key === "ctrl-z") {
            const ctx = this.context()
            if (this.shell.onControl?.(key, ctx)) {
              if (key === "ctrl-z") this.print("^Z\n")
              this.showPrompt()
            }
          }
          break
        }
        case "?":
          if (this.shell.questionHelp && !this.shell.secret) {
            this.print("?\n" + (this.shell.help?.(this.buffer) ?? ""))
            const keep = this.buffer
            this.print(this.shell.prompt() + keep)
            this.buffer = keep
            this.cursor = keep.length
            break
          }
          this.insert(ch)
          break
        default:
          if (ch >= " ") this.insert(ch)
      }
    }
  }

  private handleEscape(seq: string): number {
    if (seq.length < 3 || seq[1] !== "[") return 1
    if (this.shell.secret) return 3
    const hist = this.history
    switch (seq[2]) {
      case "A":
        if (hist.length && this.histIndex < hist.length - 1) {
          this.histIndex++
          this.buffer = hist[hist.length - 1 - this.histIndex]
          this.cursor = this.buffer.length
          this.redraw()
        } else this.print(BELL)
        break
      case "B":
        if (this.histIndex > 0) {
          this.histIndex--
          this.buffer = hist[hist.length - 1 - this.histIndex]
        } else {
          this.histIndex = -1
          this.buffer = ""
        }
        this.cursor = this.buffer.length
        this.redraw()
        break
      case "C":
        if (this.cursor < this.buffer.length) {
          this.cursor++
          this.print(seq)
        }
        break
      case "D":
        if (this.cursor > 0) {
          this.cursor--
          this.print(seq)
        }
        break
    }
    return 3
  }

  private tab() {
    const shell = this.shell
    if (shell.secret || !shell.complete) return
    const result = shell.complete(this.buffer)
    if (result.buffer !== undefined && result.buffer !== this.buffer) {
      this.buffer = result.buffer
      this.cursor = this.buffer.length
      this.redraw()
    } else if (result.candidates?.length) {
      this.print("\n" + result.candidates.join("  ") + "\n" + shell.prompt() + this.buffer)
      this.cursor = this.buffer.length
    } else {
      this.print(BELL)
    }
  }

  private context(): ShellContext {
    return {
      print: (t) => this.print(t),
      sleep: (ms) =>
        new Promise((resolve) => {
          if (this.fast) return resolve()
          const t = setTimeout(() => {
            this.timers.delete(t)
            resolve()
          }, ms)
          this.timers.add(t)
        }),
      aborted: () => this.abortFlag,
      emit: (e) => this.listeners.forEach((l) => l(e)),
      push: (s) => this.stack.push(s),
      pop: () => {
        if (this.stack.length > 1) this.stack.pop()
      },
      clear: () => this.print("\x1b[2J\x1b[H"),
    }
  }

  /**
   * Type lines as if the user did, without delays. Used to fast-forward the
   * lab when someone jumps into the middle of a section.
   */
  async replay(lines: string[]) {
    this.fast = true
    try {
      for (const line of lines) {
        if (this.disposed) return
        this.buffer = line
        this.cursor = line.length
        if (!this.shell.secret) this.print(line)
        await this.submit()
      }
    } finally {
      this.fast = false
    }
  }

  private async submit() {
    const line = this.buffer
    const shell = this.shell
    this.print("\n")
    if (!shell.secret && line.trim()) {
      const hist = this.history
      if (hist[hist.length - 1] !== line) hist.push(line)
    }
    this.busy = true
    this.abortFlag = false
    try {
      await shell.handle(line, this.context())
    } finally {
      this.busy = false
      if (this.abortFlag) this.print("^C\n")
      this.abortFlag = false
      if (!this.disposed) this.showPrompt()
    }
  }
}
