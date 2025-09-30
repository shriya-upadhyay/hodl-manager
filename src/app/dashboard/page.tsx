"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { Settings, Trash2 } from "lucide-react"

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

interface TokenStatus {
  price: number
  takeProfitHit: boolean
  stopLossHit: boolean
  lastChecked: string
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
  const [tokenStatuses, setTokenStatuses] = useState<Record<string, TokenStatus>>({})
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

  useEffect(() => {
    if (!strategy || strategy.tokens.length === 0) return

    let isCancelled = false

    const fetchLatestPrices = async () => {
      try {
        const symbols = strategy.tokens.map((token) => token.symbol.toUpperCase()).join(",")
        if (!symbols) return

        const response = await fetch(`/api/memecoins?symbols=${encodeURIComponent(symbols)}&convert=USD`)
        if (!response.ok) throw new Error(`Price fetch failed: ${response.status}`)

        const json = await response.json()
        const latest = json.data as Array<{ symbol: string; price: number; priceFormatted: string }>
        const timestamp = json.timestamp as string
        const nextStatuses: Record<string, TokenStatus> = {}

        for (const token of strategy.tokens) {
          const symbol = token.symbol.toUpperCase()
          const match = latest.find((item) => item.symbol === symbol)
          if (!match) continue

          const takeProfitHit = Boolean(strategy.aiTakeProfit && token.takeProfitTarget && match.price >= token.takeProfitTarget)
          const stopLossHit = Boolean(strategy.aiStopLoss && token.stopLossTarget && match.price <= token.stopLossTarget)

          nextStatuses[symbol] = {
            price: match.price,
            takeProfitHit,
            stopLossHit,
            lastChecked: timestamp,
          }
        }

        if (!isCancelled) {
          setTokenStatuses(nextStatuses)
        }
      } catch (error) {
        console.error("Failed to poll token prices:", error)
      }
    }

    fetchLatestPrices()
    const interval = setInterval(fetchLatestPrices, 60_000)

    return () => {
      isCancelled = true
      clearInterval(interval)
    }
  }, [strategy])

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

  const handleDeleteStrategy = () => {
    if (typeof window !== "undefined" && !window.confirm("Are you sure you want to delete this strategy?")) {
      return
    }
    localStorage.removeItem("deployedStrategy")
    setStrategy(null)
    setTokenStatuses({})
  }

  return (
    <div className="min-h-screen bg-background">
      <Header isConnected={connected} onConnect={() => {}} />
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Trading Strategy Dashboard</h1>
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
                        {(() => {
                          const status = tokenStatuses[token.symbol.toUpperCase()]
                          const priceToShow = status?.price ?? token.price
                          return (
                            <div className="text-xs text-muted-foreground">
                              Live Price: ${priceToShow.toFixed(4)}
                              {status?.lastChecked ? ` • Updated ${new Date(status.lastChecked).toLocaleTimeString()}` : ""}
                            </div>
                          )
                        })()}
                      </div>
                      <Badge className={`${getRiskBadgeColor(token.riskScore)} border text-xs px-2 py-0.5`}>
                        {token.riskScore === "safe" ? "LOW" : token.riskScore === "moderate" ? "MED" : "HIGH"}
                      </Badge>
                      <Badge className="bg-amber-900/40 text-amber-300 border-amber-700/50">
                        {strategy.riskLevel.charAt(0).toUpperCase() + strategy.riskLevel.slice(1)} Risk
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
                      <div className="sm:col-span-2 flex items-center justify-between text-xs text-muted-foreground">
                        {(() => {
                          const status = tokenStatuses[token.symbol.toUpperCase()]
                          if (!status) return <span>Monitoring thresholds…</span>
                    
                          if (status.takeProfitHit) {
                            // call DEX to convert to USD stablecoin
                            return <span className="text-emerald-400">Take profit threshold reached.</span>
                          }

                          if (status.stopLossHit) {
                            // call DEX to convert to USD stablecoin
                            return <span className="text-rose-400">Stop loss threshold reached.</span>
                          }
                          
                          return <span>No thresholds hit yet.</span>
                        })()}
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={handleEditStrategy} aria-label="Edit strategy">
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={handleDeleteStrategy} aria-label="Delete strategy">
                            <Trash2 className="w-4 h-4 text-rose-400" />
                          </Button>
                        </div>
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
