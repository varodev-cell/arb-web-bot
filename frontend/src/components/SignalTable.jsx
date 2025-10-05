import React from 'react'
  export default function SignalTable({ items }) {
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>#</th>
              <th style={th}>Symbol</th>
              <th style={th}>Src→ Dst</th>
              <th style={th}>Prices</th>
              <th style={th}>Spread (bps)</th>
              <th style={th}>Time</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
        <tr key={r.id}>
          <td style={td}>{r.id}</td>
          <td style={td}><b>{r.symbol}</b></td>
          <td style={td}>{r.src}→ {r.dst}</td>
          <td style={td}>{Number(r.src_price).toFixed(4)}→
            {Number(r.dst_price).toFixed(4)}</td>
          <td style={td}><b>{Number(r.spread_bps).toFixed(1)}</b></td>
          <td style={td}>{new Date(r.created_at +
                                   'Z').toLocaleTimeString()}</td>
        </tr>
      ))}
          </tbody>
        </table>
      </div>
    )
  }
const th = { textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding:
  '8px' }
  const td = { borderBottom: '1px solid #f3f4f6', padding: '8px', fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, monospace' }
