"use client"

import { Header } from "@/components/header"
import { TokenGrid } from "@/components/token-grid"
import { Button } from "@/components/ui/button"
import { Wallet, Coins, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { WalletConnector } from "@aptos-labs/wallet-adapter-mui-design"
import { useState, useEffect } from "react"
import { WalletDebug } from "@/components/WalletDebug"
import { Network } from "@aptos-labs/ts-sdk"


export default function Dashboard() {
  // All available functions from useWallet hook
  const { 
    connected,           // boolean - whether wallet is connected
    isLoading,           // boolean - whether wallet is loading
    account,             // AccountInfo | null - connected account info
    network,             // NetworkInfo | null - current network info
    connect,             // function - connect to wallet by name
    disconnect,          // function - disconnect wallet
    signIn,              // function - sign in with wallet
    signAndSubmitTransaction, // function - sign and submit transaction
    signTransaction,     // function - sign transaction without submitting
    signMessage,         // function - sign a message
    signMessageAndVerify, // function - sign message and verify
    changeNetwork,       // function - change network
    submitTransaction,   // function - submit transaction
    wallet,              // AdapterWallet | null - current wallet instance
    wallets,             // ReadonlyArray<AdapterWallet> - available wallets
    notDetectedWallets   // ReadonlyArray<AdapterNotDetectedWallet> - wallets not detected
  } = useWallet();




  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">H</span>
              </div>
              <h1 className="text-xl font-bold text-foreground">HODL Manager</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <WalletConnector />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {connected ? (
          <>
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Portfolio Overview</h1>
                <p className="text-muted-foreground">Manage your crypto holdings with smart trading features</p>
              </div>
              <div className="flex space-x-2">
                <Link href="/dashboard">
                  <Button variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Trading Strategy Dashboard
                  </Button>
                </Link>
                <Link href="/memecoins">
                  <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white">
                    <Coins className="w-4 h-4 mr-2" />
                    Select Memecoins
                  </Button>
                </Link>
              </div>
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
            <WalletConnector />
          </div>
        )}
      </main>
      
      <WalletDebug />
    </div>
  )
}
