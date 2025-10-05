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
