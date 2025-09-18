"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react"

// Mock data for demonstration
const mockTokens = [
  {
    id: 1,
    name: "Bitcoin",
    symbol: "BTC",
    price: 43250.50,
    change24h: 2.5,
    balance: 0.25,
    value: 10812.63,
    icon: "₿"
  },
  {
    id: 2,
    name: "Ethereum",
    symbol: "ETH",
    price: 2650.75,
    change24h: -1.2,
    balance: 1.5,
    value: 3976.13,
    icon: "Ξ"
  },
  {
    id: 3,
    name: "Solana",
    symbol: "SOL",
    price: 98.45,
    change24h: 5.8,
    balance: 50,
    value: 4922.50,
    icon: "◎"
  },
  {
    id: 4,
    name: "Cardano",
    symbol: "ADA",
    price: 0.45,
    change24h: -0.8,
    balance: 1000,
    value: 450.00,
    icon: "₳"
  }
]

export function TokenGrid() {
  const totalValue = mockTokens.reduce((sum, token) => sum + token.value, 0)

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5" />
            <span>Portfolio Value</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">
            ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Total value across all holdings
          </p>
        </CardContent>
      </Card>

      {/* Token Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {mockTokens.map((token) => (
          <Card key={token.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center text-lg font-bold">
                    {token.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{token.name}</h3>
                    <p className="text-sm text-muted-foreground">{token.symbol}</p>
                  </div>
                </div>
                <Badge 
                  variant={token.change24h >= 0 ? "default" : "destructive"}
                  className="text-xs"
                >
                  {token.change24h >= 0 ? (
                    <TrendingUp className="w-3 h-3 mr-1" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-1" />
                  )}
                  {token.change24h >= 0 ? "+" : ""}{token.change24h}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Price</span>
                  <span className="font-medium">${token.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Balance</span>
                  <span className="font-medium">{token.balance} {token.symbol}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Value</span>
                  <span className="font-semibold text-foreground">
                    ${token.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}