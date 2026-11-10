import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Health check for Render. Reports which env vars are set (never their values).
export async function GET() {
  const keys = [
    "DATABASE_URL",
    "PAYPAL_CLIENT_ID",
    "PAYPAL_CLIENT_SECRET",
    "NEXT_PUBLIC_PAYPAL_CLIENT_ID",
    "CHANNEL3_API_KEY",
    "LLM_API_KEY",
    "ADMIN_PASSCODE",
  ];
  const env = Object.fromEntries(keys.map((k) => [k, Boolean(process.env[k])]));
  const llm = {
    provider: (process.env.LLM_BASE_URL || "gemini").includes("groq") ? "groq" : process.env.LLM_BASE_URL ? "custom" : "gemini",
    model: process.env.LLM_MODEL || "gemini-3.8-flash",
  };

  return NextResponse.json({ status: "ok", time: new Date().toISOString(), env, llm });
}
