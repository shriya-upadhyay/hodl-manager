import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import WalletProvider from "@/components/WalletProvider"
import "./globals.css"

export const metadata: Metadata = {
  title: "HODLManager - Crypto Portfolio Dashboard",
  description: "Modern crypto portfolio management with smart trading features",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <WalletProvider>
          <Suspense fallback={null}>{children}</Suspense>
          <Analytics />
        </WalletProvider>
      </body>
    </html>
  )
}
