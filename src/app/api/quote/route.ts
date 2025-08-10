import { NextResponse } from "next/server";

const AV = process.env.ALPHA_VANTAGE_KEY!;
const CG = "https://api.coingecko.com/api/v3";

async function stockPrice(symbol: string) {
  if (!AV) return null; // no key yet
  const r = await fetch(
    `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${AV}`,
    { cache: "no-store" }
  );
  const j = await r.json();
  const p = parseFloat(j["Global Quote"]?.["05. price"] || "NaN");
  return Number.isFinite(p) ? p : null;
}

async function cryptoPrice(symbol: string) {
  const map: Record<string, string> = { BTC: "bitcoin", SOL: "solana", ETH: "ethereum" };
  const id = map[symbol.toUpperCase()] || symbol.toLowerCase();
  const r = await fetch(`${CG}/simple/price?ids=${id}&vs_currencies=usd`, { cache: "no-store" });
  const j = await r.json();
  const p = j?.[id]?.usd;
  return typeof p === "number" ? p : null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  const type = (searchParams.get("type") || "stock").toLowerCase(); // stock | crypto
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
  const price = type === "crypto" ? await cryptoPrice(symbol) : await stockPrice(symbol);
  return NextResponse.json({ symbol, price });
}
