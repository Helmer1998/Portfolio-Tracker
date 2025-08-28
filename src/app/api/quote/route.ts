// src/app/api/quote/route.ts
import { NextResponse } from "next/server";

// Make sure dev doesn’t cache
export const dynamic = "force-dynamic";

// ==== simple in-memory cache (per server instance) ====
const cache = new Map<string, { t: number; price: number | null }>();
const CACHE_MS = 60_000; // 60 seconds

function getCached(key: string) {
  const v = cache.get(key);
  if (v && Date.now() - v.t < CACHE_MS) return v.price;
  return undefined;
}
function setCached(key: string, price: number | null) {
  cache.set(key, { t: Date.now(), price });
}

// ==== helpers ====
async function fetchJson(url: string, init?: RequestInit) {
  const r = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    cache: "no-store",
    ...init,
  });
  return r.json();
}
function firstNumber(...vals: any[]) {
  for (const v of vals) if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

// ==== STOCKS (Yahoo multi-fallback) ====
async function yahooQuote(symbol: string) {
  const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(
    symbol
  )}&region=US&lang=en-US`;
  const data = await fetchJson(url);
  const q = data?.quoteResponse?.result?.[0];
  if (!q) return null;
  return firstNumber(
    q.regularMarketPrice,
    q.postMarketPrice,
    q.preMarketPrice,
    q.ask,
    q.bid,
    q.previousClose
  );
}
async function yahooQuoteSummary(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
    symbol
  )}?modules=price`;
  const data = await fetchJson(url);
  const p =
    data?.quoteSummary?.result?.[0]?.price?.regularMarketPrice?.raw ??
    data?.quoteSummary?.result?.[0]?.price?.postMarketPrice?.raw ??
    data?.quoteSummary?.result?.[0]?.price?.preMarketPrice?.raw ??
    null;
  return typeof p === "number" ? p : null;
}
async function yahooChartLast(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?range=1d&interval=1m`;
  const data = await fetchJson(url);
  const closes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close as number[] | undefined;
  if (!Array.isArray(closes)) return null;
  const last = [...closes].reverse().find((x) => typeof x === "number" && Number.isFinite(x));
  return typeof last === "number" ? last : null;
}
async function stockPrice(symbol: string): Promise<number | null> {
  return (
    (await yahooQuote(symbol)) ??
    (await yahooQuoteSummary(symbol)) ??
    (await yahooChartLast(symbol)) ??
    null
  );
}

// ==== CRYPTO (CoinGecko) ====
const CG_PRESET: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  ADA: "cardano",
  DOGE: "dogecoin",
  XRP: "ripple",
  LTC: "litecoin",
};
async function coingeckoResolveId(symbol: string): Promise<string | null> {
  if (CG_PRESET[symbol]) return CG_PRESET[symbol];
  const search = await fetchJson(
    `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`
  );
  const match = search?.coins?.find(
    (c: any) => String(c?.symbol).toUpperCase() === symbol.toUpperCase()
  );
  return match?.id ?? null;
}
async function coingeckoPriceBySymbol(symbol: string): Promise<number | null> {
  const id = await coingeckoResolveId(symbol);
  if (!id) return null;
  const data = await fetchJson(
    `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd`
  );
  const p = data?.[id]?.usd;
  return typeof p === "number" ? p : null;
}

// ==== API handler ====
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") || "").toUpperCase();
  const type = (searchParams.get("type") || "stock").toLowerCase();

  if (!symbol) {
    return NextResponse.json({ error: "Missing ?symbol=", price: null }, { status: 400 });
  }

  // check cache
  const key = `${type}:${symbol}`;
  const cached = getCached(key);
  if (cached !== undefined) {
    return NextResponse.json({ symbol, type, price: cached, cached: true });
  }

  try {
    let price: number | null = null;

    if (type === "crypto") {
      price = await coingeckoPriceBySymbol(symbol);
    } else {
      price = await stockPrice(symbol);
    }

    setCached(key, price); // save to cache
    return NextResponse.json({ symbol, type, price });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error", price: null }, { status: 500 });
  }
}
