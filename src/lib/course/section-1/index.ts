import { WORKSTATION, type World } from "@/lib/sim/network"
import type { Lesson, Objective, TerminalSection } from "../types"
import {
  LABEL,
  PANEL,
  PANEL_PORT_SHORT,
  PASSWORD,
  PORT_TYPED,
  SWITCH,
  WRONG_VLAN,
  createWorld,
  is,
  react,
  solved,
} from "./lab"

const SW = SWITCH.ip
const SW_NAME = SWITCH.hostname
const USER = SWITCH.username

// ------------------------------------------------- reusable objectives

const o = {
  runDialog: (): Objective<World> => ({
    id: "run",
    title: "Open the Run box",
    teach: "Click **Start**, then **Run…**. (On a real Windows PC, **Windows key + R** does the same thing.)",
    hints: ["Windows has a box for starting programs by name.", "It's in the Start menu, bottom left.", "Click Start, then Run…"],
    why: "The Run box starts any program by name.",
    done: is.runDialog,
  }),
  cmd: (): Objective<World> => ({
    id: "cmd",
    title: "Start the command prompt",
    teach: "Type **cmd** and press Enter.",
    hints: ["The command prompt's program name is three letters.", "Short for 'command'.", "Type cmd, press Enter."],
    why: "This window is where you type commands.",
    done: is.cmdOpen,
  }),
  pingPanel: (): Objective<World> => ({
    id: "ping-panel",
    title: `Ping the router panel (${PANEL.ip}) to see if it's connected`,
    teach: `Type **ping ${PANEL.ip}**. Watch for **Reply from**.`,
    hints: ["ping checks if something answers on the network.", "The panel's IP is in Gus's ticket.", `ping ${PANEL.ip}`],
    why: "Request timed out = no answer. The panel isn't reachable.",
    done: is.pingedPanel,
  }),
  pingSwitch: (): Objective<World> => ({
    id: "ping-switch",
    title: `Ping the switch (${SW})`,
    teach: `Type **ping ${SW}**.`,
    hints: ["Is the switch itself reachable?", "The switch IP is in Gus's ticket.", `ping ${SW}`],
    why: "The switch answers. You can log into it and look around.",
    done: is.switchUp,
  }),
  telnet: (): Objective<World> => ({
    id: "telnet",
    title: `Telnet to the switch (${SW})`,
    teach: `Type **telnet ${SW}**.`,
    hints: ["Use telnet to get onto the switch.", "telnet, then the switch's IP.", `telnet ${SW}`],
    why: "You're connected. Now it wants a login.",
    done: is.telnetOpen,
  }),
  login: (): Objective<World> => ({
    id: "login",
    title: "Log in",
    teach: `Username **${USER}**, password **${PASSWORD}**. The password won't show as you type.`,
    hints: ["Answer the Username and Password prompts.", "It's in Gus's ticket.", `${USER} / ${PASSWORD} (capital C)`],
    why: `Prompt ${SW_NAME}> means you're on the switch.`,
    done: is.loggedIn,
  }),
  telnetLogin: (): Objective<World> => ({
    id: "login",
    title: `Telnet to ${SW} and log in`,
    teach: `Type **telnet ${SW}**, then log in as **${USER}** / **${PASSWORD}**.`,
    hints: ["Get onto the switch.", "telnet, then the login from the ticket.", `telnet ${SW}, then ${USER} / ${PASSWORD}`],
    why: "You're on the switch.",
    done: is.loggedIn,
  }),
  enable: (): Objective<World> => ({
    id: "enable",
    title: "Get full control (enable)",
    teach: `Type **en** (**enable**), then the password **${PASSWORD}**. The prompt changes from **>** to **#**.`,
    hints: ["> means look only. You need #.", "One short command, then a password.", `en (enable), then ${PASSWORD}`],
    why: "# = full control.",
    done: is.enabled,
  }),
  intStatus: (): Objective<World> => ({
    id: "int-status",
    title: "List every port",
    teach: "Type **sh int status** (**show interfaces status**). Find the one port that says **connected**.",
    hints: ["One show command lists every port on a line each.", "show interfaces …", "sh int status (show interfaces status)"],
    why: `${PANEL_PORT_SHORT} is the only connected port. It's labelled DANTE, but a router panel isn't Dante. Suspicious.`,
    done: is.intStatus,
  }),
  showRun: (): Objective<World> => ({
    id: "show-run",
    title: "Look at the whole config",
    teach: "Type **sh run** (**show running-config**). Every port has a **switchport access vlan** line.",
    hints: ["The switch's settings are called the running config.", "show running-config", "sh run (show running-config)"],
    why: "That's every setting on the switch. Now zoom in on one port.",
    done: is.showRun,
  }),
  inspectPort: (): Objective<World> => ({
    id: "inspect",
    title: `Look at ${PANEL_PORT_SHORT}'s config`,
    teach: `Type **sh run int ${PORT_TYPED}** (**show running-config interface GigabitEthernet1/0/11**).`,
    hints: [
      "sh run can show just one port.",
      "Add int and the port name to sh run.",
      `sh run int ${PORT_TYPED} (show running-config interface GigabitEthernet1/0/11)`,
    ],
    why: `It's in VLAN ${WRONG_VLAN}, the Dante VLAN.`,
    done: is.inspectedPort,
  }),
  configMode: (): Objective<World> => ({
    id: "conf",
    title: "Enter config mode",
    teach: "Type **conf t** (**configure terminal**). The prompt changes to **(config)#**.",
    hints: ["Changes are made in config mode.", "configure …", "conf t (configure terminal)"],
    why: "You can change settings now.",
    done: is.configMode,
  }),
  selectPort: (): Objective<World> => ({
    id: "select",
    title: `Pick port ${PANEL_PORT_SHORT}`,
    teach: `Type **int ${PORT_TYPED}** (**interface GigabitEthernet1/0/11**). The prompt changes to **(config-if)#**.`,
    hints: ["Port settings live under the interface.", "interface, then the port name.", `int ${PORT_TYPED} (interface GigabitEthernet1/0/11)`],
    why: "What you type now only changes this port.",
    done: is.onPort,
  }),
  vlan: (): Objective<World> => ({
    id: "vlan",
    title: `Move the port to VLAN ${PANEL.vlan}`,
    teach: `Type **sw acc vlan ${PANEL.vlan}** (**switchport access vlan ${PANEL.vlan}**).`,
    hints: ["The port's VLAN is a switchport setting.", "switchport access vlan …", `sw acc vlan ${PANEL.vlan} (switchport access vlan ${PANEL.vlan})`],
    why: `The port is on VLAN ${PANEL.vlan} now, same network as the panel.`,
    done: is.vlanFixed,
  }),
  label: (): Objective<World> => ({
    id: "label",
    title: `Label the port ${LABEL}`,
    teach: `Type **desc ${LABEL}** (**description ${LABEL}**).`,
    hints: ["The label is the port's description.", "description, then the text.", `desc ${LABEL} (description ${LABEL})`],
    why: "The next engineer will know what this port is for.",
    done: is.labeled,
  }),
  verify: (): Objective<World> => ({
    id: "verify",
    title: "Leave config mode and check the port",
    teach: "Type **end**, then **sh int status** (**show interfaces status**).",
    hints: ["Get back to #, then list the ports.", "end, then the command from lesson 1.3.", "end, then sh int status (show interfaces status)"],
    why: `${PANEL_PORT_SHORT}: ${LABEL}, VLAN ${PANEL.vlan}, connected.`,
    ordered: true,
    done: is.intStatus,
  }),
  save: (): Objective<World> => ({
    id: "save",
    title: "Save the config",
    teach: "Type **wr** (**write memory**).",
    hints: ["Unsaved changes are lost when the switch reboots.", "write …", "wr (write memory)"],
    why: "The fix survives a reboot.",
    ordered: true,
    done: is.saved,
  }),
  logout: (): Objective<World> => ({
    id: "logout",
    title: "Leave the switch",
    teach: "Type **exit**. You're back at **C:\\Users\\student>**.",
    hints: ["Close the telnet session.", "One word.", "exit"],
    why: "Back on your PC.",
    ordered: true,
    done: is.loggedOut,
  }),
  panelUp: (): Objective<World> => ({
    id: "panel-up",
    title: `Ping the router panel (${PANEL.ip})`,
    teach: `Type **ping ${PANEL.ip}**.`,
    hints: ["Same test as the start.", "From your PC, not the switch.", `ping ${PANEL.ip}`],
    why: "Replies. The panel is on the network.",
    ordered: true,
    done: is.panelUp,
  }),
}

