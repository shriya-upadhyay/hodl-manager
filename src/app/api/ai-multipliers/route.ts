// app/api/ai-multipliers/route.ts
import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { riskLevel } = body;

    if (!riskLevel) {
      return NextResponse.json({ error: "Missing riskLevel in request" }, { status: 400 });
    }

    // Ask LLM to generate multipliers
    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        {
          role: "user",
          content: `Generate recommended take profit and stop loss multipliers for a ${riskLevel} risk strategy. Return **only JSON**, like: { "takeProfit": number, "stopLoss": number }. Do not include any explanation or extra text.`
        },
      ],
    });

    const text = completion.choices[0]?.message?.content || "";

    // Try to parse the response JSON safely
    let multipliers = { takeProfit: null, stopLoss: null };
    try {
      multipliers = JSON.parse(text);
    } catch {
      console.warn("Failed to parse LLM response as JSON:", text);
    }

    console.log(text)

    return NextResponse.json({ success: true, multipliers });
  } catch (error: any) {
    console.error("AI multiplier generation error:", error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
