"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { Settings, Trash2, DollarSign, ExternalLink, X } from "lucide-react"

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
  stopLossExecuted?: boolean
  takeProfitExecuted?: boolean
  executionHash?: string
  usdcReceived?: number
  soldAt?: number // Timestamp when token was sold
  soldPrice?: number // Price at which token was sold
  isSold?: boolean // Whether the token has been sold
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
  const [executingStopLoss, setExecutingStopLoss] = useState<Set<string>>(new Set())
  const [sellingTokens, setSellingTokens] = useState<Set<string>>(new Set())
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    explorerUrl: string;
    timestamp: number;
  }>>([])
  const { connected } = useWallet()
  const router = useRouter()
  
  // Use refs to track latest state for the interval callback
  const tokenStatusesRef = useRef(tokenStatuses)
  const executingStopLossRef = useRef(executingStopLoss)
  
  // Update refs when state changes
  useEffect(() => {
    tokenStatusesRef.current = tokenStatuses
  }, [tokenStatuses])
  
  useEffect(() => {
    executingStopLossRef.current = executingStopLoss
  }, [executingStopLoss])

  // Function to add success notification with explorer link
  const addNotification = (message: string, explorerUrl: string) => {
    const notification = {
      id: Date.now().toString(),
      message,
      explorerUrl,
      timestamp: Date.now(),
    }
    setNotifications(prev => [notification, ...prev.slice(0, 4)]) // Keep only 5 most recent
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id))
    }, 10000)
  }

  // Function to permanently remove sold token from strategy
  const removeSoldTokenFromStrategy = (tokenSymbol: string) => {
    if (!strategy) return

    const updatedStrategy = {
      ...strategy,
      tokens: strategy.tokens.filter(token => token.symbol.toUpperCase() !== tokenSymbol.toUpperCase())
    }

    // Update local state
    setStrategy(updatedStrategy)

    // Update localStorage
    try {
      localStorage.setItem("deployedStrategy", JSON.stringify(updatedStrategy))
      console.log(`🗑️ Removed ${tokenSymbol} from strategy permanently`)
    } catch (error) {
      console.error("Failed to update strategy in localStorage:", error)
    }
  }

  // Function to execute stop loss automatically
  const executeStopLoss = async (token: StrategyToken, currentPrice: number) => {
    const symbol = token.symbol.toUpperCase()
    
    // Prevent duplicate executions
    if (executingStopLoss.has(symbol)) return
    
    setExecutingStopLoss(prev => new Set([...prev, symbol]))
    
    try {
      console.log(`🔴 Executing stop loss for ${symbol} at price $${currentPrice}`)
      
      const response = await fetch('/api/execute-stop-loss', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: '0xa33b58aa0d56f2ebde0b3c09fbcf6cdde1d2e5e6823ec74b0d9d8b297f15ed2e', // Replace with actual user wallet
          tokenSymbol: symbol,
          tokenAmount: token.balance || 1000, // Use actual token balance
          currentPrice,
          stopLossPrice: token.stopLossTarget || 0,
        }),
      })

      const result = await response.json()
      
      if (result.success) {
        console.log(`✅ Stop loss executed successfully for ${symbol}:`, result)
        
        // Update token status to reflect execution
        setTokenStatuses(prev => ({
          ...prev,
          [symbol]: {
            ...prev[symbol],
            stopLossExecuted: true,
            executionHash: result.transactionHash,
            usdcReceived: result.usdcAmount,
            isSold: true,
            soldAt: Date.now(),
            soldPrice: currentPrice,
          }
        }))

        // Remove sold token from strategy permanently
        removeSoldTokenFromStrategy(symbol)
        
        // Show success notification with explorer link
        const explorerUrl = `https://explorer.aptoslabs.com/txn/${result.transactionHash}?network=devnet`
        addNotification(`Stop loss executed: ${token.symbol} → ${result.usdcAmount} USDC`, explorerUrl)
      } else {
        console.error(`❌ Stop loss execution failed for ${symbol}:`, result.error)
      }
    } catch (error) {
      console.error(`❌ Stop loss execution error for ${symbol}:`, error)
    } finally {
      setExecutingStopLoss(prev => {
        const newSet = new Set(prev)
        newSet.delete(symbol)
        return newSet
      })
    }
  }

  // Function to manually sell tokens for USDC
  const sellTokenNow = async (token: StrategyToken) => {
    const symbol = token.symbol.toUpperCase()
    const currentStatus = tokenStatuses[symbol]
    
    // Prevent duplicate executions
    if (sellingTokens.has(symbol) || executingStopLoss.has(symbol)) return
    
    // Don't sell if already executed or token no longer exists in strategy
    if (currentStatus?.stopLossExecuted) return
    if (!strategy || !strategy.tokens.find(t => t.symbol.toUpperCase() === symbol)) return
    
    const currentPrice = currentStatus?.price || token.price || 0
    if (currentPrice <= 0) {
      console.error(`Cannot sell ${symbol}: No current price available`)
      return
    }
    
    setSellingTokens(prev => new Set([...prev, symbol]))
    
    try {
      console.log(`💰 Manually selling ${symbol} at price $${currentPrice}`)
      
      const response = await fetch('/api/sell-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: '0xa33b58aa0d56f2ebde0b3c09fbcf6cdde1d2e5e6823ec74b0d9d8b297f15ed2e', // Replace with actual user wallet
          tokenSymbol: symbol,
          tokenAmount: token.balance || 1000, // Use actual token balance
          usdcAmount: Math.floor((token.balance || 1000) * currentPrice * 1_000_000), // Convert to 6 decimals
          reason: 'manual',
        }),
      })

      const result = await response.json()
      
      if (result.success) {
        console.log(`✅ Manual sale executed successfully for ${symbol}:`, result)
        
        // Update token status to reflect execution
        setTokenStatuses(prev => ({
          ...prev,
          [symbol]: {
            ...prev[symbol],
            stopLossExecuted: true, // Reuse the same flag for UI consistency
            executionHash: result.transactionHash,
            usdcReceived: result.usdcMinted,
            isSold: true,
            soldAt: Date.now(),
            soldPrice: currentPrice,
          }
        }))

        // Remove sold token from strategy permanently
        removeSoldTokenFromStrategy(symbol)
        
        // Show success notification with explorer link
        const explorerUrl = `https://explorer.aptoslabs.com/txn/${result.transactionHash}?network=devnet`
        addNotification(`Token sold: ${token.symbol} → ${result.usdcMinted} USDC`, explorerUrl)
      } else {
        console.error(`❌ Manual sale failed for ${symbol}:`, result.error)
        alert(`Failed to sell ${symbol}: ${result.error}`)
      }
    } catch (error) {
      console.error(`❌ Manual sale error for ${symbol}:`, error)
      alert(`Error selling ${symbol}: ${error}`)
    } finally {
      setSellingTokens(prev => {
        const newSet = new Set(prev)
        newSet.delete(symbol)
        return newSet
      })
    }
  }

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

          // Get previous status from ref to access latest state
          const prevStatus = tokenStatusesRef.current[symbol]
          
          // Only trigger stop loss if:
          // 1. Stop loss condition is currently met (stopLossHit is true)
          // 2. Previous status exists (not the first check)
          // 3. Stop loss was NOT hit in the previous check (transition from safe to danger)
          // 4. Stop loss has not already been executed
          const isNewStopLoss = stopLossHit && 
                                prevStatus && 
                                !prevStatus.stopLossHit && 
                                !prevStatus.stopLossExecuted

          nextStatuses[symbol] = {
            price: match.price,
            takeProfitHit,
            stopLossHit,
            lastChecked: timestamp,
            // Preserve execution status from previous state
            stopLossExecuted: prevStatus?.stopLossExecuted || false,
            takeProfitExecuted: prevStatus?.takeProfitExecuted || false,
            executionHash: prevStatus?.executionHash,
            usdcReceived: prevStatus?.usdcReceived,
            isSold: prevStatus?.isSold || false,
            soldAt: prevStatus?.soldAt,
            soldPrice: prevStatus?.soldPrice,
          }

          // Automatically execute stop loss if triggered for the first time
          if (isNewStopLoss && !executingStopLossRef.current.has(symbol)) {
            console.log(`🚨 Stop loss triggered for ${symbol} at $${match.price} (target: $${token.stopLossTarget})`)
            executeStopLoss(token, match.price)
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
      
      {/* Success Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-20 right-4 z-50 space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="bg-emerald-900/90 border border-emerald-700/50 text-emerald-100 p-4 rounded-lg shadow-lg backdrop-blur-sm max-w-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="text-sm font-medium mb-2">
                    ✅ {notification.message}
                  </div>
                  <a
                    href={notification.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-emerald-300 hover:text-emerald-200 underline"
                  >
                    View on Explorer
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-emerald-300 hover:text-emerald-200 hover:bg-emerald-800/50"
                  onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      
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
            <Link href="/">
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
              <Link href="/">
                <Button>Browse Tokens</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Active Holdings</CardTitle>
                <CardDescription>
                  Monitoring {strategy.tokens.length} token{strategy.tokens.length !== 1 ? 's' : ''} with {strategy.riskLevel} risk level
                </CardDescription>
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
                    <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] sm:grid-cols-[repeat(3,minmax(0,1fr))] gap-3 text-sm items-center">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Take Profit Target</div>
                        <div className="font-medium">{token.takeProfitTarget ? `$${token.takeProfitTarget.toFixed(4)}` : "-"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Stop Loss Target</div>
                        <div className="font-medium">{token.stopLossTarget ? `$${token.stopLossTarget.toFixed(4)}` : "-"}</div>
                      </div>
                      <div className="flex items-center justify-center">
                        {(() => {
                          const status = tokenStatuses[token.symbol.toUpperCase()]
                          const symbol = token.symbol.toUpperCase()
                          const isExecuting = executingStopLoss.has(symbol)
                          const isSelling = sellingTokens.has(symbol)
                          const isAlreadySold = status?.stopLossExecuted
                          const currentPrice = status?.price || token.price || 0
                          
                          // Show sell button if not already sold and not currently processing
                          if (!isAlreadySold && !isExecuting && !isSelling && currentPrice > 0) {
                            const estimatedUSDC = ((token.balance || 1000) * currentPrice).toFixed(2)
                            return (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => sellTokenNow(token)}
                                className="text-emerald-400 border-emerald-400/50 hover:bg-emerald-400/10 hover:border-emerald-400"
                              >
                                <DollarSign className="w-3 h-3 mr-1" />
                                Sell Now
                                <span className="ml-1 text-xs opacity-75">
                                  (~${estimatedUSDC})
                                </span>
                              </Button>
                            )
                          }
                          
                          if (isSelling) {
                            return (
                              <Button variant="outline" size="sm" disabled>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                                  Converting...
                                </div>
                              </Button>
                            )
                          }
                          
                          if (isAlreadySold) {
                            return (
                              <Button variant="outline" size="sm" disabled className="text-emerald-400 border-emerald-400/50">
                                ✅ Converted
                              </Button>
                            )
                          }
                          
                          return null
                        })()}
                      </div>
                      <div className="col-span-2 sm:col-span-3 flex items-center justify-between text-xs text-muted-foreground">
                        {(() => {
                          const status = tokenStatuses[token.symbol.toUpperCase()]
                          const symbol = token.symbol.toUpperCase()
                          const isExecuting = executingStopLoss.has(symbol)
                          const isSelling = sellingTokens.has(symbol)
                          
                          if (!status) return <span>Monitoring thresholds…</span>
                    
                          if (status.stopLossExecuted) {
                            return (
                              <div className="flex flex-col gap-1">
                                <span className="text-emerald-400">✅ Converted to USDC</span>
                                <span className="text-xs text-muted-foreground">
                                  Received {status.usdcReceived?.toFixed(2)} USDC
                                </span>
                                {status.executionHash && (
                                  <a 
                                    href={`https://explorer.aptoslabs.com/txn/${status.executionHash}?network=devnet`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-400 hover:text-blue-300 underline"
                                  >
                                    View transaction
                                  </a>
                                )}
                              </div>
                            )
                          }

                          if (isSelling) {
                            return <span className="text-yellow-400">⏳ Converting to USDC...</span>
                          }

                          if (isExecuting) {
                            return <span className="text-yellow-400">⏳ Executing stop loss...</span>
                          }

                          if (status.takeProfitHit) {
                            return <span className="text-emerald-400">Take profit threshold reached.</span>
                          }

                          if (status.stopLossHit) {
                            return <span className="text-rose-400">🔴 Stop loss triggered - Converting to USDC...</span>
                          }
                          
                          return <span>No thresholds hit yet.</span>
                        })()}
                        <div className="flex items-center gap-1">
                          {(() => {
                            const status = tokenStatuses[token.symbol.toUpperCase()]
                            const symbol = token.symbol.toUpperCase()
                            const isExecuting = executingStopLoss.has(symbol)
                            const isSelling = sellingTokens.has(symbol)
                            const isAlreadySold = status?.stopLossExecuted
                            
                            // Show sell button if not already sold and not currently processing
                            if (!isAlreadySold && !isExecuting && !isSelling) {
                              return (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => sellTokenNow(token)}
                                  aria-label="Sell now for USDC"
                                  className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10"
                                  title="Convert to USDC at current market price"
                                >
                                  <DollarSign className="w-4 h-4" />
                                </Button>
                              )
                            }
                            return null
                          })()}
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
