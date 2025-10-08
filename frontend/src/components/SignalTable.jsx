import React, { useMemo } from "react";

// Бейдж с логотипом актива (иконка из cryptoicons.org)
const logoUrl = (symbol = "") => {
  const base = (symbol || "").toLowerCase().replace("usdt", "").replace("usd", "");
  return `https://cryptoicons.org/api/icon/${base}/32`;
};

const cell = (isDark) => ({
  borderBottom: `1px solid ${isDark ? "#1f2a3a" : "#f3f4f6"}`,
  padding: 10,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
});
const head = (isDark) => ({
  textAlign: "left",
  borderBottom: `1px solid ${isDark ? "#243146" : "#e5e7eb"}`,
  padding: 10,
  fontWeight: 700,
  fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial',
});

export default function SignalTable({ items, isDark, capital, minNetBps, onPickSymbol }) {
  const rows = useMemo(
    () =>
      [...items]
        // можно отфильтровать по минимальному чистому спреду
        .filter((r) => (r.net_bps ?? -1e9) >= (Number(minNetBps) || 0))
        .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")),
    [items, minNetBps]
  );

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={head(isDark)}>#</th>
            <th style={head(isDark)}>Symbol</th>
            <th style={head(isDark)}>Src → Dst</th>
            <th style={head(isDark)}>Prices</th>
            <th style={head(isDark)}>Gross (bps)</th>
            <th style={head(isDark)}>Net (bps)</th>
            <th style={head(isDark)}>Est. P&amp;L</th>
            <th style={head(isDark)}>Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const gross = Number(r.spread_bps);
            const net = Number(r.net_bps);
            const pnl = Number(r.est_pnl);

            return (
              <tr
                key={r.id ?? i}
                onClick={() => onPickSymbol?.(r.symbol)}
                style={{ cursor: "pointer", background: i % 2 ? (isDark ? "#0b1220" : "#fafafa") : "transparent" }}
                title="Клик — показать график по этому инструменту"
              >
                <td style={cell(isDark)}>{i + 1}</td>

                <td style={{ ...cell(isDark), display: "flex", alignItems: "center", gap: 8 }}>
                  <img alt="" src={logoUrl(r.symbol)} width={20} height={20} style={{ borderRadius: 4 }} />
                  <strong>{r.symbol}</strong>
                </td>

                <td style={cell(isDark)}>
                  {r.src} → {r.dst}
                </td>

                <td style={cell(isDark)}>
                  {Number(r.src_price).toFixed(4)} → {Number(r.dst_price).toFixed(4)}
                </td>

                <td style={cell(isDark)}>
                  <b>{gross.toFixed(1)}</b>
                </td>

                <td style={cell(isDark)}>
                  <b style={{ color: net >= 0 ? "#10b981" : "#ef4444" }}>{net.toFixed(1)}</b>
                </td>

                <td style={cell(isDark)}>
                  <b style={{ color: pnl >= 0 ? "#10b981" : "#ef4444" }}>${pnl.toFixed(2)}</b>
                </td>

                <td style={cell(isDark)}>
                  {r.created_at ? new Date((r.created_at.endsWith("Z") ? r.created_at : r.created_at + "Z")).toLocaleTimeString() : ""}
                </td>
              </tr>
            );
          })}

          {rows.length === 0 && (
            <tr>
              <td style={cell(isDark)} colSpan={8}>
                Нет данных (либо фильтр по «Мин. чистый спред» слишком строгий).
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
