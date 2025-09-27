import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';


function computeRisk(coin: any, convert: string) {
  const priceData = coin.quote[convert];

  // Risk factors
  const volatility = Math.abs(priceData.percent_change_24h);
  const liquidityRatio = priceData.volume_24h / priceData.market_cap;
  const marketCap = priceData.market_cap;

  let risk = 0;

  // Volatility: higher % change = higher risk
  if (volatility > 20) risk += 3;
  else if (volatility > 10) risk += 2;
  else if (volatility > 5) risk += 1;

  // Liquidity: low ratio = higher risk
  if (liquidityRatio < 0.01) risk += 3;
  else if (liquidityRatio < 0.05) risk += 2;
  else if (liquidityRatio < 0.1) risk += 1;

  // Market cap: smaller = higher risk
  if (marketCap < 1e7) risk += 3;        // < $10M microcap
  else if (marketCap < 1e8) risk += 2;   // < $100M smallcap
  else if (marketCap < 1e9) risk += 1;   // < $1B midcap

  // Map score to label
  let label = "LOW";
  if (risk >= 7) label = "HIGH";
  else if (risk >= 4) label = "MODERATE";

  return { score: risk, label };
}


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
        lastUpdated: coin.last_updated,
        riskScore: computeRisk(coin, convert).label
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
