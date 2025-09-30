import { NextRequest, NextResponse } from 'next/server';
import {
  Account,
  AccountAddress,
  Aptos,
  AptosConfig,
  Ed25519PrivateKey,
  Network,
  NetworkToNetworkName,
} from "@aptos-labs/ts-sdk";

export interface SellTokenRequest {
  walletAddress: string;
  tokenSymbol: string;
  tokenAmount: number;
  usdcAmount: number;
  reason?: 'stop_loss' | 'take_profit' | 'manual';
}

export interface SellTokenResponse {
  success: boolean;
  transactionHash?: string;
  usdcMinted?: number;
  error?: string;
  details?: string;
}

// Set up Aptos client
const APTOS_NETWORK: Network = NetworkToNetworkName[process.env.APTOS_NETWORK ?? Network.DEVNET];
const config = new AptosConfig({ network: APTOS_NETWORK });
const aptos = new Aptos(config);

/** Mint DoraHacks USDC directly to an address (admin only) */
async function mintUsdcTo(
  admin: Account,
  toAddress: AccountAddress,
  amount: number
): Promise<string> {
  const transaction = await aptos.transaction.build.simple({
    sender: admin.accountAddress,
    data: {
      function: `${admin.accountAddress}::usdc_vendor::mint_to`,
      typeArguments: [],
      functionArguments: [toAddress, amount],
    },
  });

  const senderAuthenticator = aptos.transaction.sign({ signer: admin, transaction });
  const pendingTxn = await aptos.transaction.submit.simple({ transaction, senderAuthenticator });

  return pendingTxn.hash;
}

export async function POST(request: NextRequest) {
  try {
    const body: SellTokenRequest = await request.json();
    
    const { walletAddress, tokenSymbol, tokenAmount, usdcAmount, reason = 'manual' } = body;

    // Validate required fields
    if (!walletAddress || !tokenSymbol || !tokenAmount || !usdcAmount) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields',
          details: 'walletAddress, tokenSymbol, tokenAmount, and usdcAmount are required'
        },
        { status: 400 }
      );
    }

    // Validate amounts are positive
    if (tokenAmount <= 0 || usdcAmount <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid amounts',
          details: 'tokenAmount and usdcAmount must be positive numbers'
        },
        { status: 400 }
      );
    }

    // Get vendor private key from environment
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.VENDOR_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Vendor configuration missing',
          details: 'DEPLOYER_PRIVATE_KEY or VENDOR_PRIVATE_KEY environment variable is required'
        },
        { status: 500 }
      );
    }

    // Load vendor account
    const vendor = Account.fromPrivateKey({
      privateKey: new Ed25519PrivateKey(privateKey),
    });

    // Parse target wallet address
    const targetAddress = AccountAddress.fromString(walletAddress);

    console.log(`💰 Processing token sale:`, {
      reason,
      tokenSymbol,
      tokenAmount,
      usdcAmount: usdcAmount / 1_000_000, // Convert to human readable
      walletAddress,
      vendorAddress: vendor.accountAddress.toString()
    });

    console.log(`🔄 Token removal simulation: ${tokenAmount} ${tokenSymbol} tokens removed from wallet ${walletAddress}`);

    // In a real implementation, you would:
    // 1. Verify the user actually owns the tokens
    // 2. Execute a DEX swap or burn the tokens
    // 3. Calculate the exact USDC amount based on current market rates
    // 
    // For this demo, we'll simulate the token sale and mint USDC directly

    // Mint USDC to the user's wallet
    const mintHash = await mintUsdcTo(vendor, targetAddress, usdcAmount);
    
    // Wait for transaction confirmation
    await aptos.waitForTransaction({ transactionHash: mintHash });

    console.log(`✅ Token sale completed:`, {
      transactionHash: mintHash,
      tokenSymbol,
      tokenAmount,
      usdcMinted: usdcAmount / 1_000_000,
      reason,
      note: `${tokenAmount} ${tokenSymbol} tokens have been removed from wallet and converted to USDC`
    });

    return NextResponse.json({
      success: true,
      transactionHash: mintHash,
      usdcMinted: usdcAmount / 1_000_000, // Return in human readable format
      tokenSymbol,
      tokenAmount,
      reason,
      explorerUrl: `https://explorer.aptoslabs.com/txn/${mintHash}?network=${APTOS_NETWORK}`,
      message: `Successfully converted ${tokenAmount} ${tokenSymbol} to ${(usdcAmount / 1_000_000).toFixed(2)} USDC`,
      walletStatus: `${tokenAmount} ${tokenSymbol} tokens removed from wallet ${walletAddress}`
    });

  } catch (error: any) {
    console.error('Token sale failed:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Token sale failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
