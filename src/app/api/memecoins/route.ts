import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.CMC_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'CMC_API_KEY environment variable is not set' },
        { status: 500 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const symbols = searchParams.get('symbols');
    const convert = searchParams.get('convert') || 'USD';
    
    // Default to popular memecoins if no symbols provided
    const coinSymbols = symbols || 'DOGE,SHIB,PEPE,FLOKI,BONK';

    const response = await axios.get(
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest',
      {
        headers: { 'X-CMC_PRO_API_KEY': apiKey },
        params: {
          symbol: coinSymbols,
          convert: convert
        }
      }
    );

    const coins = response.data.data;
    const formattedCoins = [];

    for (const symbol in coins) {
      const coin = coins[symbol];
      const priceData = coin.quote[convert];

      formattedCoins.push({
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol,
        price: priceData.price,
        priceFormatted: `$${priceData.price.toFixed(6)}`,
        change24h: priceData.percent_change_24h,
        change24hFormatted: `${priceData.percent_change_24h.toFixed(2)}%`,
        marketCap: priceData.market_cap,
        volume24h: priceData.volume_24h,
        lastUpdated: coin.last_updated
      });
    }

    return NextResponse.json({
      success: true,
      data: formattedCoins,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error fetching memecoin prices:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch memecoin prices',
        details: error.response?.data?.status || error.message 
      },
      { status: 500 }
    );
  }
}