// ------------------------------------------------------------ lessons

const login = [`telnet ${SW}`, USER, PASSWORD, "en", PASSWORD]

const lessons: Lesson<World>[] = [
  {
    id: "open-terminal",
    number: 1,
    title: "Open the command prompt",
    summary: "Open the window you'll type every command into.",
    tags: ["Start → Run", "cmd"],
    brief: [
      {
        heading: "The command prompt",
        points: [
          "Network gear is set up by typing commands.",
          "On a Windows PC you type them in the command prompt (cmd).",
        ],
      },
      {
        heading: "Open it",
        points: [
          "Click Start, then Run…",
          "Type cmd, press Enter.",
          "On a real Windows PC, Windows key + R opens Run too.",
        ],
      },
    ],
    objectives: [o.runDialog(), o.cmd()],
    aha: "That black window is how you'll reach every device on the network. First stop: Gus's router panel.",
    needsCmd: false,
    solution: [],
  },
  {
    id: "get-on-the-switch",
    number: 2,
    title: "Get on the switch",
    summary: "Ping the panel and the switch, telnet in, get full control.",
    tags: ["ping", "telnet", "enable"],
    brief: [
      {
        heading: "Is it connected?",
        points: [
          "ping sends a small test message to an IP address.",
          "Reply from … = it answered.",
          "Request timed out = no answer.",
          "Ping the panel first, then the switch.",
        ],
        example: `C:\\Users\\student>ping ${SW}\n\nPinging ${SW} with 32 bytes of data:\nReply from ${SW}: bytes=32 time=1ms TTL=254`,
      },
      {
        heading: "Telnet to the switch",
        points: [
          "telnet opens the switch's command line from your PC.",
          `Type: telnet ${SW}`,
          `Log in: ${USER} / ${PASSWORD}`,
          "Passwords don't show as you type.",
        ],
      },
      {
        heading: "> and #",
        points: [
          `${SW_NAME}> = look only.`,
          "en (enable) + password = full control.",
          `${SW_NAME}# = full control.`,
        ],
        example: `${SW_NAME}>en\nPassword:\n${SW_NAME}#`,
      },
    ],
    objectives: [o.pingPanel(), o.pingSwitch(), o.telnet(), o.login(), o.enable()],
    aha: "The switch answers and you have full control. The panel doesn't answer. Next: find where it's plugged in.",
    needsCmd: true,
    solution: [`ping ${PANEL.ip}`, `ping ${SW}`, ...login],
  },
  {
    id: "find-the-port",
    number: 3,
    title: "Find the port",
    summary: "Find the connected port and read its config.",
    tags: ["sh int status", "sh run"],
    brief: [
      {
        heading: "sh int status (show interfaces status)",
        points: [
          "One line per port.",
          "Name = the port's label.",
          "Status = connected (something plugged in) or notconnect.",
          "Vlan = which network the port is on.",
        ],
        example:
          "Port         Name               Status       Vlan\nGi1/0/1      DANTE              notconnect   112\nGi1/0/2      DANTE              notconnect   112",
      },
      {
        heading: "Read the labels",
        points: [
          "A label tells you what the last engineer used the port for.",
          "Every port here says DANTE. This switch was set up for Dante audio.",
          "A router panel isn't Dante. That's a clue.",
          "Label your ports. The next engineer will thank you.",
        ],
      },
      {
        heading: "sh run (show running-config)",
        points: [
          "sh run = every setting on the switch.",
          `sh run int ${PORT_TYPED} = just one port.`,
          "switchport access vlan … = the port's VLAN.",
          "Gi1/0/11 is short for GigabitEthernet1/0/11.",
        ],
        example: `${SW_NAME}#sh run int gi1/0/5\ninterface GigabitEthernet1/0/5\n description DANTE\n switchport access vlan 112\n switchport mode access`,
      },
    ],
    objectives: [o.intStatus(), o.showRun(), o.inspectPort()],
    aha: `Found it. The panel is on a Dante port, VLAN ${WRONG_VLAN}. It needs VLAN ${PANEL.vlan}. Next: fix it.`,
    needsCmd: true,
    solution: ["sh int status", "sh run", `sh run int ${PORT_TYPED}`],
  },
  {
    id: "fix-it",
    number: 4,
    title: `Move the port to VLAN ${PANEL.vlan}`,
    summary: `Change the VLAN, label it ${LABEL}, save, ping the panel.`,
    tags: ["conf t", "switchport", "description", "wr"],
    brief: [
      {
        heading: "Why it's broken",
        points: [
          `Panel ${PANEL.ip} is on the 10.1.14.x network = VLAN ${PANEL.vlan}.`,
          `Its port is in VLAN ${WRONG_VLAN} (Dante). Different network, so nothing reaches it.`,
          `Fix: put the port in VLAN ${PANEL.vlan}.`,
        ],
      },
      {
        heading: "Config mode",
        points: [
          "conf t (configure terminal): # → (config)#",
          `int ${PORT_TYPED} (interface GigabitEthernet1/0/11): → (config-if)#`,
          "end: back to #",
        ],
        example: `${SW_NAME}#conf t\n${SW_NAME}(config)#int gi1/0/5\n${SW_NAME}(config-if)#`,
      },
      {
        heading: "The change",
        points: [
          `sw acc vlan ${PANEL.vlan} (switchport access vlan ${PANEL.vlan})`,
          `desc ${LABEL} (description ${LABEL})`,
          "Changes apply right away.",
        ],
      },
      {
        heading: "Save and test",
        points: [
          "wr (write memory) saves. Skip it and the fix is gone after a reboot.",
          "exit leaves the switch.",
          "Ping the panel from your PC.",
        ],
      },
    ],
    objectives: [o.configMode(), o.selectPort(), o.vlan(), o.label(), o.verify(), o.save(), o.logout(), o.panelUp()],
    aha: "Replies from the panel. Gus's router panel is back on the network. Ticket closed.",
    needsCmd: true,
    solution: [],
  },
]

