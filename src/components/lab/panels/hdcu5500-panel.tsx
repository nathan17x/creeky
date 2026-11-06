import { HDCU5500_SIZE } from "@/lib/wiring/panels/hdcu5500"

/**
 * Sony HDCU-5500 rear panel, drawn in panel units (764 x 476) from a
 * rear-panel photo. Label text is sized to match the real silkscreen.
 */

const FONT = "'Arial Narrow', 'Helvetica Neue', Arial, sans-serif"
const ROWS = [43, 116, 190, 263]

function Label({ x, y, children, dark, size = 9.5 }: { x: number; y: number; children: string; dark?: boolean; size?: number }) {
  return (
    <text x={x} y={y} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={size} fill={dark ? "#111" : "#f4f4f5"} letterSpacing={0.1}>
      {children}
    </text>
  )
}

function Screw({ x, y, r = 6 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="url(#hd-screw)" stroke="#2a2a2a" strokeWidth={0.8} />
      <path d={`M ${x - r * 0.55} ${y} H ${x + r * 0.55} M ${x} ${y - r * 0.55} V ${y + r * 0.55}`} stroke="#3f3f46" strokeWidth={1.2} />
    </g>
  )
}

function Bnc({ x, y, r = 21 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="url(#hd-silver)" stroke="#52525b" strokeWidth={1} />
      <circle cx={x} cy={y} r={r * 0.78} fill="none" stroke="#a1a1aa" strokeWidth={1} />
      <circle cx={x} cy={y} r={r * 0.6} fill="#1c1917" />
      <circle cx={x} cy={y} r={r * 0.44} fill="url(#hd-gold)" />
      <circle cx={x} cy={y} r={r * 0.22} fill="#1c1917" />
      <circle cx={x} cy={y} r={r * 0.1} fill="#fafafa" />
      <rect x={x - r - 2} y={y - 1.5} width={4} height={3} rx={1} fill="#d4d4d8" />
      <rect x={x + r - 2} y={y - 1.5} width={4} height={3} rx={1} fill="#d4d4d8" />
    </g>
  )
}

function Xlr({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={40} fill="url(#hd-silver)" stroke="#52525b" />
      <circle cx={x} cy={y} r={33} fill="#0a0a0a" />
      <rect x={x - 5} y={y - 37} width={10} height={7} rx={1.5} fill="#71717a" />
      {[
        [-11, -6],
        [11, -6],
        [0, 12],
      ].map(([dx, dy]) => (
        <circle key={`${dx}${dy}`} cx={x + dx} cy={y + dy} r={6.5} fill="url(#hd-gold)" stroke="#0a0a0a" />
      ))}
    </g>
  )
}

function Rj45({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 23} y={y - 18} width={46} height={36} rx={2} fill="url(#hd-plate)" stroke="#71717a" />
      <rect x={x - 16} y={y - 11} width={32} height={22} fill="#0a0a0a" />
      <rect x={x - 7} y={y + 7} width={14} height={5} fill="#0a0a0a" />
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={x - 12 + i * 3.2} y={y - 10} width={1.6} height={5} fill="url(#hd-gold)" />
      ))}
    </g>
  )
}

