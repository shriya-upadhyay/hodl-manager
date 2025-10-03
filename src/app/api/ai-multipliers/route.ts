// app/api/ai-multipliers/route.ts
import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const riskLevel = body.riskLevel;
    const symbol = body.symbol;
    const currentPrice = body.currentPrice;
    const marketCap = body.marketCap;
    const change24h = body.change24h;
    
    if (!riskLevel) {
      return NextResponse.json({ error: "Missing riskLevel in request" }, { status: 400 });
    }

    // Ask LLM to generate multipliers
    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        {
          role: "user",
          content: `Generate recommended price multipliers for a ${riskLevel} risk cryptocurrency trading strategy.

Token details:
- Symbol: ${symbol}
- Current Price: ${currentPrice}
- Market Cap: ${marketCap}
- 24h Change: ${change24h}%

IMPORTANT RULES:
- Take profit multiplier must be GREATER than 1.0 (e.g., 1.5, 2.0, 3.0) to sell when price goes UP
- Stop loss multiplier must be LESS than 1.0 (e.g., 0.85, 0.7, 0.5) to sell when price goes DOWN

Risk level guidelines:
- Conservative: takeProfit ~1.5-2.0, stopLoss ~0.85-0.90
- Moderate: takeProfit ~2.0-2.8, stopLoss ~0.65-0.75  
- Aggressive: takeProfit ~3.0-4.0, stopLoss ~0.45-0.55

Return ONLY valid JSON in this exact format, no explanation:
{ "takeProfit": number, "stopLoss": number }`
        },
      ],
    });

    const text = completion.choices[0]?.message?.content || "";

    // Try to parse the response JSON safely
    let multipliers = { takeProfit: null, stopLoss: null };
    try {
      multipliers = JSON.parse(text);
      
      // Validate multipliers are in correct ranges
      if (typeof multipliers.takeProfit === 'number' && multipliers.takeProfit <= 1.0) {
        console.warn(`Invalid AI takeProfit multiplier: ${multipliers.takeProfit} (must be > 1.0)`);
        multipliers.takeProfit = null;
      }
      
      if (typeof multipliers.stopLoss === 'number' && multipliers.stopLoss >= 1.0) {
        console.warn(`Invalid AI stopLoss multiplier: ${multipliers.stopLoss} (must be < 1.0)`);
        multipliers.stopLoss = null;
      }
      
      console.log("AI multipliers validated:", multipliers);
    } catch {
      console.warn("Failed to parse LLM response as JSON:", text);
    }

    return NextResponse.json({ success: true, multipliers });
  } catch (error: any) {
    console.error("AI multiplier generation error:", error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
