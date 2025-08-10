"use client";
import { useEffect, useMemo, useState } from "react";

type Holding = {
  id: string;
  symbol: string;
  type: "stock" | "crypto";
  qty: number;
  avg: number; // USD for now
  live?: number | null;
};

const STORAGE_KEY = "holdings_v1";

const defaultRows: Holding[] = [
  { id: "1", symbol: "RXRX", type: "stock", qty: 100, avg: 7.48 },
  { id: "2", symbol: "BTC",  type: "crypto", qty: 0.05, avg: 40000 },
];

export default function HoldingsClient() {
  const [rows, setRows] = useState<Holding[]>(defaultRows);
  const [adding, setAdding] = useState({ symbol: "", type: "stock" as "stock" | "crypto", qty: "", avg: "" });

  // load/save to localStorage
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { setRows(JSON.parse(raw)); } catch {}
    }
  }, []);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  }, [rows]);

  // fetch prices (sequential to be gentle with free API limits)
  async function fetchPrice(symbol: string, type: "stock" | "crypto") {
    const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const r = await fetch(`${base}/api/quote?symbol=${symbol}&type=${type}`, { cache: "no-store" });
    const j = await r.json();
    return typeof j.price === "number" ? j.price : null;
  }
  async function refreshPrices() {
    const updated: Holding[] = [];
    for (const h of rows) {
      const price = await fetchPrice(h.symbol, h.type);
      updated.push({ ...h, live: price });
      // tiny delay to avoid Alpha Vantage rate limit when hitting stocks
      await new Promise(res => setTimeout(res, 600));
    }
    setRows(updated);
  }

  const total = useMemo(
    () => rows.reduce((s, h) => s + (typeof h.live === "number" ? h.live * h.qty : 0), 0),
    [rows]
  );

  function addRow() {
    const qty = Number(adding.qty);
    const avg = Number(adding.avg);
    if (!adding.symbol.trim() || !isFinite(qty) || !isFinite(avg)) return;
    setRows(prev => [
      ...prev,
      { id: crypto.randomUUID(), symbol: adding.symbol.toUpperCase(), type: adding.type, qty, avg, live: null },
    ]);
    setAdding({ symbol: "", type: "stock", qty: "", avg: "" });
  }
  function updateRow(id: string, patch: Partial<Holding>) {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeRow(id: string) {
    setRows(prev => prev.filter(r => r.id !== id));
  }
  function resetAll() {
    setRows(defaultRows);
  }

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold">Paper Portfolio</h1>
      <div className="mt-1 text-sm opacity-70">Locally saved to your browser (no login/database yet).</div>

      {/* Add row */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-5 gap-2">
        <input
          className="border rounded px-2 py-2"
          placeholder="Symbol (e.g., RXRX, BTC)"
          value={adding.symbol}
          onChange={e => setAdding(a => ({ ...a, symbol: e.target.value }))}
        />
        <select
          className="border rounded px-2 py-2"
          value={adding.type}
          onChange={e => setAdding(a => ({ ...a, type: e.target.value as "stock" | "crypto" }))}
        >
          <option value="stock">stock</option>
          <option value="crypto">crypto</option>
        </select>
        <input
          className="border rounded px-2 py-2"
          placeholder="Qty"
          inputMode="decimal"
          value={adding.qty}
          onChange={e => setAdding(a => ({ ...a, qty: e.target.value }))}
        />
        <input
          className="border rounded px-2 py-2"
          placeholder="Avg (USD)"
          inputMode="decimal"
          value={adding.avg}
          onChange={e => setAdding(a => ({ ...a, avg: e.target.value }))}
        />
        <button className="border rounded px-3 py-2 hover:bg-gray-50" onClick={addRow}>
          Add holding
        </button>
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <button className="border rounded px-3 py-2 hover:bg-gray-50" onClick={refreshPrices}>
          Refresh prices
        </button>
        <button className="border rounded px-3 py-2 hover:bg-gray-50" onClick={resetAll}>
          Reset to defaults
        </button>
      </div>

      <div className="mt-4 text-lg">Total (USD, live): ${total.toLocaleString()}</div>

      <table className="mt-4 w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Symbol</th>
            <th>Type</th>
            <th>Qty</th>
            <th>Avg</th>
            <th>Live</th>
            <th>P/L</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(h => {
            const hasLive = typeof h.live === "number";
            const pl = hasLive ? (h.live - h.avg) * h.qty : null;
            return (
              <tr key={h.id} className="border-b">
                <td className="py-2">
                  <input
                    className="border rounded px-1 py-1 w-24"
                    value={h.symbol}
                    onChange={e => updateRow(h.id, { symbol: e.target.value.toUpperCase() })}
                  />
                </td>
                <td>
                  <select
                    className="border rounded px-1 py-1"
                    value={h.type}
                    onChange={e => updateRow(h.id, { type: e.target.value as "stock" | "crypto" })}
                  >
                    <option value="stock">stock</option>
                    <option value="crypto">crypto</option>
                  </select>
                </td>
                <td>
                  <input
                    className="border rounded px-1 py-1 w-24"
                    inputMode="decimal"
                    value={h.qty}
                    onChange={e => updateRow(h.id, { qty: Number(e.target.value) })}
                  />
                </td>
                <td>
                  <input
                    className="border rounded px-1 py-1 w-24"
                    inputMode="decimal"
                    value={h.avg}
                    onChange={e => updateRow(h.id, { avg: Number(e.target.value) })}
                  />
                </td>
                <td>{hasLive ? `$${h.live!.toFixed(2)}` : "-"}</td>
                <td className={pl !== null && pl >= 0 ? "text-green-600" : "text-red-600"}>
                  {pl === null ? "-" : `${pl >= 0 ? "+" : ""}$${pl.toFixed(2)}`}
                </td>
                <td>
                  <button className="text-red-600 hover:underline" onClick={() => removeRow(h.id)}>
                    delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="mt-3 text-xs opacity-70">
        Note: Alpha Vantage free tier is ~5 requests/min for stocks. If some Live prices are “-”, wait ~30s and hit Refresh.
      </p>
    </main>
  );
}
