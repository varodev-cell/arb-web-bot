import React, { useEffect, useMemo, useRef, useState } from "react";
import SignalTable from "./SignalTable.jsx";

export default function App() {
  const API = import.meta.env.VITE_BACKEND_URL?.replace(/\/+$/, "") || "";
  const WS  = useMemo(() => {
    if (!API) return "";
    const url = new URL(API);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/ws";
    url.search = "";
    return url.toString();
  }, [API]);

  const [items, setItems] = useState([]);
  const wsRef = useRef(null);

  // Первичная подгрузка
  useEffect(() => {
    if (!API) return;
    fetch(`${API}/signals`)
      .then(r => r.json())
      .then(data => setItems(data.items ?? []))
      .catch(() => {});
  }, [API]);

  // Live-обновления через WS
  useEffect(() => {
    if (!WS) return;
    const ws = new WebSocket(WS);
    wsRef.current = ws;
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === "signals" && Array.isArray(msg.items)) {
          setItems(msg.items);
        }
      } catch {}
    };
    ws.onclose = () => {
      // авто-реконнект
      setTimeout(() => {
        if (wsRef.current === ws) wsRef.current = null;
      }, 1000);
    };
    return () => ws.close();
  }, [WS]);

  if (!API) {
    return (
      <div style={{padding:16}}>
        <h3>Настрой переменную VITE_BACKEND_URL</h3>
        <p>Добавь в <code>frontend/.env</code> строку:<br/>
          <code>VITE_BACKEND_URL=https://arb-web-bot.onrender.com</code>
        </p>
      </div>
    );
  }

  return (
    <div style={{padding:16}}>
      <h2>Arb Web Bot</h2>
      <p style={{color:"#6b7280"}}>Источник: {API}</p>
      <SignalTable items={items} />
    </div>
  );
}
