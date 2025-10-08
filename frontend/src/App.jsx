import React, { useEffect, useMemo, useRef, useState } from "react";
import { createChart, ColorType } from "lightweight-charts";
import SignalTable from "./components/SignalTable.jsx";

// ====== небольшие утилиты ======
const toSec = (iso) => Math.floor(new Date(iso.endsWith("Z") ? iso : iso + "Z").getTime() / 1000);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = (v, d = 2) => Number(v ?? 0).toFixed(d);

// Дефолтные комиссии бирж (в bps, 1 bps = 0.01%)
const DEFAULT_FEES = {
  binance: 7,  // 0.07%
  bybit: 10,   // 0.10%
};

export default function App() {
  // URL бэкенда прокидывается из Actions в .env при билде
  const API = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");

  // WebSocket URL
  const WS_URL = useMemo(() => {
    if (!API) return "";
    const u = new URL(API);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    u.pathname = "/ws";
    u.search = "";
    return u.toString();
  }, [API]);

  // ---------- ТЕМА ----------
  const [theme, setTheme] = useState("light"); // 'light' | 'dark'
  const isDark = theme === "dark";

  // ---------- ДАННЫЕ ----------
  const [items, setItems] = useState([]);
  const wsRef = useRef(null);

  // Параметры арбитража
  const [capital, setCapital] = useState(1000);          // $
  const [minNetBps, setMinNetBps] = useState(5);         // минимальный чистый спред (bps)
  const [fees, setFees] = useState({ ...DEFAULT_FEES }); // комиссии по биржам (bps)
  const [extraSlippage, setExtraSlippage] = useState(5); // страховочный слиппедж (bps)

  // Выбранный символ для графика
  const [selected, setSelected] = useState(null);

  // Хранилище таймсерий по инструментам (на базе приходящих сигналов)
  // { [symbol]: { pricesSrc: [{time, value}], pricesDst: [...], spread: [...] } }
  const seriesRef = useRef({});

  // 1) Первый снимок через REST
  useEffect(() => {
    if (!API) return;
    fetch(`${API}/signals`)
      .then((r) => r.json())
      .then((d) => {
        const arr = Array.isArray(d.items) ? d.items : [];
        setItems(arr);
        ingest(arr);
      })
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
          ingest(msg.items);
        }
      } catch (e) {
        console.error("WS parse error:", e);
      }
    };

    ws.onerror = (e) => console.error("WS error:", e);
    ws.onclose = () => (wsRef.current = null);
    return () => ws.close(1000);
  }, [WS_URL]);

  // Накапливаем таймсерии для графика
  function ingest(list) {
    const bucket = seriesRef.current;
    for (const r of list) {
      const symbol = r.symbol;
      if (!symbol) continue;
      const t = toSec(r.created_at || new Date().toISOString());
      const srcP = Number(r.src_price);
      const dstP = Number(r.dst_price);
      const spread = Number(r.spread_bps);

      if (!bucket[symbol]) bucket[symbol] = { pricesSrc: [], pricesDst: [], spread: [] };

      // укорачиваем до разумного окна
      const pushLimited = (arr, point, lim = 400) => {
        arr.push(point);
        if (arr.length > lim) arr.splice(0, arr.length - lim);
      };

      if (srcP > 0) pushLimited(bucket[symbol].pricesSrc, { time: t, value: srcP });
      if (dstP > 0) pushLimited(bucket[symbol].pricesDst, { time: t, value: dstP });
      if (!isNaN(spread)) pushLimited(bucket[symbol].spread, { time: t, value: spread });
    }
  }

  // Чистый спред и P&L
  function withNetMetrics(row) {
    const feeSrc = fees[(row.src || "").toLowerCase()] ?? 0;
    const feeDst = fees[(row.dst || "").toLowerCase()] ?? 0;
    const netBps = Number(row.spread_bps) - (feeSrc + feeDst) - Number(extraSlippage || 0);
    const pnl = (Number(capital) * (netBps / 10000));
    return { ...row, net_bps: netBps, est_pnl: pnl };
  }

  const enriched = useMemo(() => items.map(withNetMetrics), [items, fees, extraSlippage, capital]);

  // ---------- ГРАФИК ----------
  const chartWrapRef = useRef(null);
  const chartRef = useRef(null);
  const seriesPriceSrcRef = useRef(null);
  const seriesPriceDstRef = useRef(null);
  const seriesSpreadRef = useRef(null);

  // создаём/переинициализируем график при смене темы
  useEffect(() => {
    if (!chartWrapRef.current) return;

    // очистка
    chartWrapRef.current.innerHTML = "";
    chartRef.current = createChart(chartWrapRef.current, {
      height: 320,
      layout: {
        background: { type: ColorType.Solid, color: isDark ? "#0b1220" : "#ffffff" },
        textColor: isDark ? "#d1d5db" : "#111827",
      },
      rightPriceScale: { borderColor: isDark ? "#243146" : "#e5e7eb" },
      timeScale: { borderColor: isDark ? "#243146" : "#e5e7eb" },
      grid: {
        vertLines: { color: isDark ? "#1f2a3a" : "#f3f4f6" },
        horzLines: { color: isDark ? "#1f2a3a" : "#f3f4f6" },
      },
      crosshair: { mode: 0 },
    });

    // линии цен и область спреда
    seriesPriceSrcRef.current = chartRef.current.addLineSeries({ color: "#3b82f6", lineWidth: 2 }); // blue
    seriesPriceDstRef.current = chartRef.current.addLineSeries({ color: "#ef4444", lineWidth: 2 }); // red
    seriesSpreadRef.current = chartRef.current.addAreaSeries({
      lineColor: "#10b981", topColor: "rgba(16,185,129,0.4)", bottomColor: "rgba(16,185,129,0.05)"
    });

    // подмешиваем данные по выбранному инструменту
    feedChart(selected);

    const handle = () => chartRef.current && chartRef.current.timeScale().fitContent();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, [theme]); // eslint-disable-line

  // переотдаём данные на график при смене выбранного символа/данных
  useEffect(() => {
    feedChart(selected);
  }, [selected, items]); // eslint-disable-line

  function feedChart(symbol) {
    if (!symbol || !chartRef.current) return;
    const bucket = seriesRef.current[symbol] || { pricesSrc: [], pricesDst: [], spread: [] };
    seriesPriceSrcRef.current?.setData(bucket.pricesSrc);
    seriesPriceDstRef.current?.setData(bucket.pricesDst);
    seriesSpreadRef.current?.setData(bucket.spread);
    chartRef.current.timeScale().fitContent();
  }

  // стиль контейнера
  const page = {
    minHeight: "100dvh",
    color: isDark ? "#d1d5db" : "#111827",
    background: isDark ? "#0b1220" : "#ffffff",
    transition: "background 160ms ease, color 160ms ease",
    padding: 16,
    fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji"',
  };

  if (!API) {
    return (
      <div style={page}>
        <h2>Arb Web Bot</h2>
        <p>
          Не задан <code>VITE_BACKEND_URL</code>. В GitHub Actions он добавляется шагом:<br />
          <code>echo "VITE_BACKEND_URL=https://arb-web-bot.onrender.com" &gt; .env</code>
        </p>
      </div>
    );
  }

  return (
    <div style={page}>
      {/* Header */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Arb Web Bot</h2>
          <div style={{ color: isDark ? "#9ca3af" : "#6b7280" }}>Источник: {API}</div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid " + (isDark ? "#243146" : "#e5e7eb"),
              background: isDark ? "#111827" : "#ffffff",
              color: isDark ? "#d1d5db" : "#111827",
              cursor: "pointer",
            }}
            title="Toggle theme"
          >
            {isDark ? "🌙 Dark" : "☀️ Light"}
          </button>
        </div>
      </div>

      {/* Панель параметров */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
          gap: 8,
          border: "1px solid " + (isDark ? "#243146" : "#e5e7eb"),
          padding: 12,
          borderRadius: 12,
          marginBottom: 12,
          background: isDark ? "#0f172a" : "#fafafa",
        }}
      >
        <Field label="Капитал ($)">
          <input type="number" min="0" step="100"
            value={capital}
            onChange={(e) => setCapital(clamp(Number(e.target.value || 0), 0, 1e9))}
          />
        </Field>

        <Field label="Мин. чистый спред (bps)">
          <input type="number" min="-1000" step="0.1"
            value={minNetBps}
            onChange={(e) => setMinNetBps(Number(e.target.value || 0))}
          />
        </Field>

        <Field label="Слиппедж (bps)">
          <input type="number" min="0" step="0.1"
            value={extraSlippage}
            onChange={(e) => setExtraSlippage(Number(e.target.value || 0))}
          />
        </Field>

        <Field label="binance fee (bps)">
          <input type="number" min="0" step="0.1"
            value={fees.binance}
            onChange={(e) => setFees((p) => ({ ...p, binance: Number(e.target.value || 0) }))}
          />
        </Field>

        <Field label="bybit fee (bps)">
          <input type="number" min="0" step="0.1"
            value={fees.bybit}
            onChange={(e) => setFees((p) => ({ ...p, bybit: Number(e.target.value || 0) }))}
          />
        </Field>

        <Field label="Текущий инструмент">
          <div style={{ fontWeight: 600 }}>{selected || "—"}</div>
        </Field>
      </div>

      {/* График */}
      <div
        style={{
          border: "1px solid " + (isDark ? "#243146" : "#e5e7eb"),
          borderRadius: 12,
          marginBottom: 12,
          background: isDark ? "#0f172a" : "#ffffff",
        }}
      >
        <div style={{ padding: "8px 12px", fontWeight: 600 }}>График цен и спреда (live)</div>
        <div ref={chartWrapRef} style={{ width: "100%" }} />
      </div>

      {/* Таблица сигналов */}
      <SignalTable
        items={enriched}
        isDark={isDark}
        capital={capital}
        minNetBps={minNetBps}
        onPickSymbol={(sym) => setSelected(sym)}
      />
    </div>
  );
}

// простой label+input
function Field({ label, children }) {
  return (
    <label style={{ display: "grid", gap: 6, fontSize: 12 }}>
      <span style={{ opacity: 0.8 }}>{label}</span>
      {React.cloneElement(children, {
        style: {
          padding: "6px 8px",
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          outline: "none",
        },
      })}
    </label>
  );
}
