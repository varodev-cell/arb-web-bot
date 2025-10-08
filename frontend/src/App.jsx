import React, { useEffect, useMemo, useRef, useState } from "react";
import SignalTable from "./components/SignalTable";

const API_BASE = import.meta.env.VITE_BACKEND_URL?.replace(/\/+$/, "") || "";

const DEFAULT_FEES_BPS = { binance: 1.0, bybit: 1.0 };

const THEME_STORAGE_KEY = "arb-theme";
const PARAMS_STORAGE_KEY = "arb-params";

// -------------------- utils --------------------
async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}

function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem(THEME_STORAGE_KEY) || "light"
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);
  return { theme, setTheme };
}

function useParams() {
  const [params, setParams] = useState(() => {
    const saved = localStorage.getItem(PARAMS_STORAGE_KEY);
    return (
      (saved && JSON.parse(saved)) || {
        minSpreadBps: 3,
        capital: 1000,
        feesBps: DEFAULT_FEES_BPS,
        symbol: "BTCUSDT",
        chartMode: "line", // "line" | "candles"
        timeframe: "1m", // "1m"|"5m"|"15m"|"1h"
      }
    );
  });
  useEffect(() => {
    localStorage.setItem(PARAMS_STORAGE_KEY, JSON.stringify(params));
  }, [params]);
  return { params, setParams };
}

// агрегация сигналов в свечи (OHLC) по timeframe (сек)
function aggregateToCandles(items, timeframeSec) {
  if (!items?.length) return [];
  // сортировка по времени
  const arr = [...items]
    .map((s) => ({
      ts: Math.floor(new Date(s.created_at).getTime() / 1000),
      price: Number(s.dst_price) || Number(s.src_price) || NaN,
    }))
    .filter((x) => Number.isFinite(x.price))
    .sort((a, b) => a.ts - b.ts);

  const candles = [];
  let bucketStart = Math.floor(arr[0].ts / timeframeSec) * timeframeSec;
  let open = arr[0].price;
  let high = arr[0].price;
  let low = arr[0].price;
  let close = arr[0].price;

  let idx = 0;
  while (idx < arr.length) {
    const { ts, price } = arr[idx];
    // если вышли из текущего ведра — пушим свечу и создаем новое
    while (ts >= bucketStart + timeframeSec) {
      candles.push({
        time: bucketStart,
        open,
        high,
        low,
        close,
      });
      bucketStart += timeframeSec;
      // если пропуски по времени — копируем close -> open для пустых ведер
      open = close;
      high = close;
      low = close;
    }
    // обновляем текущую
    if (open === undefined) open = price;
    high = Math.max(high, price);
    low = Math.min(low, price);
    close = price;
    idx++;
  }
  // последняя свеча
  candles.push({ time: bucketStart, open, high, low, close });
  // ограничим для аккуратности
  return candles.slice(-300);
}

