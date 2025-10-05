import asyncio
import json
import websockets
from contextlib import asynccontextmanager
from ..config import settings
from ..arb.core import orderbook, check_arbitrage
from ..db import get_session


@asynccontextmanager
async def session_scope():
    gen = get_session()
    session = await gen.__anext__()
    try:
        yield session
    finally:
        try:
            await gen.aclose()
        except Exception:
            pass


async def run_bybit():
    symbols = [s.strip().upper() for s in settings.SYMBOLS.split(",") if s.strip()]
    url = "wss://stream.bybit.com/v5/public/spot"

    while True:
        try:
            async with websockets.connect(url, ping_interval=20, ping_timeout=20) as ws:
                # Подписка на тикеры
                sub_msg = {
                    "op": "subscribe",
                    "args": [f"tickers.{s}" for s in symbols],
                }
                await ws.send(json.dumps(sub_msg))

                async for msg in ws:
                    data = json.loads(msg)
                    topic = data.get("topic")
                    if not topic or "tickers." not in topic:
                        continue

                    d = data.get("data", {})
                    sym = topic.split(".")[1]
                    last = float(d.get("lastPrice", 0))
                    if not last:
                        continue

                    orderbook.update("bybit", sym, last)

                    async with session_scope() as sess:
                        await check_arbitrage(sess, sym)

        except Exception:
            await asyncio.sleep(3)
