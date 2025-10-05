import React, { useEffect, useMemo, useState } from 'react'
  import SignalTable from './components/SignalTable'
    export default function App() {
      const [items, setItems] = useState([])
        const [backendUrl, setBackendUrl] =
          useState(import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000')
          useEffect(() => {
            // HTTP fetch на старте
            fetch(`${backendUrl}/signals?limit=50`).then(r => r.json()).then(d =>
              setItems(d.items || [])).catch(() => {})
            // и WebSocket стрим
            let ws = null
              try {
                const wsUrl = backendUrl.replace('http', 'ws') + '/ws'
                  ws = new WebSocket(wsUrl)
                    ws.onmessage = (ev) => {
                      try {
                        const data = JSON.parse(ev.data)
                          if (data.type === 'signals') setItems(data.items || [])
                      } catch {}
                    }
              } catch {}
            return () => { try { ws && ws.close() } catch {} }
          }, [backendUrl])
            const maxBps = useMemo(() => items.reduce((m, r) => Math.max(m,
                                                                         Number(r.spread_bps)||0), 0), [items])
              return (
                <div style={{ maxWidth: 1200, margin: '24px auto', padding: '0 16px' }}>
                  <h1 style={{ marginBottom: 4 }}>Arb Web Bot</h1>
                  <p style={{ marginTop: 0, color: '#6b7280' }}>Лайв‑сигналы с Binance↔
                    Bybit. Твой Telegram уже получает алерты при превышении порога.</p>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin:
                  '12px 0 20px' }}>
                    <input
                      width: 420 }}
                    style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 8,
                            value={backendUrl}
                    onChange={e => setBackendUrl(e.target.value)}
                    placeholder="http://localhost:8000"
                    />
                    <span style={{ fontSize: 12, color: '#6b7280' }}>Max spread:
                      <b>{maxBps.toFixed(1)} bps</b></span>
                  </div>
                  <SignalTable items={items} />
                  <footer style={{ marginTop: 24, fontSize: 12, color: '#9ca3af' }}>MVP
                    • Binance/Bybit tickers • WebSocket push • SQLite</footer>
                </div>
              )
    }
