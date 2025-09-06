"use client";

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function WalletDebug() {
  const wallet = useWallet();
  const [showDebug, setShowDebug] = useState(false);

  if (!showDebug) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setShowDebug(true)}
        className="fixed bottom-4 right-4 z-50"
      >
        Show Wallet Info
      </Button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card className="p-4 bg-background border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold">useWallet Debug Info</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowDebug(false)}
          >
            ×
          </Button>
        </div>
        
        <div className="space-y-2 text-xs">
          <div><strong>connected:</strong> {String(wallet.connected)}</div>
          <div><strong>isLoading:</strong> {String(wallet.isLoading)}</div>
          <div><strong>account:</strong> {wallet.account ? wallet.account.address?.toString() : 'null'}</div>
          <div><strong>network:</strong> {wallet.network ? `${wallet.network.name} (${wallet.network.chainId})` : 'null'}</div>
          <div><strong>wallet:</strong> {wallet.wallet ? wallet.wallet.name : 'null'}</div>
          <div><strong>wallets count:</strong> {wallet.wallets.length}</div>
          <div><strong>notDetectedWallets count:</strong> {wallet.notDetectedWallets.length}</div>
        </div>

        <div className="mt-4">
          <h4 className="font-semibold text-sm mb-2">Detected Wallets:</h4>
          <div className="text-xs space-y-1">
            {wallet.wallets.map((w, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span>{w.name}</span>
              </div>
            ))}
          </div>
        </div>

        {wallet.notDetectedWallets.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold text-sm mb-2">Not Detected Wallets:</h4>
            <div className="text-xs space-y-1">
              {wallet.notDetectedWallets.map((w, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
                  <span>{w.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 space-y-1">
          <h4 className="font-semibold text-sm">Available Functions:</h4>
          <div className="text-xs space-y-1">
            <div>• connect(walletName: string)</div>
            <div>• disconnect()</div>
            <div>• signIn(args)</div>
            <div>• signAndSubmitTransaction(transaction)</div>
            <div>• signTransaction(args)</div>
            <div>• signMessage(message)</div>
            <div>• signMessageAndVerify(message)</div>
            <div>• changeNetwork(network)</div>
            <div>• submitTransaction(transaction)</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
