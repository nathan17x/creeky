import { WORKSTATION, type World } from "@/lib/sim/network"
import type { Lesson, Objective, TerminalSection } from "../types"
import { GUESSED_MASK, INTERNET, NAME, PC, createWorld, is, react, solved } from "./lab"

const PLAYLIST = "PLQVJk9oC5JKp_8F9LPa3Pv67boA80KLm1"
const IPV4 = "Internet Protocol Version 4 (TCP/IPv4)"

// ------------------------------------------------- reusable objectives

const o = {
  watch: (): Objective<World> => ({
    id: "watch",
    title: "Watch the video",
    teach: "Watch the video, then click **I watched it**.",
    hints: ["The video is in the player window.", "Hit play.", "Watch it, then click I watched it."],
    why: "That's the big picture.",
    done: is.watched,
  }),
  runDialog: (): Objective<World> => ({
    id: "run",
    title: "Open the Run box",
    teach: "Click **Start**, then **Run…**. (On a real Windows PC, **Windows key + R** does the same.)",
    hints: ["Windows has a box for starting programs by name.", "It's in the Start menu.", "Start, then Run…"],
    why: "The Run box starts any program by name.",
    done: is.runDialog,
  }),
  ncpa: (): Objective<World> => ({
    id: "ncpa",
    title: "Run ncpa.cpl",
    teach: "Type **ncpa.cpl** and press Enter.",
    hints: ["It's the network connections control panel.", "n-c-p-a dot c-p-l.", "Type ncpa.cpl, press Enter."],
    why: "Network Connections lists every network adapter on this PC.",
    done: is.ncpa,
  }),
  adapter: (): Objective<World> => ({
    id: "adapter",
    title: "Open Ethernet's properties",
    teach: "Right-click **Ethernet**, then click **Properties**.",
    hints: ["Your PC is plugged in with a cable.", "Cable = Ethernet. Right-click it.", "Right-click Ethernet → Properties."],
    why: "These are the settings for the cable connection.",
    done: is.adapterProps,
  }),
  ipv4: (): Objective<World> => ({
    id: "ipv4",
    title: "Open IPv4 properties",
    teach: `Click **${IPV4}**, then **Properties**. (Double-click works too.)`,
    hints: ["IP addresses are set under one item in the list.", "It's the IPv4 one, not IPv6.", `Select ${IPV4} → Properties.`],
    why: "This is where the PC's address is set.",
    done: is.ipv4Props,
  }),
  staticIp: (): Objective<World> => ({
    id: "static",
    title: "Pick Use the following IP address",
    teach: "Click **Use the following IP address**.",
    hints: ["Automatic isn't working.", "Set it by hand.", "Click Use the following IP address."],
    why: "Now you type the address yourself.",
    done: is.staticIp,
  }),
  ip: (): Objective<World> => ({
    id: "ip",
    title: `IP address: ${PC.ip}`,
    teach: `Click the **IP address** box and type **${PC.ip}**. Press **.** to jump to the next number.`,
    hints: ["Dot's ticket has a free address.", "It starts with 10.1.1.", `Type ${PC.ip}.`],
    why: "That's your PC's address now.",
    done: is.ip,
  }),
  gateway: (): Objective<World> => ({
    id: "gateway",
    title: `Default gateway: ${PC.gateway}`,
    teach: `Type **${PC.gateway}** in **Default gateway**.`,
    hints: ["The gateway is the router out of your network.", "Usually x.x.x.1.", `Type ${PC.gateway}.`],
    why: "Traffic for other networks goes to the gateway.",
    done: is.gateway,
  }),
  mask: (): Objective<World> => ({
    id: "mask",
    title: `Subnet mask: ${PC.mask}`,
    teach: `Change **Subnet mask** from ${GUESSED_MASK} to **${PC.mask}**.`,
    hints: [`Windows guessed ${GUESSED_MASK}. Too big.`, "This network is 10.1.1.x: first three numbers fixed.", `Type ${PC.mask}.`],
    why: "Your network is 10.1.1.x. Everything else goes via the gateway.",
    done: is.mask,
  }),
  ipv4Ok: (): Objective<World> => ({
    id: "ipv4-ok",
    title: "Click OK in IPv4 Properties",
    teach: "Click **OK**.",
    hints: ["Close the IPv4 box and keep the changes.", "Not Cancel.", "Click OK."],
    why: "Saved to Ethernet Properties. Not live yet.",
    done: is.ipv4Ok,
  }),
  apply: (): Objective<World> => ({
    id: "apply",
    title: "Click OK in Ethernet Properties",
    teach: "Click **OK** in **Ethernet Properties**. Nothing changes until this last OK.",
    hints: ["One more box to close.", "Ethernet Properties.", "Click OK in Ethernet Properties."],
    why: "Settings are live.",
    done: is.applied,
  }),
  cmd: (): Objective<World> => ({
    id: "cmd",
    title: "Open the command prompt",
    teach: "**Start**, **Run…**, type **cmd**, press Enter.",
    hints: ["Same Run box as before.", "The command prompt's program name is three letters.", "Start → Run… → cmd."],
    why: "Now you can test.",
    done: is.cmdOpen,
  }),
  pingGateway: (): Objective<World> => ({
    id: "ping-gw",
    title: `Ping the gateway (${PC.gateway})`,
    teach: `Type **ping ${PC.gateway}**. Watch for **Reply from**.`,
    hints: ["Start close to home.", "The gateway's address.", `ping ${PC.gateway}`],
    why: "The gateway answers. Your PC, cable and address are good.",
    done: is.pingGateway,
  }),
  pingInternet: (): Objective<World> => ({
    id: "ping-net",
    title: `Ping ${INTERNET}`,
    teach: `Type **ping ${INTERNET}**. That's a Google server on the internet.`,
    hints: ["Now something outside your network.", "Google's famous address.", `ping ${INTERNET}`],
    why: "The internet answers. The gateway gets you out.",
    done: is.pingInternet,
  }),
  pingNameFails: (): Objective<World> => ({
    id: "ping-name",
    title: `Ping ${NAME}`,
    teach: `Type **ping ${NAME}**.`,
    hints: ["Same test, with a name this time.", "No http, no www.", `ping ${NAME}`],
    why: "Could not find host. Hmm.",
    done: is.nameFails,
  }),
  dns1: (): Objective<World> => ({
    id: "dns1",
    title: `Preferred DNS: ${PC.dns1}`,
    teach: `Type **${PC.dns1}** in **Preferred DNS server**.`,
    hints: ["Bottom half of IPv4 Properties.", "The local DNS server from the ticket.", `Type ${PC.dns1}.`],
    why: "Your PC asks this server first.",
    done: is.dns1,
  }),
  dns2: (): Objective<World> => ({
    id: "dns2",
    title: `Alternate DNS: ${PC.dns2}`,
    teach: `Type **${PC.dns2}** in **Alternate DNS server**.`,
    hints: ["The backup server.", "Google's public DNS.", `Type ${PC.dns2}.`],
    why: "Used if the first one doesn't answer.",
    done: is.dns2,
  }),
  applyDns: (): Objective<World> => ({
    id: "apply-dns",
    title: "Click OK, then OK",
    teach: "Click **OK** in IPv4 Properties, then **OK** in Ethernet Properties.",
    hints: ["Two boxes to close.", "IPv4 first, then Ethernet.", "OK, then OK."],
    why: "DNS is live.",
    done: is.appliedDns,
  }),
  pingName: (): Objective<World> => ({
    id: "ping-google",
    title: `Ping ${NAME}`,
    teach: `Back in the command prompt, type **ping ${NAME}**. (↑ recalls it.)`,
    hints: ["Same test as last lesson.", "In the command prompt.", `ping ${NAME}`],
    why: `${NAME} answers.`,
    done: is.pingName,
  }),
}

