import React, { useMemo } from "react";

// Превратим "BTCUSDT" -> "btc" для иконок
function symbolToIcon(sym = "") {
  const base = sym.toLowerCase().replace(/usdt|usd|busd|usdc|perp$/i, "");
  return base || "btc";
}

// Источник логотипов (простые бесплатные иконки)
function logoUrl(sym) {
  return `https://cryptoicons.org/api/icon/${symbolToIcon(sym)}/32`;
}

function fmt(n, d = 4) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: d,
  });
}

function timeAgo(iso) {
  const t = new Date(iso).getTime();
  if (!t) return "—";
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h`;
}

export default function SignalTable({ items, minSpreadBps = 0 }) {
  const rows = useMemo(() => {
    // последние сверху
    return [...items].sort((a, b) => Number(b.id) - Number(a.id));
  }, [items]);

  return (
    <div style={{ overflowX: "auto" }}>
      <table>
        <thead>
          <tr>
            <th style={{ width: 60 }}>#</th>
            <th>Symbol</th>
            <th>Src → Dst</th>
            <th>Prices</th>
            <th>Spread (bps)</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="muted">
                Нет данных (ждём сигналы или проверь WS/REST)
              </td>
            </tr>
          ) : (
            rows.map((s, i) => {
              const isOk = Number(s.net_spread_bps ?? s.spread_bps) >=
                Number(minSpreadBps || 0);
              return (
                <tr key={s.id ?? i}>
                  <td className="muted mono">{s.id ?? i + 1}</td>
                  <td className="mono">
                    <img
                      src={logoUrl(s.symbol)}
                      alt=""
                      className="logo"
                      onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                    />
                    {s.symbol}
                  </td>
                  <td className="mono">
                    <span className="badge">{s.src}</span> →{" "}
                    <span className="badge">{s.dst}</span>
                  </td>
                  <td className="mono">
                    {fmt(s.src_price)} → {fmt(s.dst_price)}
                  </td>
                  <td className={`mono ${isOk ? "ok" : "bad"}`}>
                    {fmt(s.net_spread_bps ?? s.spread_bps, 1)}
                  </td>
                  <td className="muted mono">{timeAgo(s.created_at)}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
