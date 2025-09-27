// app/api/balances/route.ts
import axios from "axios"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { address } = await req.json()

  const myHeaders = new Headers()
  myHeaders.append("content-type", "application/json")

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
    variables: { owner: String(address) },
  })

  const response = await fetch("https://api.testnet.aptoslabs.com/v1/graphql", {
    method: "POST",
    headers: myHeaders,
    body: graphql,
  })

  const textData = await response.text()
  const data = JSON.parse(textData)
  const balances = data.data.current_fungible_asset_balances || []

  const tokens = balances.map((t: any) => {
    const decimals = t.metadata.decimals || 8
    return {
      ...t,
      humanBalance: parseFloat(t.amount) / Math.pow(10, decimals),
    }
  })

  const symbols = tokens.map((t: any) => t.metadata.symbol.toUpperCase()).join(',');
  const priceRes = await axios.get(
    'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest',
    {
      headers: { 'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY },
      params: {
        symbol: symbols,
        convert: 'USD'
      }
    }
  );

  console.log(priceRes)
  const priceData = priceRes.data;
  const coins = priceData.data || [];

const tokensWithUSD = tokens.map((t: any) => {
  const coin = coins[t.metadata.symbol.toUpperCase()]
  const price = coin?.price ?? 0
  return {
    ...t,
    price,
    value: t.humanBalance * price,
  }
})

  const totalValue = tokensWithUSD.reduce((sum: number, t: any) => sum + t.value, 0)

  

  

  // sum up raw value (not USD!)

  console.log(tokens)
  console.log(totalValue)

  return NextResponse.json({ tokens, totalValue })
}
