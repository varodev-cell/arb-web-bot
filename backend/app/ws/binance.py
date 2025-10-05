import asyncio
import json
import websockets

from ..config import settings
from ..arb.core import orderbook, check_arbitrage
from ..db import get_session
from contextlib import asynccontextmanager


@asynccontextmanager
async def session_scope():
    """Обёртка вокруг get_session() (async-generator) в виде async context manager."""
    gen = get_session()
    session = await gen.__anext__()
    try:
        yield session
    finally:
        try:
            await gen.aclose()
        except Exception:
            pass


async def run_binance():
    # для подписки бинанса поток требует lower-case в streams
    symbols = [s.strip().lower() for s in settings.SYMBOLS.split(",") if s.strip()]
    streams = "/".join(f"{s}@ticker" for s in symbols)
    url = f"wss://stream.binance.com:9443/stream?streams={streams}"

    while True:
        try:
            async with websockets.connect(url, ping_interval=20, ping_timeout=20) as ws:
                # пример подписки выше уже в query, просто читаем сообщения
                async for raw in ws:
                    data = json.loads(raw)

                    d = data.get("data") or {}
                    sym = d.get("s")             # у бинанса тут UPPERCASE, напр. BTCUSDT
                    last_s = d.get("c")          # lastPrice для @ticker
                    if not sym or last_s is None:
                        continue

                    try:
                        last = float(last_s)
                    except Exception:
                        continue

                    # обновляем локальный "ордербук"/квоту
                    orderbook.update("binance", sym, last)

                    # запускаем проверку арбитража (пишет в БД и шлёт нотификации)
                    async with session_scope() as sess:
                        await check_arbitrage(sess, sym)

        except Exception:
            # сеть/таймаут/разрыв — подождём и переподключимся
            await asyncio.sleep(3)