// ------------------------------------------------------------ lessons

const settings = ["ncpa", "adapter", "ipv4"] as const

const lessons: Lesson<World>[] = [
  {
    id: "what-is-a-network",
    number: 1,
    title: "What is a network?",
    summary: "A short video on the basics.",
    tags: ["video"],
    brief: [
      {
        heading: "Watch",
        points: ["Short series on networking basics.", "Watch the first one here.", "Worth watching the whole series later."],
        link: { href: `https://www.youtube.com/playlist?list=${PLAYLIST}`, label: "Full series on YouTube" },
      },
    ],
    video: { id: "what-is-a-network", title: "What is a network?", youtube: "R45vj63SZfs", list: PLAYLIST },
    windows: ["video"],
    objectives: [o.watch()],
    aha: "Every device on a network needs an address. Yours doesn't have a working one. Next: find where it's set.",
    solution: [],
  },
  {
    id: "network-settings",
    number: 2,
    title: "Open network settings",
    summary: "Run ncpa.cpl and open the adapter's IPv4 properties.",
    tags: ["ncpa.cpl", "IPv4"],
    brief: [
      {
        heading: "ncpa.cpl",
        points: [
          "Opens Network Connections: every network adapter on the PC.",
          "Start → Run… → ncpa.cpl.",
          "On a real PC: Windows key + R, ncpa.cpl. Faster than digging through Settings.",
        ],
      },
      {
        heading: "Adapters",
        points: ["Ethernet = the cable.", "Wi-Fi = wireless.", "Your PC is on a cable: Ethernet."],
      },
      {
        heading: "Get to the address",
        points: ["Right-click Ethernet → Properties.", `Select ${IPV4} → Properties.`],
      },
    ],
    objectives: [o.runDialog(), o.ncpa(), o.adapter(), o.ipv4()],
    aha: "Your PC is set to get an address automatically. Nothing here hands one out. Next: set it yourself.",
    solution: [],
  },
  {
    id: "ip-address",
    number: 3,
    title: "Set the IP address",
    summary: `Set a fixed address: ${PC.ip}.`,
    tags: ["static IP"],
    brief: [
      {
        heading: "Automatic (DHCP)",
        points: [
          "Automatic = ask a DHCP server for an address.",
          "No DHCP server here. Windows gave itself 169.254.x.x, which reaches nothing.",
          "Broadcast gear usually gets fixed (static) addresses.",
        ],
      },
      {
        heading: "IP address",
        points: [
          "Your PC's address on the network.",
          "Two devices with the same address = both break.",
          "Pick one you know is free. Check the IP sheet or ask.",
          `Yours: ${PC.ip}.`,
        ],
      },
    ],
    windows: [...settings],
    objectives: [o.staticIp(), o.ip()],
    prepare: (w) => {
      w.nic.openDraft()
      Object.assign(w.nic.draft!, { dhcp: false, dnsAuto: false, ip: PC.ip, mask: GUESSED_MASK })
    },
    aha: `Windows filled in a subnet mask: ${GUESSED_MASK}. Hold that thought. Next: the gateway.`,
    solution: [],
  },
  {
    id: "gateway",
    number: 4,
    title: "Set the gateway",
    summary: `Set the default gateway: ${PC.gateway}.`,
    tags: ["gateway"],
    brief: [
      {
        heading: "Default gateway",
        points: [
          "The router that's the way out of your network.",
          "Anything not on your network goes to the gateway.",
          "No gateway = you only reach your own network. No internet.",
          `Usually the first address: x.x.x.1. Here: ${PC.gateway}.`,
        ],
      },
    ],
    windows: [...settings],
    objectives: [o.gateway()],
    prepare: (w) => {
      w.nic.draft!.gateway = PC.gateway
    },
    aha: "Gateway set. Next: fix the mask Windows guessed.",
    solution: [],
  },
  {
    id: "subnet-mask",
    number: 5,
    title: "Set the subnet mask",
    summary: `Set the mask to ${PC.mask} and save.`,
    tags: ["subnet mask", "CIDR"],
    brief: [
      {
        heading: "Subnet mask",
        points: [
          "Says which addresses are on your network.",
          `${PC.mask} = first three numbers must match. 10.1.1.x is local.`,
          "Local: your PC talks to it directly. Not local: it goes to the gateway.",
          `Windows guessed ${GUESSED_MASK}. That makes every 10.x.x.x look local, so your PC skips the gateway for them.`,
          `Usually ${PC.mask}.`,
        ],
      },
      {
        heading: "Slash (CIDR) notation",
        points: [
          "Count the 1 bits in the mask.",
          `${PC.mask} = /24. 255.255.0.0 = /16. 255.0.0.0 = /8.`,
          `${PC.ip}/${PC.prefix} = IP ${PC.ip}, mask ${PC.mask}.`,
        ],
      },
      {
        heading: "Save",
        points: ["OK in IPv4 Properties, then OK in Ethernet Properties.", "Nothing changes until the last OK."],
      },
    ],
    windows: [...settings],
    objectives: [o.mask(), o.ipv4Ok(), o.apply()],
    prepare: (w) => {
      w.nic.draft!.mask = PC.mask
      w.nic.saveDraft()
      w.nic.apply()
    },
    aha: "Settings are live. Did it work? Next: test it.",
    solution: [],
  },
  {
    id: "test",
    number: 6,
    title: "Test the connection",
    summary: `Ping the gateway, ${INTERNET}, then ${NAME}.`,
    tags: ["ping"],
    brief: [
      {
        heading: "ping",
        points: [
          "ping = are you there?",
          "Reply from … = it answered. Request timed out = no answer.",
          "Test from close to far.",
        ],
        example: `C:\\Users\\student>ping ${PC.gateway}\n\nPinging ${PC.gateway} with 32 bytes of data:\nReply from ${PC.gateway}: bytes=32 time=1ms TTL=255`,
      },
      {
        heading: "The order",
        points: [
          `${PC.gateway} (gateway) works = your PC, cable and address are good.`,
          `${INTERNET} (Google, on the internet) works = the gateway gets you out.`,
          `Then ${NAME}.`,
        ],
      },
    ],
    windows: ["ncpa"],
    objectives: [o.cmd(), o.pingGateway(), o.pingInternet(), o.pingNameFails()],
    aha: `Numbers work. Names don't. Your PC doesn't know who to ask for ${NAME}'s address. Next: fix that.`,
    solution: [`ping ${PC.gateway}`, `ping ${INTERNET}`, `ping ${NAME}`],
  },
  {
    id: "dns",
    number: 7,
    title: "Set DNS",
    summary: `Add DNS servers ${PC.dns1} and ${PC.dns2}, then ping ${NAME}.`,
    tags: ["DNS"],
    brief: [
      {
        heading: "DNS",
        points: [
          `Turns names (${NAME}) into IP addresses (142.250.80.46).`,
          "No DNS server = names fail, numbers still work.",
          "That's what you just saw.",
        ],
      },
      {
        heading: "Set it",
        points: [
          "ncpa.cpl → Ethernet → Properties → IPv4 → Properties.",
          `Preferred: ${PC.dns1} (the local DNS server).`,
          `Alternate: ${PC.dns2} (Google's public DNS). Used if the first doesn't answer.`,
          "OK, OK. Then ping again.",
        ],
      },
    ],
    windows: ["ncpa"],
    needsCmd: true,
    objectives: [
      { ...o.adapter(), teach: "Click **Network Connections** on the taskbar. Right-click **Ethernet**, then **Properties**." },
      o.ipv4(),
      o.dns1(),
      o.dns2(),
      o.applyDns(),
      o.pingName(),
    ],
    aha: `${NAME} answers. You're online. Go find Dot some lunch.`,
    solution: [],
  },
]

