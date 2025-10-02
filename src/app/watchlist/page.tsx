"use client";
import React, { useState, useEffect } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Star } from "lucide-react";
import { WalletConnector } from "@aptos-labs/wallet-adapter-mui-design";

interface Memecoin {
  name: string;
  symbol: string;
  price: number;
  logo: string;
  change24h: number;
  marketCap: number;
  riskScore: "safe" | "moderate" | "high";
}

const LOCAL_STORAGE_KEY = "watchlistTokens";

const allMemecoins: Memecoin[] = [
  { name: "Dogecoin", symbol: "DOGE", price: 0.062, logo: "/dogecoin-logo.png", change24h: 2.1, marketCap: 9000000000, riskScore: "moderate" },
  { name: "Shiba Inu", symbol: "SHIB", price: 0.000007, logo: "/shiba-inu-logo.png", change24h: -1.2, marketCap: 5000000000, riskScore: "high" },
  { name: "Bonk", symbol: "BONK", price: 0.000021, logo: "/bonk-dog-logo.png", change24h: 0.5, marketCap: 1200000000, riskScore: "moderate" },
  { name: "DoodooCoin", symbol: "DOODOO", price: 0.0001, logo: "/placeholder-logo.png", change24h: 3.5, marketCap: 80000000, riskScore: "high" },
  { name: "SafeMoon", symbol: "SAFEMOON", price: 0.0000005, logo: "/safemoon-logo.jpg", change24h: -0.8, marketCap: 20000000, riskScore: "high" },
];

function getRiskBadgeColor(risk: Memecoin["riskScore"]): string {
  switch (risk) {
    case "safe":
      return "bg-emerald-900/40 text-emerald-300 border-emerald-700/50";
    case "moderate":
      return "bg-amber-900/40 text-amber-300 border-amber-700/50";
    case "high":
      return "bg-rose-900/40 text-rose-300 border-rose-700/50";
    default:
      return "bg-slate-800/40 text-slate-300 border-slate-700/50";
  }
}

function formatPrice(price: number): string {
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  if (price >= 0.0001) return `$${price.toFixed(6)}`;
  return `$${price.toFixed(8)}`;
}

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<Memecoin[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      setWatchlist(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  const addToWatchlist = (coin: Memecoin) => {
    if (!watchlist.some((t) => t.symbol === coin.symbol)) {
      setWatchlist([...watchlist, coin]);
    }
  };

  const removeFromWatchlist = (symbol: string) => {
    setWatchlist(watchlist.filter((token) => token.symbol !== symbol));
  };

  const exploreCoins = allMemecoins.filter(
    (coin) => !watchlist.some((t) => t.symbol === coin.symbol)
  );

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
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">My Watchlist</h1>
          <a href="/">
            <Button variant="outline">Portfolio Overview</Button>
          </a>
        </div>
        {/* Watchlist Table Section */}
        <div className="bg-card/50 border border-border/50 rounded-xl overflow-hidden backdrop-blur-sm mb-10">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_0.8fr_0.5fr] gap-3 px-4 py-3 border-b border-border/30 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <div>Asset</div>
            <div className="text-right">Price</div>
            <div className="text-right">Market Cap</div>
            <div className="text-center">24h</div>
            <div className="text-center">Risk</div>
            <div className="text-center">Remove</div>
          </div>
          {watchlist.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">No tokens in your watchlist.</div>
          ) : (
            watchlist.map((token, index) => (
              <div
                key={token.symbol}
                className={`grid grid-cols-[2fr_1fr_1fr_1fr_0.8fr_0.5fr] gap-3 px-4 py-3 items-center ${
                  index !== watchlist.length - 1 ? "border-b border-border/20" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <img src={token.logo} alt={token.name} className="w-7 h-7 rounded-full object-cover" />
                  <div className="min-w-0">
                    <div className="font-medium text-foreground text-sm truncate">{token.name}</div>
                    <div className="text-xs text-muted-foreground">{token.symbol}</div>
                  </div>
                </div>
                <div className="text-right text-sm font-mono text-foreground">{formatPrice(token.price)}</div>
                <div className="text-right text-xs text-muted-foreground">
                  {token.marketCap >= 1e9
                    ? `${(token.marketCap / 1e9).toFixed(2)}B`
                    : token.marketCap >= 1e6
                    ? `${(token.marketCap / 1e6).toFixed(2)}M`
                    : token.marketCap >= 1e3
                    ? `${(token.marketCap / 1e3).toFixed(1)}K`
                    : token.marketCap.toLocaleString()}
                </div>
                <div className="text-center">
                  <span className={`text-sm font-medium ${token.change24h >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {token.change24h >= 0 ? "+" : ""}
                    {token.change24h.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-center">
                  <Badge className={`${getRiskBadgeColor(token.riskScore)} border text-xs px-2 py-0.5`}>
                    {token.riskScore === "safe"
                      ? "LOW"
                      : token.riskScore === "moderate"
                      ? "MED"
                      : "HIGH"}
                  </Badge>
                </div>
                <div className="flex justify-center">
                  <Button variant="destructive" size="sm" onClick={() => removeFromWatchlist(token.symbol)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
        {/* Explore Section */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Explore Memecoins</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {exploreCoins.length === 0 ? (
              <div className="col-span-3 text-center text-gray-500">All memecoins are in your watchlist.</div>
            ) : (
              exploreCoins.map((coin) => (
                <Card key={coin.symbol} className="flex flex-col items-center p-4">
                  <img src={coin.logo} alt={coin.name} className="w-16 h-16 mb-2" />
                  <div className="font-semibold text-lg">{coin.name}</div>
                  <div className="text-sm text-gray-500">{coin.symbol}</div>
                  <div className="mt-2 text-xl">{formatPrice(coin.price)}</div>
                  <Button className="mt-4 flex items-center gap-2" onClick={() => addToWatchlist(coin)}>
                    <Star className="w-4 h-4" /> Add to Watchlist
                  </Button>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}