export function Hdcu5500Panel() {
  const { w, h } = HDCU5500_SIZE
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 h-full w-full" role="img" aria-label="Sony HDCU-5500 rear panel">
      <defs>
        <linearGradient id="hd-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b1b1d" />
          <stop offset="1" stopColor="#0f0f10" />
        </linearGradient>
        <radialGradient id="hd-silver" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fafafa" />
          <stop offset="0.55" stopColor="#c4c4c8" />
          <stop offset="1" stopColor="#71717a" />
        </radialGradient>
        <radialGradient id="hd-gold" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.6" stopColor="#c9a24a" />
          <stop offset="1" stopColor="#7c5e1d" />
        </radialGradient>
        <radialGradient id="hd-screw" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#e4e4e7" />
          <stop offset="1" stopColor="#71717a" />
        </radialGradient>
        <linearGradient id="hd-plate" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d4d4d8" />
          <stop offset="1" stopColor="#a1a1aa" />
        </linearGradient>
        <linearGradient id="hd-flange" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4f4f5" />
          <stop offset="0.5" stopColor="#a1a1aa" />
          <stop offset="1" stopColor="#e4e4e7" />
        </linearGradient>
      </defs>

      {/* chassis face */}
      <rect x={0} y={0} width={w} height={h} rx={4} fill="url(#hd-face)" stroke="#52525b" strokeWidth={2} />
      <path d={`M 2 300 H 222 V 330 H 525 V 368 H 760`} fill="none" stroke="#27272a" strokeWidth={1.5} />
      <path d={`M 222 368 V 474`} fill="none" stroke="#27272a" strokeWidth={1.5} />

      {/* frame screws */}
      {[
        [17, 25],
        [21, 228],
        [17, 371],
        [32, 400],
        [748, 25],
        [748, 68],
        [748, 158],
        [742, 450],
        [62, 38],
        [94, 220],
        [180, 25],
        [172, 148],
        [170, 171],
        [137, 250],
        [122, 370],
        [244, 394],
        [244, 452],
      ].map(([x, y]) => (
        <Screw key={`${x}-${y}`} x={x} y={y} />
      ))}

      {/* option slot */}
      <rect x={37} y={56} width={70} height={150} rx={2} fill="url(#hd-plate)" stroke="#52525b" />

      {/* CHARACTER / AES/EBU / SYNC */}
      <Label x={144} y={13}>CHARACTER / AES/EBU</Label>
      <Label x={112} y={24}>/ SYNC</Label>
      <Bnc x={148} y={38} r={20} />

      {/* RCP/CNU */}
      <Label x={144} y={92}>RCP/CNU</Label>
      <circle cx={122} cy={95} r={5} fill="#3f3f46" stroke="#a1a1aa" />
      <circle cx={144} cy={119} r={19} fill="url(#hd-silver)" stroke="#52525b" />
      <circle cx={144} cy={119} r={14} fill="#18181b" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        return <circle key={i} cx={144 + Math.cos(a) * 8} cy={119 + Math.sin(a) * 8} r={1.7} fill="url(#hd-gold)" />
      })}
      <circle cx={122} cy={146} r={3} fill="#a1a1aa" />

      {/* TRUNK */}
      <Label x={144} y={166}>TRUNK</Label>
      <circle cx={144} cy={203} r={26} fill="url(#hd-silver)" stroke="#52525b" />
      <circle cx={144} cy={203} r={20} fill="#18181b" />
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2
        return <circle key={i} cx={144 + Math.cos(a) * 12} cy={203 + Math.sin(a) * 12} r={1.8} fill="url(#hd-gold)" />
      })}
      <circle cx={144} cy={203} r={2} fill="url(#hd-gold)" />

      {/* SDI OUT / SDI I/O block */}
      <rect x={200} y={20} width={118} height={273} rx={8} fill="none" stroke="#d4d4d8" strokeWidth={1.2} />
      {ROWS.map((y, i) => (
        <g key={`out-${i}`}>
          <Label x={224} y={y - 25}>{`SDI OUT ${i + 1}`}</Label>
          <Bnc x={224} y={y} />
          {i === 2 ? (
            <>
              <rect x={266} y={y - 35} width={48} height={13} fill="#f4f4f5" />
              <Label x={290} y={y - 25} dark>SDI I/O 3</Label>
            </>
          ) : (
            <Label x={290} y={y - 25}>{`SDI I/O ${i + 1}`}</Label>
          )}
          <Bnc x={290} y={y} />
          <Screw x={257} y={y + 26} r={5} />
        </g>
      ))}

      {/* SDI RET / REFERENCE / PROMPTER block */}
      <rect x={334} y={20} width={118} height={273} rx={8} fill="none" stroke="#d4d4d8" strokeWidth={1.2} />
      {ROWS.map((y, i) => (
        <g key={`ret-${i}`}>
          <Label x={360} y={y - 25}>{`SDI RET ${i + 1}`}</Label>
          <Bnc x={360} y={y} />
          <Bnc x={426} y={y} />
          <Screw x={393} y={y + 26} r={5} />
        </g>
      ))}
      <Label x={426} y={18}>REFERENCE</Label>
      <line x1={426} y1={66} x2={426} y2={93} stroke="#f4f4f5" strokeWidth={1.5} />
      <Label x={426} y={165}>PROMPTER 1</Label>
      <Label x={426} y={227}>PROMPTER 2</Label>
      <Label x={426} y={238}>/ VBS RET</Label>
      <circle cx={323} cy={291} r={3} fill="#a1a1aa" />

      {/* UHD SDI strip */}
      <rect x={480} y={68} width={47} height={306} rx={2} fill="url(#hd-plate)" stroke="#52525b" />
      <Label x={503} y={80} dark size={8.5}>UHD SDI</Label>
      {[116, 190, 263, 338].map((y, i) =>
        i === 1 ? (
          <g key={i}>
            <rect x={497} y={y - 37} width={12} height={12} fill="#18181b" />
            <Label x={503} y={y - 27} size={9}>B</Label>
            <Bnc x={504} y={y} r={19} />
          </g>
        ) : (
          <g key={i}>
            <Label x={503} y={y - 27} dark size={9}>{"ACD"[i === 0 ? 0 : i - 1]}</Label>
            <Bnc x={504} y={y} r={19} />
          </g>
        )
      )}

      {/* UHB badge */}
      <rect x={515} y={16} width={64} height={24} rx={3} fill="#c8a77a" stroke="#7c5e1d" />
      <text x={547} y={34} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={17} fill="#18181b">
        UHB
      </text>

      {/* CAMERA fiber connector */}
      <Label x={657} y={11}>CAMERA</Label>
      <rect x={551} y={19} width={212} height={166} rx={4} fill="url(#hd-flange)" stroke="#52525b" />
      <rect x={573} y={34} width={168} height={136} rx={6} fill="#d4d4d8" stroke="#71717a" />
      <circle cx={657} cy={93} r={72} fill="url(#hd-flange)" stroke="#52525b" strokeWidth={1.5} />
      <circle cx={657} cy={93} r={58} fill="url(#hd-silver)" stroke="#71717a" />
      <circle cx={657} cy={93} r={40} fill="#d4d4d8" stroke="#52525b" />
      <circle cx={657} cy={93} r={26} fill="#3f3f46" />
      <circle cx={657} cy={93} r={20} fill="url(#hd-gold)" />
      {[
        [-7, -7],
        [7, -7],
        [-7, 7],
        [7, 7],
      ].map(([dx, dy]) => (
        <circle key={`${dx}${dy}`} cx={657 + dx} cy={93 + dy} r={4} fill="#1c1917" stroke="#fef3c7" strokeWidth={0.8} />
      ))}
      <rect x={655} y={30} width={4} height={10} rx={1} fill="#dc2626" />
      {[
        [609, 45],
        [705, 45],
        [609, 141],
        [705, 141],
      ].map(([x, y]) => (
        <Screw key={`f${x}${y}`} x={x} y={y} r={8} />
      ))}
      <Screw x={563} y={35} r={6} />
      <Screw x={751} y={150} r={6} />

      {/* vent */}
      <g>
        <rect x={550} y={186} width={200} height={172} fill="#3f3f46" />
        {Array.from({ length: 25 }, (_, i) => (
          <rect key={i} x={553 + (i % 5) * 39.4} y={189 + Math.floor(i / 5) * 33.6} width={35} height={30} fill="#050505" />
        ))}
      </g>

      {/* AC inlet */}
      <rect x={572} y={362} width={162} height={98} rx={3} fill="#18181b" stroke="#3f3f46" />
      <Screw x={584} y={410} r={8} />
      <Screw x={722} y={410} r={8} />
      <path d="M 612 376 H 694 V 418 L 680 432 H 626 L 612 418 Z" fill="#0a0a0a" stroke="#52525b" strokeWidth={2} />
      {[630, 652, 674].map((x, i) => (
        <rect key={x} x={x - 3} y={i === 1 ? 386 : 396} width={6} height={18} fill="url(#hd-silver)" />
      ))}
      <text x={746} y={386} fontFamily={FONT} fontSize={12} fill="#a1a1aa">
        ~
      </text>

      {/* NETWORK TRUNK / LAN COM */}
      <rect x={209} y={314} width={12} height={10} fill="none" stroke="#a1a1aa" />
      <rect x={432} y={314} width={12} height={10} fill="none" stroke="#a1a1aa" />
      <Label x={274} y={311}>NETWORK TRUNK</Label>
      <Rj45 x={274} y={343} />
      <Label x={362} y={311}>LAN COM</Label>
      <Rj45 x={362} y={343} />

      {/* AUDIO OUT */}
      <Label x={134} y={350}>AUDIO OUT</Label>
      <Label x={92} y={364}>CH1</Label>
      <Label x={204} y={364}>CH2</Label>
      <Xlr x={90} y={406} />
      <Xlr x={182} y={406} />

      {/* INTERCOM / TALLY / IO PORT */}
      <rect x={258} y={372} width={312} height={98} fill="none" stroke="#3f3f46" />
      <Label x={391} y={386}>INTERCOM / TALLY / IO PORT</Label>
      <Screw x={278} y={426} r={7} />
      <Screw x={515} y={426} r={7} />
      <path d="M 288 403 H 494 L 484 450 H 298 Z" fill="url(#hd-silver)" stroke="#52525b" />
      <path d="M 296 409 H 486 L 478 444 H 304 Z" fill="#0a0a0a" />
      {Array.from({ length: 25 }, (_, i) => (
        <circle key={`a${i}`} cx={308 + i * 7.1} cy={418} r={1.6} fill="url(#hd-gold)" />
      ))}
      {Array.from({ length: 24 }, (_, i) => (
        <circle key={`b${i}`} cx={312 + i * 7.1} cy={430} r={1.6} fill="url(#hd-gold)" />
      ))}

      {/* branding */}
      <text x={70} y={462} textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontWeight={700} fontSize={14} fill="#f4f4f5" letterSpacing={1}>
        SONY
      </text>
      <text x={124} y={461} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={15} fill="#f4f4f5">
        CE
      </text>
    </svg>
  )
}
