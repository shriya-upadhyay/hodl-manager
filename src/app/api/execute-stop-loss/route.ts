import { NextRequest, NextResponse } from 'next/server';

export interface StopLossRequest {
  walletAddress: string;
  tokenSymbol: string;
  tokenAmount: number;
  currentPrice: number;
  stopLossPrice: number;
}

export interface StopLossResponse {
  success: boolean;
  transactionHash?: string;
  usdcAmount?: number;
  error?: string;
  details?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: StopLossRequest = await request.json();
    
    const { walletAddress, tokenSymbol, tokenAmount, currentPrice, stopLossPrice } = body;

    // Validate required fields
    if (!walletAddress || !tokenSymbol || !tokenAmount || !currentPrice || !stopLossPrice) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields',
          details: 'walletAddress, tokenSymbol, tokenAmount, currentPrice, and stopLossPrice are required'
        },
        { status: 400 }
      );
    }

    // Validate that stop loss is actually triggered
    if (currentPrice > stopLossPrice) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Stop loss not triggered',
          details: `Current price (${currentPrice}) is above stop loss price (${stopLossPrice})`
        },
        { status: 400 }
      );
    }

    console.log(`🔴 Stop loss triggered for ${tokenSymbol}:`, {
      walletAddress,
      tokenAmount,
      currentPrice,
      stopLossPrice,
      priceDropPercentage: ((stopLossPrice - currentPrice) / stopLossPrice * 100).toFixed(2) + '%'
    });

    // Calculate USDC amount to mint (using current market price)
    const usdcAmount = Math.floor(tokenAmount * currentPrice * 1_000_000); // Convert to 6 decimals

    // Call the sell-token API to handle the conversion
    const sellResponse = await fetch(`${request.nextUrl.origin}/api/sell-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress,
        tokenSymbol,
        tokenAmount,
        usdcAmount,
        reason: 'stop_loss'
      }),
    });

    if (!sellResponse.ok) {
      const errorData = await sellResponse.json();
      throw new Error(`Sell token failed: ${errorData.error || 'Unknown error'}`);
    }

    const sellResult = await sellResponse.json();

    console.log(`✅ Stop loss executed successfully:`, {
      tokenSymbol,
      tokenAmount,
      usdcAmount: usdcAmount / 1_000_000, // Convert back to human readable
      transactionHash: sellResult.transactionHash
    });

    return NextResponse.json({
      success: true,
      transactionHash: sellResult.transactionHash,
      usdcAmount: usdcAmount / 1_000_000, // Return in human readable format
      tokenSymbol,
      tokenAmount,
      executionPrice: currentPrice,
      stopLossPrice
    });

  } catch (error: any) {
    console.error('Stop loss execution failed:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Stop loss execution failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
