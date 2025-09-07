"use client"

import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, TrendingUp, Star } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useWallet } from "@aptos-labs/wallet-adapter-react"

interface Memecoin {
  id: string
  name: string
  symbol: string
  price: number
  balance: number
  riskScore: "safe" | "moderate" | "high"
  logo: string
  change24h: number
  marketCap?: string
}

interface Balance {
  amount: string;
  asset_type: string;
  metadata: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

const memecoins: Memecoin[] = [
  {
    id: "1",
    name: "Dogecoin",
    symbol: "DOGE",
    price: 0.073421,
    balance: 15247,
    riskScore: "moderate",
    logo: "/dogecoin-logo.png",
    change24h: -2.34,
    marketCap: "$10.5B",
  },
  {
    id: "2",
    name: "Shiba Inu",
    symbol: "SHIB",
    price: 0.00000847,
    balance: 52847293,
    riskScore: "high",
    logo: "/shiba-inu-logo.png",
    change24h: 5.67,
    marketCap: "$4.9B",
  },
  {
    id: "3",
    name: "Pepe",
    symbol: "PEPE",
    price: 0.00000089,
    balance: 98234567,
    riskScore: "high",
    logo: "/frog-logo.png",
    change24h: -8.92,
    marketCap: "$374M",
  },
  {
    id: "4",
    name: "Floki Inu",
    symbol: "FLOKI",
    price: 0.000027,
    balance: 1847293,
    riskScore: "high",
    logo: "/generic-dog-logo.png",
    change24h: 12.45,
    marketCap: "$259M",
  },
  {
    id: "5",
    name: "Bonk",
    symbol: "BONK",
    price: 0.0000134,
    balance: 4729384,
    riskScore: "moderate",
    logo: "/bonk-dog-logo.png",
    change24h: -1.23,
    marketCap: "$892M",
  },
  {
    id: "6",
    name: "SafeMoon",
    symbol: "SAFEMOON",
    price: 0.000187,
    balance: 89472,
    riskScore: "safe",
    logo: "/safemoon-logo.jpg",
    change24h: 0.45,
    marketCap: "$112M",
  },
]

export default function MemecoinSelection() {
  const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set())
  const [isWalletConnected] = useState(true)
  const [tokens, setTokens] = useState<Balance[]>()
  const { account } = useWallet()

  const getTokens = async (address: string) => {
    const myHeaders = new Headers();
    myHeaders.append("content-type", "application/json");

  const graphql = JSON.stringify({
    query: `
      query MyBalances($owner: String!) {
        current_fungible_asset_balances(
          where: { owner_address: { _eq: $owner } }
        ) {
          asset_type
          amount
          metadata {
            name
            symbol
            decimals
          }
        }
      }`,
    variables: { owner: address }
  });

  const response = await fetch('https://api.testnet.aptoslabs.com/v1/graphql', {
    method: 'POST',
    headers: myHeaders,
    body: graphql
  });

    const data = await response.json();
    console.log(data)
    setTokens(data.data.current_fungible_asset_balances);
  }