export const section1: TerminalSection = {
  kind: "terminal",
  id: "field-switch",
  number: 1,
  title: "Router panel down",
  summary: "A router panel on field switch CREEKY_EXT_9003 isn't working. Find out why and fix it.",
  ticket: {
    from: "Gus",
    role: "A2",
    who: "gus",
    message:
      "My router panel won't connect... I plugged it into the field switch, EXT_9003, and nothing. " +
      "I'm gonna go get another coffee! I need this to work before lunch!!",
    facts: [
      `Panel: ${PANEL.ip} (VLAN ${PANEL.vlan})`,
      `Switch: ${SW_NAME}, ${SW}`,
      `Telnet login: ${USER} / ${PASSWORD}`,
      `Enable password: ${PASSWORD}`,
      `When it works, label the port ${LABEL}`,
    ],
    solved: "It connects! And before lunch, too. Nice label. I'm getting another coffee.",
  },
  network: [
    `Your PC: ${WORKSTATION.ip}, gateway ${WORKSTATION.gateway}.`,
    `${SW_NAME}: ${SW} (VLAN 69).`,
    `Router panel: ${PANEL.ip}, belongs on VLAN ${PANEL.vlan} (10.1.14.x).`,
    `VLAN ${WRONG_VLAN} is Dante (10.1.12.x).`,
  ],
  topology: {
    nodes: [
      { id: WORKSTATION.hostname, label: "Your PC", sub: WORKSTATION.computerName, ip: WORKSTATION.ip, icon: "pc" },
      { id: SW_NAME, label: "EXT_9003", sub: "field switch", ip: SW, icon: "switch" },
      { id: "panel", label: "Panel", sub: "router panel", ip: PANEL.ip, icon: "panel" },
    ],
    links: [{ note: "routed" }, { b: "Gi1/0/?" }],
  },
  lessons,
  quiz: {
    par: 240,
    summary: "The whole job from a fresh desktop. No help. Timed.",
    objectives: [
      o.cmd(),
      o.telnetLogin(),
      o.enable(),
      { ...o.intStatus(), title: "Find the connected port", why: "Found the connected port." },
      o.vlan(),
      o.label(),
      o.save(),
      o.logout(),
      o.panelUp(),
    ],
  },
  createWorld,
  react,
  solved,
}
