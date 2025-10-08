import { useEffect, useRef, useState } from "react";

export function useWS(url) {
  const wsRef = useRef(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    wsRef.current = new WebSocket(url);
    wsRef.current.onmessage = (e) => {
      try { setData(JSON.parse(e.data)); } catch {}
    };
    wsRef.current.onclose = () => setTimeout(() => location.reload(), 3000);
    return () => wsRef.current && wsRef.current.close();
  }, [url]);

  return data;
}
