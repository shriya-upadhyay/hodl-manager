"use client"

import { Header } from "@/components/header"
import { TokenGrid } from "@/components/token-grid"
import { Button } from "@/components/ui/button"
import { Wallet, Coins } from "lucide-react"
import { useState } from "react"
import Link from "next/link"

export default function Dashboard() {
  const [isWalletConnected, setIsWalletConnected] = useState(false)

  const handleWalletConnect = () => {
    // Simulate wallet connection
    setIsWalletConnected(true)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header isConnected={isWalletConnected} onConnect={handleWalletConnect} />
      <main className="container mx-auto px-4 py-8">
        {isWalletConnected ? (
          <>
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Portfolio Overview</h1>
                <p className="text-muted-foreground">Manage your crypto holdings with smart trading features</p>
              </div>
              <Link href="/memecoins">
                <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white">
                  <Coins className="w-4 h-4 mr-2" />
                  Select Memecoins
                </Button>
              </Link>
            </div>
            <TokenGrid />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
              <Wallet className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Connect Your Wallet</h2>
            <p className="text-muted-foreground mb-8 max-w-md">
              Connect your crypto wallet to view your portfolio, track holdings, and enable smart trading features.
            </p>
            <Button
              onClick={handleWalletConnect}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Wallet className="w-5 h-5 mr-2" />
              Connect Wallet
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