  const handleTokenSelect = (tokenId: string, checked: boolean) => {
    const newSelected = new Set(selectedTokens)
    if (checked) {
      newSelected.add(tokenId)
    } else {
      newSelected.delete(tokenId)
    }
    setSelectedTokens(newSelected)
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

  const formatBalance = (balance: number, symbol: string) => {
    if (balance >= 1000000000) {
      return `${(balance / 1000000000).toFixed(2)}B ${symbol}`
    } else if (balance >= 1000000) {
      return `${(balance / 1000000).toFixed(2)}M ${symbol}`
    } else if (balance >= 1000) {
      return `${(balance / 1000).toFixed(1)}K ${symbol}`
    }
    return `${balance.toLocaleString()} ${symbol}`
  }

  const formatPrice = (price: number) => {
    if (price >= 1) {
      return `$${price.toFixed(2)}`
    } else if (price >= 0.01) {
      return `$${price.toFixed(4)}`
    } else if (price >= 0.0001) {
      return `$${price.toFixed(6)}`
    } else {
      return `$${price.toFixed(8)}`
    }
  }

  // Get selected token data for navigation
  const getSelectedTokenData = () => {
    return memecoins.filter(token => selectedTokens.has(token.id))
  }

  // Create URL with selected tokens
  const getConfigureUrl = () => {
    const selectedData = getSelectedTokenData()
    const tokenIds = Array.from(selectedTokens).join(',')
    return `/trading/configure?tokens=${tokenIds}`
  }

  return (
    <div className="min-h-screen bg-background">
      <Header isConnected={isWalletConnected} onConnect={() => {}} />
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="text-xs bg-transparent">
                <Star className="w-3 h-3 mr-1" />
                Watchlist
              </Button>
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Memecoin Trading</h1>
          <p className="text-sm text-muted-foreground">Select tokens to enable automated trading strategies</p>
        </div>

        <div className="mb-6">

          <h2 className="text-lg font-semibold text-foreground mb-1">Your Tokens Queried: </h2>
          <ul className="list-disc list-inside">
            {tokens?.map((token, index) => {
              const decimals = token.metadata.decimals || 8;
              const formattedAmount = (parseFloat(token.amount) / Math.pow(10, decimals)).toFixed(6);
              return (
                <li key={index}>
                  {token.metadata.name} - {formattedAmount} {token.metadata.symbol}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="bg-card/50 border border-border/50 rounded-xl overflow-hidden backdrop-blur-sm">
          <div className="grid grid-cols-[2fr_1fr_1.2fr_0.8fr_0.6fr_0.5fr] gap-3 px-4 py-3 border-b border-border/30 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <div>Asset</div>
            <div className="text-right">Price</div>
            <div className="text-right">Holdings</div>
            <div className="text-center">24h</div>
            <div className="text-center">Risk</div>
            <div className="text-center">Trade</div>
          </div>

          {memecoins.map((token, index) => (
            <div
              key={token.id}
              className={`grid grid-cols-[2fr_1fr_1.2fr_0.8fr_0.6fr_0.5fr] gap-3 px-4 py-3 hover:bg-muted/30 transition-all duration-200 items-center ${
                index !== memecoins.length - 1 ? "border-b border-border/20" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <img 
                  src={token.logo || "/placeholder.svg"} 
                  alt={token.name} 
                  className="w-7 h-7 rounded-full object-cover" 
                />
                <div className="min-w-0">
                  <div className="font-medium text-foreground text-sm truncate">{token.name}</div>
                  <div className="text-xs text-muted-foreground">{token.symbol}</div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-mono text-foreground">{formatPrice(token.price)}</div>
                {token.marketCap && <div className="text-xs text-muted-foreground">{token.marketCap}</div>}
              </div>

              <div className="text-right">
                <div className="text-sm text-foreground font-mono">{formatBalance(token.balance, token.symbol)}</div>
                <div className="text-xs text-muted-foreground">
                  ${(token.balance * token.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              </div>

              <div className="text-center">
                <span className={`text-sm font-medium ${token.change24h >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {token.change24h >= 0 ? "+" : ""}
                  {token.change24h.toFixed(2)}%
                </span>
              </div>

              <div className="flex justify-center">
                <Badge className={`${getRiskBadgeColor(token.riskScore)} border text-xs px-2 py-0.5`}>
                  {token.riskScore === "safe" ? "LOW" : token.riskScore === "moderate" ? "MED" : "HIGH"}
                </Badge>
              </div>

              <div className="flex justify-center">
                <Checkbox
                  checked={selectedTokens.has(token.id)}
                  onCheckedChange={(checked) => handleTokenSelect(token.id, checked as boolean)}
                  className="data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-black border-white/60 bg-transparent w-4 h-4 rounded-sm"
                />
              </div>
            </div>
          ))}
        </div>

        {selectedTokens.size > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
            <Link href={getConfigureUrl()}>
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg px-6 py-3 text-sm font-medium rounded-lg border border-blue-500/20"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Enable Trading ({selectedTokens.size})
              </Button>
            </Link>
          </div>
        )}

        <Button onClick={() => getTokens(account?.address?.toString() || '')}>Get Tokens</Button>
      </main>
    </div>
  )
}