// -------------------- charts --------------------
function useLightweightChart(containerRef, mode, seriesData, theme) {
  useEffect(() => {
    let chart;
    let series;

    (async () => {
      const { createChart } = await import("lightweight-charts");
      const el = containerRef.current;
      if (!el) return;

      chart = createChart(el, {
        autoSize: true,
        layout: {
          background: { color: theme === "dark" ? "#0b0f14" : "#ffffff" },
          textColor: theme === "dark" ? "#d1d5db" : "#111827",
        },
        grid: {
          vertLines: { color: theme === "dark" ? "#1f2937" : "#e5e7eb" },
          horzLines: { color: theme === "dark" ? "#1f2937" : "#e5e7eb" },
        },
        rightPriceScale: { borderVisible: false },
        timeScale: { borderVisible: false },
        crosshair: { mode: 1 },
      });

      if (mode === "candles") {
        series = chart.addCandlestickSeries({
          upColor: theme === "dark" ? "#22c55e" : "#16a34a",
          borderUpColor: theme === "dark" ? "#22c55e" : "#16a34a",
          wickUpColor: theme === "dark" ? "#22c55e" : "#16a34a",
          downColor: theme === "dark" ? "#ef4444" : "#dc2626",
          borderDownColor: theme === "dark" ? "#ef4444" : "#dc2626",
          wickDownColor: theme === "dark" ? "#ef4444" : "#dc2626",
        });
        series.setData(seriesData || []);
      } else {
        series = chart.addLineSeries({ lineWidth: 2 });
        series.setData(seriesData || []);
      }
    })();

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [containerRef, mode, seriesData, theme]);
}

// -------------------- UI --------------------
function Header({ theme, setTheme }) {
  return (
    <div className="container">
      <div className="row between center">
        <h1 className="brand">Arb Web Bot</h1>
        <div className="row gap">
          <a href={API_BASE} target="_blank" rel="noreferrer" className="muted">
            Источник: {API_BASE || "не задан"}
          </a>
          <button
            className="btn"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Сменить тему"
          >
            {theme === "dark" ? "🌞" : "🌙"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { theme, setTheme } = useTheme();
  const { params, setParams } = useParams();

  const [signals, setSignals] = useState([]);
  const [wsOk, setWsOk] = useState(false);
  const [loading, setLoading] = useState(true);

  const tfMap = { "1m": 60, "5m": 300, "15m": 900, "1h": 3600 };

  // chart data
  const chartRef = useRef(null);

  // фильтруем по символу
  const filtered = useMemo(
    () => signals.filter((s) => s.symbol === params.symbol),
    [signals, params.symbol]
  );

  // линия (по dst_price)
  const lineData = useMemo(() => {
    return [...filtered]
      .slice(-500) // последних N тиков
      .reverse()
      .map((s) => ({
        time: Math.floor(new Date(s.created_at).getTime() / 1000),
        value: Number(s.dst_price) || Number(s.src_price) || 0,
      }));
  }, [filtered]);

  // свечи — агрегируем из сигналов
  const candleData = useMemo(() => {
    const sec = tfMap[params.timeframe] || 60;
    return aggregateToCandles(filtered, sec);
  }, [filtered, params.timeframe]);

  useLightweightChart(
    chartRef,
    params.chartMode,
    params.chartMode === "candles" ? candleData : lineData,
    theme
  );

  // загрузка истории + ws
  useEffect(() => {
    let ws;
    let alive = true;

    (async () => {
      try {
        const data = await fetchJSON(`${API_BASE}/signals`);
        if (alive) {
          setSignals(data.items || []);
          setLoading(false);
        }
      } catch (e) {
        console.warn("REST /signals failed:", e);
        setLoading(false);
      }

      try {
        ws = new WebSocket(`${API_BASE.replace(/^http/, "ws")}/ws`);
        ws.onopen = () => setWsOk(true);
        ws.onclose = () => setWsOk(false);
        ws.onerror = () => setWsOk(false);
        ws.onmessage = (ev) => {
          try {
            const m = JSON.parse(ev.data);
            if (m?.type === "signals" && Array.isArray(m.items)) {
              setSignals(m.items);
            }
          } catch {}
        };
      } catch (e) {
        console.warn("WS failed:", e);
      }
    })();

    return () => {
      alive = false;
      try {
        ws && ws.close();
      } catch {}
    };
  }, []);

  // расчёт нетто-спреда
  const withComputed = useMemo(() => {
    const mk = (n) => (typeof n === "number" && !Number.isNaN(n) ? n : 0);
    return signals.map((s) => {
      const feeSrc = mk(params.feesBps?.[s.src]) || 0;
      const feeDst = mk(params.feesBps?.[s.dst]) || 0;
      const gross = mk(Number(s.spread_bps));
      const net = gross - feeSrc - feeDst;
      const ok = net >= (Number(params.minSpreadBps) || 0);
      const pnl = ok ? (net / 10000) * (Number(params.capital) || 0) : 0;
      return { ...s, net_spread_bps: net, ok, pnl };
    });
  }, [signals, params]);

  // список доступных символов из данных
  const symbols = useMemo(
    () => [...new Set(signals.map((s) => s.symbol))],
    [signals]
  );

  return (
    <div className="page">
      <Header theme={theme} setTheme={setTheme} />

      <div className="container grid">
        <div className="card">
          <h2>Параметры</h2>
          <div className="grid2">
            <label className="lbl">
              Символ
              <select
                value={params.symbol}
                onChange={(e) =>
                  setParams((p) => ({ ...p, symbol: e.target.value }))
                }
              >
                {symbols.length === 0 && (
                  <option value="BTCUSDT">BTCUSDT</option>
                )}
                {symbols.map((sym) => (
                  <option key={sym} value={sym}>
                    {sym}
                  </option>
                ))}
              </select>
            </label>

            <label className="lbl">
              Мин. спред, bps
              <input
                type="number"
                min="0"
                step="0.1"
                value={params.minSpreadBps}
                onChange={(e) =>
                  setParams((p) => ({
                    ...p,
                    minSpreadBps: Number(e.target.value),
                  }))
                }
              />
            </label>

            <label className="lbl">
              Капитал, $
              <input
                type="number"
                min="0"
                step="1"
                value={params.capital}
                onChange={(e) =>
                  setParams((p) => ({
                    ...p,
                    capital: Number(e.target.value),
                  }))
                }
              />
            </label>

            <div className="lbl">
              Комиссии, bps
              <div className="row gap">
                <div className="row gap s">
                  <span className="muted">binance</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={params.feesBps.binance}
                    onChange={(e) =>
                      setParams((p) => ({
                        ...p,
                        feesBps: {
                          ...p.feesBps,
                          binance: Number(e.target.value),
                        },
                      }))
                    }
                    className="w80"
                  />
                </div>
                <div className="row gap s">
                  <span className="muted">bybit</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={params.feesBps.bybit}
                    onChange={(e) =>
                      setParams((p) => ({
                        ...p,
                        feesBps: {
                          ...p.feesBps,
                          bybit: Number(e.target.value),
                        },
                      }))
                    }
                    className="w80"
                  />
                </div>
              </div>
            </div>

            <label className="lbl">
              Вид графика
              <div className="row gap">
                <button
                  className={`btn ${params.chartMode === "line" ? "active" : ""}`}
                  onClick={() =>
                    setParams((p) => ({ ...p, chartMode: "line" }))
                  }
                >
                  Линия
                </button>
                <button
                  className={`btn ${params.chartMode === "candles" ? "active" : ""}`}
                  onClick={() =>
                    setParams((p) => ({ ...p, chartMode: "candles" }))
                  }
                >
                  Свечи
                </button>
              </div>
            </label>

            <label className="lbl">
              Таймфрейм
              <div className="row gap">
                {["1m", "5m", "15m", "1h"].map((tf) => (
                  <button
                    key={tf}
                    className={`btn ${params.timeframe === tf ? "active" : ""}`}
                    onClick={() => setParams((p) => ({ ...p, timeframe: tf }))}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </label>
          </div>

          <div className="muted s">
            WS: {wsOk ? "online ✅" : "offline ⛔️"} · История:{" "}
            {loading ? "загрузка…" : `${signals.length} записей`}
          </div>
        </div>

        <div className="card">
          <h2>
            {params.symbol} · {params.chartMode === "candles" ? "Свечной" : "Линейный"} график{" "}
            <span className="muted">({params.timeframe})</span>
          </h2>
          <div ref={chartRef} style={{ height: 360, width: "100%" }} />
          <div className="muted s" style={{ marginTop: 6 }}>
            Свечи строятся из входящих сигналов (dst_price) с агрегацией по выбранному
            таймфрейму. Это не биржевой OHLC, а «склеенные» тики для наглядности.
          </div>
        </div>
      </div>

      <div className="container">
        <div className="card">
          <SignalTable items={withComputed} minSpreadBps={params.minSpreadBps} />
        </div>
      </div>

      <style>{`
        :root {
          --bg: #ffffff; --text:#111827; --muted:#6b7280; --card:#f5f6f8; --border:#e5e7eb; --accent:#0ea5e9; --ok:#10b981; --bad:#ef4444;
        }
        :root[data-theme="dark"] {
          --bg:#0b0f14; --text:#e5e7eb; --muted:#9ca3af; --card:#0f1620; --border:#1f2937; --accent:#38bdf8; --ok:#22c55e; --bad:#f87171;
        }
        html,body,#root{height:100%}
        body{margin:0;background:var(--bg);color:var(--text);font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;}
        .page{padding-bottom:48px}
        .container{max-width:1200px; margin:0 auto; padding:16px}
        .brand{margin:0;font-size:24px}
        .row{display:flex;align-items:center}
        .between{justify-content:space-between}
        .gap{gap:12px}
        .s{font-size:12px}
        .muted{color:var(--muted)}
        .btn{border:1px solid var(--border); background:var(--card); color:var(--text); padding:8px 10px; border-radius:10px; cursor:pointer}
        .btn:hover{border-color:var(--accent)}
        .btn.active{border-color:var(--accent); box-shadow: 0 0 0 1px var(--accent) inset}
        .card{background:var(--card); border:1px solid var(--border); border-radius:14px; padding:14px; margin-bottom:16px}
        h2{margin:0 0 12px 0; font-size:18px}
        .grid{display:grid; grid-template-columns: 1.05fr 2fr; gap:16px}
        .grid2{display:grid; grid-template-columns: repeat(2, 1fr); gap:12px}
        .lbl{display:flex; flex-direction:column; gap:6px; font-size:14px}
        input, select{background:transparent; color:var(--text); border:1px solid var(--border); padding:8px 10px; border-radius:10px; outline:none}
        input:focus, select:focus{border-color:var(--accent)}
        .w80{width:80px}
        table{width:100%; border-collapse:collapse}
        th, td{padding:10px; border-bottom:1px solid var(--border); font-size:14px}
        thead th{font-size:16px}
        .badge{padding:2px 8px; border-radius:999px; border:1px solid var(--border)}
        .ok{color:var(--ok)}
        .bad{color:var(--bad)}
        .mono{font-variant-numeric: tabular-nums; font-feature-settings: "tnum";}
        .logo{width:18px;height:18px;border-radius:50%;display:inline-block;vertical-align:middle;margin-right:8px;background:#1113}
        @media (max-width: 960px){
          .grid{grid-template-columns: 1fr}
          .grid2{grid-template-columns: 1fr}
        }
      `}</style>
    </div>
  );
}
