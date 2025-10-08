import React from "react";

const th = { textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 };
const td = { borderBottom: "1px solid #f3f4f6", padding: 8, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };

export default function SignalTable({ items }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>#</th>
            <th style={th}>Symbol</th>
            <th style={th}>Src → Dst</th>
            <th style={th}>Prices</th>
            <th style={th}>Spread (bps)</th>
            <th style={th}>Time</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r, i) => (
            <tr key={r.id ?? i}>
              <td style={td}>{i + 1}</td>
              <td style={td}>{r.symbol}</td>
              <td style={td}>
                {r.src} → {r.dst}
              </td>
              <td style={td}>
                {Number(r.src_price).toFixed(4)} → {Number(r.dst_price).toFixed(4)}
              </td>
              <td style={td}>
                <b>{Number(r.spread_bps).toFixed(1)}</b>
              </td>
              <td style={td}>
                {r.created_at ? new Date(r.created_at + "Z").toLocaleTimeString() : ""}
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td style={td} colSpan={6}>Нет данных (ждём сигналы или проверь WS/REST)</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
