"use client";

import {
    AptosWalletAdapterProvider,
  } from "@aptos-labs/wallet-adapter-react";
import { ReactNode } from "react";
import { Network } from "@aptos-labs/ts-sdk";

interface WalletProviderProps {
  children: ReactNode;
}

export default function WalletProvider({ children }: WalletProviderProps) {
  return (
    <AptosWalletAdapterProvider
      autoConnect={true}
      dappConfig={{
        network: Network.TESTNET, 
        aptosApiKeys: {
          testnet: process.env.APTOS_API_KEY_TESTNET,
        }
      }}
      onError={(error) => {
        console.error("Wallet error:", error);
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
}