import React, { useEffect, useMemo, useRef, useState } from "react";
import SignalTable from "./components/SignalTable.jsx";

export default function App() {
  // URL бэкенда прокидывается из Actions в .env при билде
  const API = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");

  // Собираем wss://…/ws для вебсокета
  const WS_URL = useMemo(() => {
    if (!API) return "";
    const u = new URL(API);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    u.pathname = "/ws";
    u.search = "";
    return u.toString();
  }, [API]);

  const [items, setItems] = useState([]);
  const wsRef = useRef(null);

  // 1) Первый снимок данных через REST
  useEffect(() => {
    if (!API) return;
    fetch(`${API}/signals`)
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d.items) ? d.items : []))
      .catch((e) => console.error("GET /signals failed:", e));
  }, [API]);

  // 2) Живая лента через WebSocket
  useEffect(() => {
    if (!WS_URL) return;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg?.type === "signals" && Array.isArray(msg.items)) {
          setItems(msg.items);
        }
      } catch (e) {
        console.error("WS parse error:", e);
      }
    };

    ws.onerror = (e) => console.error("WS error:", e);
    ws.onclose = () => (wsRef.current = null);

    return () => ws.close(1000);
  }, [WS_URL]);

  if (!API) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Arb Web Bot</h2>
        <p>Не задан <code>VITE_BACKEND_URL</code>. В GitHub Actions он добавляется шагом:
          <br />
          <code>echo "VITE_BACKEND_URL=https://arb-web-bot.onrender.com" &gt; .env</code>
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Arb Web Bot</h2>
      <p style={{ color: "#6b7280" }}>Источник: {API}</p>
      <SignalTable items={items} />
    </div>
  );
}
