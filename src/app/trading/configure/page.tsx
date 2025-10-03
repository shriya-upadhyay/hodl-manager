"use client"

import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Bot, Settings, TrendingUp, DollarSign, AlertTriangle, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { useWallet } from "@aptos-labs/wallet-adapter-react"

interface SelectedToken {
  id: string
  name: string
  symbol: string
  price: number
  balance: number
  logo: string
  riskScore: "safe" | "moderate" | "high"
}


export default function TradingConfigure() {
  const [aiTakeProfit, setAiTakeProfit] = useState(true)
  const [aiStopLoss, setAiStopLoss] = useState(true)
  const [riskLevel, setRiskLevel] = useState<"conservative" | "moderate" | "aggressive">("conservative")
  const [customOrders, setCustomOrders] = useState(false)
  const [takeProfitPrice, setTakeProfitPrice] = useState("")
  const [stopLossPrice, setStopLossPrice] = useState("")
  const [trailingStop, setTrailingStop] = useState("")
  const [selectedTokens, setSelectedTokens] = useState<SelectedToken[]>([])
  
  const { connected } = useWallet()
  const router = useRouter()

  // Get selected tokens from localStorage
  useEffect(() => {
    const storedTokens = localStorage.getItem("selectedTokens")
    if (storedTokens) {
      try {
        const parsedTokens = JSON.parse(storedTokens)
        setSelectedTokens(parsedTokens)
        localStorage.removeItem("selectedTokens")
      } catch (error) {
        console.error("Error parsing tokens from localStorage:", error)
        setSelectedTokens([])
      }
    }
  }, [])

  // Prefill strategy settings when editing
  useEffect(() => {
    const storedStrategy = localStorage.getItem("strategyDraft")
    if (!storedStrategy) return

    try {
      const parsed = JSON.parse(storedStrategy)
      setAiTakeProfit(Boolean(parsed.aiTakeProfit))
      setAiStopLoss(Boolean(parsed.aiStopLoss))
      if (parsed.riskLevel) setRiskLevel(parsed.riskLevel)
      setCustomOrders(Boolean(parsed.customOrders))
      if (typeof parsed.takeProfitPrice === "string") setTakeProfitPrice(parsed.takeProfitPrice)
      if (typeof parsed.stopLossPrice === "string") setStopLossPrice(parsed.stopLossPrice)
      if (typeof parsed.trailingStop === "string") setTrailingStop(parsed.trailingStop)
      if (Array.isArray(parsed.tokens) && parsed.tokens.length > 0) {
        setSelectedTokens(parsed.tokens)
      }
    } catch (error) {
      console.error("Failed to preload strategy settings:", error)
    } finally {
      localStorage.removeItem("strategyDraft")
    }
  }, [])

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

  const fetchAIMultiplierForToken = async (token: SelectedToken, riskLevel: string) => {
  const response = await fetch("/api/ai-multipliers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      symbol: token.symbol,
      currentPrice: token.price,
      riskLevel: riskLevel
    }),
  });

  const json = await response.json();
  const { takeProfit, stopLoss } = json.multipliers;
  console.log(token.symbol, takeProfit, stopLoss);

  return {
    ...token,
    takeProfitTarget: token.price * takeProfit,
    stopLossTarget: token.price * stopLoss,
  };
};


  const riskTargets = {
    conservative: { takeProfitMultiplier: 1.8, stopLossMultiplier: 0.85 },
    moderate: { takeProfitMultiplier: 2.5, stopLossMultiplier: 0.7 },
    aggressive: { takeProfitMultiplier: 3.5, stopLossMultiplier: 0.5 },
  } as const

  const estimatedGas = selectedTokens.length * 0.85 // Mock calculation

  const handleDeployStrategy = async () => {
  if (!selectedTokens || selectedTokens.length === 0) return;

  const { takeProfitMultiplier: staticTP, stopLossMultiplier: staticSL } = riskTargets[riskLevel];

  const tokensWithTargets = await Promise.all(
    selectedTokens.map(async (token) => {
      let takeProfitTarget = token.price * staticTP;
      let stopLossTarget = token.price * staticSL;


      if (aiTakeProfit || aiStopLoss) {
        try {
          const aiResult = await fetchAIMultiplierForToken(token, riskLevel);

          console.log("AI Result", aiResult);
          
          takeProfitTarget = aiTakeProfit
            ? (Number(aiResult.takeProfitTarget) || token.price * staticTP)
            : token.price * staticTP;
          
          stopLossTarget = aiStopLoss
            ? (Number(aiResult.stopLossTarget) || token.price * staticSL)
            : token.price * staticSL;
        } catch (error) {
          console.warn("AI multiplier failed for", token.symbol, error);
          // fallback already assigned above
        }
      }

      return {
        ...token,
        takeProfitTarget,
        stopLossTarget,
      };
    })
  );


  const newStrategy = {
    aiTakeProfit,
    aiStopLoss,
    riskLevel,
    customOrders,
    takeProfitPrice: customOrders ? takeProfitPrice : "",
    stopLossPrice: customOrders ? stopLossPrice : "",
    trailingStop: customOrders ? trailingStop : "",
    tokens: tokensWithTargets,
    estimatedGas: selectedTokens.length * 0.85, // mock calculation
    timestamp: Date.now(),
  };

  try {
    localStorage.setItem("deployedStrategy", JSON.stringify(newStrategy));
    console.log("✅ Strategy deployed with AI targets:", tokensWithTargets);
  } catch (error) {
    console.error("Failed to store strategy configuration:", error);
  }

  router.push("/dashboard");
};

  // If no tokens selected, redirect back to memecoins page
  if (selectedTokens.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header isConnected={connected} onConnect={() => {}} />
        <main className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="text-center py-12">
            <h1 className="text-2xl font-semibold text-foreground mb-4">No Tokens Selected</h1>
            <p className="text-muted-foreground mb-6">Please go back and select tokens to configure trading strategies.</p>
            <Link href="/">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Memecoins
              </Button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header isConnected={connected} onConnect={() => {}} />
      
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Memecoins
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Configure Trading Strategies</h1>
          <p className="text-sm text-muted-foreground">Set up automated trading for your selected tokens</p>
        </div>

        {/* Selected Tokens */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Selected Tokens ({selectedTokens.length})
            </CardTitle>
            <CardDescription>
              These tokens will be monitored and traded automatically
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {selectedTokens.map((token) => (
                <div key={token.id} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                  <img 
                    src={token.logo} 
                    alt={token.name} 
                    className="w-6 h-6 rounded-full object-cover" 
                  />
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{token.symbol}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatBalance(token.balance, token.symbol)}
                    </div>
                  </div>
                  <Badge className={`${getRiskBadgeColor(token.riskScore)} border text-xs px-2 py-0.5`}>
                    {token.riskScore === "safe" ? "LOW" : token.riskScore === "moderate" ? "MED" : "HIGH"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI-Powered Triggers */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              AI-Powered Triggers
            </CardTitle>
            <CardDescription>
              Let our AI monitor market conditions and execute optimal trades
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={aiTakeProfit}
                  onCheckedChange={(checked) => setAiTakeProfit(checked as boolean)}
                  className="data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-black border-white/60 bg-transparent"
                />
                <div>
                  <div className="font-medium">Smart Take Profit</div>
                  <div className="text-sm text-muted-foreground">
                    AI will sell when optimal profit conditions are met
                  </div>
                </div>
              </div>
              <Badge variant="secondary" className="bg-emerald-900/40 text-emerald-300 border-emerald-700/50">
                Recommended
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={aiStopLoss}
                  onCheckedChange={(checked) => setAiStopLoss(checked as boolean)}
                  className="data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-black border-white/60 bg-transparent"
                />
                <div>
                  <div className="font-medium">Smart Stop Loss</div>
                  <div className="text-sm text-muted-foreground">
                    AI will sell to prevent significant losses
                  </div>
                </div>
              </div>
              <Badge variant="secondary" className="bg-emerald-900/40 text-emerald-300 border-emerald-700/50">
                Recommended
              </Badge>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <Settings className="w-4 h-4" />
                <div className="font-medium">Risk Level</div>
              </div>
              <div className="flex gap-2">
                {(["conservative", "moderate", "aggressive"] as const).map((level) => (
                  <Button
                    key={level}
                    variant={riskLevel === level ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRiskLevel(level)}
                    className={riskLevel === level ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white" : ""}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Button>
                ))}
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                {riskLevel === "conservative" && "Lower risk, more conservative trading decisions"}
                {riskLevel === "moderate" && "Balanced approach with moderate risk tolerance"}
                {riskLevel === "aggressive" && "Higher risk for potentially higher returns"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Custom Orders */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Custom Orders (Optional)
            </CardTitle>
            <CardDescription>
              Set specific price targets for manual control
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
              <Checkbox
                checked={customOrders}
                onCheckedChange={(checked) => setCustomOrders(checked as boolean)}
                className="data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-black border-white/60 bg-transparent"
              />
              <div className="font-medium">Enable custom price targets</div>
            </div>

            {customOrders && (
              <div className="space-y-4 p-4 bg-muted/20 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Take Profit Price</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={takeProfitPrice}
                      onChange={(e) => setTakeProfitPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Stop Loss Price</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={stopLossPrice}
                      onChange={(e) => setStopLossPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Trailing Stop %</label>
                    <input
                      type="number"
                      placeholder="5"
                      value={trailingStop}
                      onChange={(e) => setTrailingStop(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Strategy Preview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Strategy Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tokens to monitor</span>
              <span className="font-medium">{selectedTokens.length} tokens</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">AI Triggers</span>
              <span className="font-medium">
                {aiTakeProfit && aiStopLoss ? "Take Profit + Stop Loss" : 
                 aiTakeProfit ? "Take Profit Only" :
                 aiStopLoss ? "Stop Loss Only" : "None"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Risk Profile</span>
              <Badge className="bg-amber-900/40 text-amber-300 border-amber-700/50">
                {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Custom Orders</span>
              <span className="font-medium">{customOrders ? "Enabled" : "Disabled"}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground">Estimated Gas Fees</span>
              <span className="font-medium flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                {estimatedGas.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <Link href="/">
            <Button variant="outline">
              Cancel
            </Button>
          </Link>
          <Button 
            size="lg"
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            onClick={handleDeployStrategy}
          >
            <Bot className="w-4 h-4 mr-2" />
            Deploy Strategy
          </Button>
        </div>
      </main>
    </div>
  )
}