export const section0: TerminalSection = {
  kind: "terminal",
  id: "connect-pc",
  number: 0,
  title: "No internet",
  summary: "Your PC isn't on the network. Give it an address, gateway, mask and DNS.",
  ticket: {
    from: "Dot",
    role: "EIC",
    who: "dot",
    message: "Can you find us a good lunch spot? What do you mean you don't have internet?? I'm getting hangry!!",
    facts: [
      `Free IP for you: ${PC.ip}`,
      `Subnet mask: ${PC.mask}`,
      `Gateway: ${PC.gateway}`,
      `DNS: ${PC.dns1}, then ${PC.dns2}`,
    ],
    solved: "Google works? Great. Tacos. Go.",
  },
  tip: "Click a window to use it. Taskbar buttons switch windows. Drag a title bar to move one. In the IP boxes, . jumps to the next number.",
  network: [
    `Your PC: gets ${PC.ip}/${PC.prefix}.`,
    `Gateway (router): ${PC.gateway}.`,
    `DNS server: ${PC.dns1}.`,
    `Internet test address: ${INTERNET}.`,
  ],
  topology: {
    nodes: [
      { id: WORKSTATION.hostname, label: "Your PC", sub: WORKSTATION.computerName, ip: PC.ip, icon: "pc" },
      { id: "gateway", label: "Gateway", sub: "router", ip: PC.gateway, icon: "router" },
      { id: "internet", label: "Internet", sub: NAME, ip: INTERNET, icon: "cloud" },
    ],
    links: [{ note: "10.1.1.0/24" }, {}],
  },
  lessons,
  quiz: {
    par: 150,
    summary: "Set up the PC from scratch and reach google.com. No help. Timed.",
    objectives: [
      o.ncpa(),
      o.ipv4(),
      o.ip(),
      o.mask(),
      o.gateway(),
      o.dns1(),
      o.dns2(),
      { ...o.applyDns(), title: "Save the settings" },
      o.cmd(),
      o.pingName(),
    ],
  },
  createWorld,
  react,
  solved,
}
