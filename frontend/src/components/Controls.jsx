export default function Controls({ state, setState, meta }) {
  const { capital, minBps, minNetBps, symbol } = state;

  return (
    <div className="card" style={{padding:12, display:'grid', gap:10}}>
      <div style={{fontWeight:700}}>Параметры арбитража</div>
      <label>Капитал, $:
        <input type="number" value={capital} onChange={e=>setState(s=>({...s, capital:+e.target.value}))}/>
      </label>
      <label>Мин. спред (bps):
        <input type="number" value={minBps} onChange={e=>setState(s=>({...s, minBps:+e.target.value}))}/>
      </label>
      <label>Мин. net bps (после комиссий):
        <input type="number" value={minNetBps} onChange={e=>setState(s=>({...s, minNetBps:+e.target.value}))}/>
      </label>
      <label>Тикер:
        <select value={symbol} onChange={e=>setState(s=>({...s, symbol:e.target.value}))}>
          {(meta?.symbols||[]).map(s=> <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
    </div>
  );
}
