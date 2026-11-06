import type { IpSettings } from "./nic"

/**
 * A TerminalBackend is anything that speaks raw terminal bytes, the same
 * contract a PTY over a WebSocket would have. The browser terminal only
 * talks to this interface, never to the simulator directly.
 */
export interface TerminalBackend {
  /** Attach the terminal. `write` receives output bytes (ANSI allowed). */
  connect(write: (data: string) => void): void
  /** Raw keystrokes / pasted text from the terminal. */
  input(data: string): void
  resize?(cols: number, rows: number): void
  /** Structured lab events used to grade objectives. */
  onEvent(listener: (event: LabEvent) => void): () => void
  dispose(): void
}

/** Creekdows windows besides the command prompt. */
export type WindowName = "video" | "ncpa" | "adapter" | "ipv4"
export type NicField = "dhcp" | "ip" | "mask" | "gateway" | "dnsAuto" | "dns1" | "dns2"

/** "workstation" or a device hostname. */
export type HostName = string

export type CommandError = "invalid" | "ambiguous" | "incomplete" | "unknown"

export type Proto = "ssh" | "telnet"

export type LabEvent =
  | { type: "command"; host: HostName; line: string; ok: boolean; canonical?: string; privileged?: boolean; error?: CommandError }
  /** `name` is set when pinged by name instead of IP. */
  | { type: "ping"; host: HostName; target: string; name?: string; success: boolean }
  /** A name was looked up. No ip = lookup failed. */
  | { type: "resolve"; host: HostName; name: string; ip?: string }
  /** A client tried to open a session. `result` is what the far end did. */
  | { type: "connect"; proto: Proto; target: string; user?: string; result: "open" | "refused" | "timeout" | "unresolved" }
  | { type: "hostkey"; target: string; accepted: boolean }
  | { type: "login"; proto: Proto; target: string; host: HostName; user: string; success: boolean; final?: boolean }
  | { type: "enable"; host: HostName; success: boolean }
  | { type: "disable"; host: HostName }
  | { type: "config-mode"; host: HostName; entered: boolean }
  /** Entered (config-if)# for an interface. */
  | { type: "interface-mode"; host: HostName; name: string }
  /** Interface config after any change to it. */
  | { type: "interface"; host: HostName; name: string; description: string; vlan: number; shutdown: boolean }
  /** User looked at one interface (show run int X, show int X ...). */
  | { type: "inspect"; host: HostName; name: string }
  | { type: "save"; host: HostName }
  | { type: "logout"; proto: Proto; target: string; host: HostName }
  /** Desktop: Run dialog opened (Start > Run). */
  | { type: "run-dialog" }
  /** Desktop: something typed into Run and submitted. */
  | { type: "run"; command: string; ok: boolean }
  | { type: "cmd-open" }
  /** Desktop: a window opened or closed. `adapter` names which adapter's dialog. */
  | { type: "window"; name: WindowName; open: boolean; adapter?: string }
  /** IPv4 Properties: a field changed. `commit` = user left the field. `auto` = Windows filled it in. */
  | { type: "nic-field"; field: NicField; value: string; commit?: boolean; auto?: boolean }
  /** IPv4 Properties OK (stage "pending") or adapter Properties OK (stage "applied"). */
  | { type: "nic"; stage: "pending" | "applied"; settings: IpSettings }
  /** Desktop: the media player's "I watched it" button. */
  | { type: "watched"; video: string }
  | { type: "cmd-closed" }

/** What a shell can do to the lab while handling a line. */
export interface ShellContext {
  print(text: string): void
  sleep(ms: number): Promise<void>
  /** True once the user pressed Ctrl+C during a running command. */
  aborted(): boolean
  emit(event: LabEvent): void
  push(shell: Shell): void
  pop(): void
  clear(): void
}

export interface Shell {
  readonly host: HostName
  prompt(): string
  /** Secret prompts are not echoed and skip history. */
  secret?: boolean
  /** IOS answers `?` instantly instead of inserting it. */
  questionHelp?: boolean
  /** Pushed prompts like "Password:" share their parent's history. */
  transient?: boolean
  handle(line: string, ctx: ShellContext): void | Promise<void>
  /** Return the completed buffer, or candidate words to list. */
  complete?(buffer: string): { buffer?: string; candidates?: string[] }
  help?(buffer: string): string
  /** Ctrl+Z (IOS) / Ctrl+D handling. */
  onControl?(key: "ctrl-z" | "ctrl-d", ctx: ShellContext): boolean
}
