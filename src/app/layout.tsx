import type { Metadata } from "next"
import { Geist, Geist_Mono, Press_Start_2P } from "next/font/google"
import Link from "next/link"
import { Beaver } from "@/components/beaver"
import { ClassNav } from "@/components/class-nav"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

const sans = Geist({ variable: "--font-sans", subsets: ["latin"] })
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })
const pixel = Press_Start_2P({ variable: "--font-pixel", weight: "400", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Creeky · Broadcast engineering basics",
  description: "Hands-on broadcast engineering lessons for beginners.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`dark ${sans.variable} ${mono.variable} ${pixel.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <TooltipProvider>
          <header className="border-b bg-background/80 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
              <Link href="/" className="flex items-center gap-2">
                <Beaver size={28} />
                <span className="font-pixel text-xs tracking-tight text-primary">CREEKY</span>
              </Link>
              <ClassNav />
              <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">Demo · progress saved in this browser</span>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </TooltipProvider>
      </body>
    </html>
  )
}
