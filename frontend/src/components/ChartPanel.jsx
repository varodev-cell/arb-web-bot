import { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";

// props: { seriesMap } где ключ = биржа, значение = массив {time, value}
export default function ChartPanel({ seriesMap, symbol="BTCUSDT" }) {
  const wrapRef = useRef();
  const chartRef = useRef();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    chartRef.current?.remove();
    const chart = createChart(el, {
      layout: { background: { color: getComputedStyle(document.body).getPropertyValue('--panel') }, textColor: getComputedStyle(document.body).getPropertyValue('--text') },
      grid: { vertLines:{ color:'rgba(128,128,128,.1)'}, horzLines:{ color:'rgba(128,128,128,.1)'} },
      height: 300,
      timeScale: { rightOffset: 2, barSpacing: 6 }
    });
    chartRef.current = chart;

    // цвет каждой биржи своя серия
    Object.entries(seriesMap).forEach(([exch, points], i) => {
      const s = chart.addLineSeries({ lineWidth: 2 });
      s.setData(points);
    });

    return () => chart.remove();
  }, [seriesMap, symbol]);

  return (
    <div className="card" style={{padding:12}}>
      <div style={{display:'flex', justifyContent:'space-between', marginBottom:8}}>
        <div style={{fontWeight:700}}>{symbol} — Realtime</div>
      </div>
      <div ref={wrapRef}/>
    </div>
  );
}
