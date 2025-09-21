"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { Settings } from "lucide-react"

interface StrategyToken {
  id: string
  name: string
  symbol: string
  price: number
  balance: number
  logo: string
  riskScore: "safe" | "moderate" | "high"
  takeProfitTarget: number | null
  stopLossTarget: number | null
}

interface StoredStrategy {
  aiTakeProfit: boolean
  aiStopLoss: boolean
  riskLevel: "conservative" | "moderate" | "aggressive"
  customOrders: boolean
  takeProfitPrice: string
  stopLossPrice: string
  trailingStop: string
  estimatedGas: number
  tokens: StrategyToken[]
  timestamp: number
}

const getRiskBadgeColor = (risk: string) => {
  switch (risk) {
    case "safe":
      return "bg-emerald-900/40 text-emerald-300 border-emerald-700/50"
    case "moderate":
      return "bg-amber-900/40 text-amber-300 border-amber-700/50"
    case "high":
      return "bg-rose-900/40 text-rose-300 border-rose-700/50"
    default:
      return "bg-slate-800/40 text-slate-300 border-slate-700/50"
  }
}

export default function DashboardPage() {
  const [strategy, setStrategy] = useState<StoredStrategy | null>(null)
  const { connected } = useWallet()
  const router = useRouter()

  useEffect(() => {
    try {
      const stored = localStorage.getItem("deployedStrategy")
      if (!stored) {
        setStrategy(null)
        return
      }

      const parsed = JSON.parse(stored) as StoredStrategy
      setStrategy(parsed)
    } catch (error) {
      console.error("Failed to read stored strategy:", error)
      setStrategy(null)
    }
  }, [])

  const handleEditStrategy = () => {
    if (!strategy) return

    try {
      localStorage.setItem("selectedTokens", JSON.stringify(strategy.tokens))
      localStorage.setItem("strategyDraft", JSON.stringify(strategy))
    } catch (error) {
      console.error("Failed to stage strategy for editing:", error)
    }

    router.push("/trading/configure")
  }

  return (
    <div className="min-h-screen bg-background">
      <Header isConnected={connected} onConnect={() => {}} />
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Trading Dashboard</h1>
            <p className="text-sm text-muted-foreground">Review your deployed strategy and monitoring targets</p>
          </div>
          <div className="flex gap-2">
            <Link href="/">
              <Button variant="outline">Portfolio Overview</Button>
            </Link>
            <Link href="/memecoins">
              <Button variant="outline">Configure New Strategy</Button>
            </Link>
          </div>
        </div>

        {!strategy ? (
          <Card>
            <CardHeader>
              <CardTitle>No Strategy Deployed</CardTitle>
              <CardDescription>Select tokens and deploy a strategy to see it here.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/memecoins">
                <Button>Browse Tokens</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Strategy Overview</CardTitle>
                <CardDescription>Key automation settings saved with this deployment</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">AI Take Profit</span>
                  <Badge variant="secondary" className={strategy.aiTakeProfit ? "bg-emerald-900/40 text-emerald-300 border-emerald-700/50" : "bg-slate-800/40 text-slate-300 border-slate-700/50"}>
                    {strategy.aiTakeProfit ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">AI Stop Loss</span>
                  <Badge variant="secondary" className={strategy.aiStopLoss ? "bg-emerald-900/40 text-emerald-300 border-emerald-700/50" : "bg-slate-800/40 text-slate-300 border-slate-700/50"}>
                    {strategy.aiStopLoss ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Risk Level</span>
                  <Badge className="bg-amber-900/40 text-amber-300 border-amber-700/50">
                    {strategy.riskLevel.charAt(0).toUpperCase() + strategy.riskLevel.slice(1)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Custom Orders</span>
                  <span className="font-medium">{strategy.customOrders ? "Enabled" : "Disabled"}</span>
                </div>
                {strategy.customOrders && (
                  <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Take Profit Price</div>
                      <div className="font-medium">{strategy.takeProfitPrice || "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Stop Loss Price</div>
                      <div className="font-medium">{strategy.stopLossPrice || "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Trailing Stop %</div>
                      <div className="font-medium">{strategy.trailingStop || "-"}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Token Targets</CardTitle>
                <CardDescription>Automatic sell points generated from current prices</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {strategy.tokens.map((token) => (
                  <div key={token.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <img src={token.logo} alt={token.name} className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <div className="font-medium">{token.name} ({token.symbol})</div>
                        <div className="text-xs text-muted-foreground">Current Price: ${token.price.toFixed(4)}</div>
                      </div>
                      <Badge className={`${getRiskBadgeColor(token.riskScore)} border text-xs px-2 py-0.5`}>
                        {token.riskScore === "safe" ? "LOW" : token.riskScore === "moderate" ? "MED" : "HIGH"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] sm:grid-cols-[repeat(2,minmax(0,1fr))] gap-3 text-sm items-center">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Take Profit Target</div>
                        <div className="font-medium">{token.takeProfitTarget ? `$${token.takeProfitTarget.toFixed(4)}` : "-"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Stop Loss Target</div>
                        <div className="font-medium">{token.stopLossTarget ? `$${token.stopLossTarget.toFixed(4)}` : "-"}</div>
                      </div>
                      <div className="sm:col-span-2 flex justify-end">
                        <Button variant="ghost" size="icon" onClick={handleEditStrategy} aria-label="Edit strategy">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
