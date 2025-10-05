import asyncio
import json
import websockets
from ..config import settings
from ..arb.core import orderbook, check_arbitrage
from ..db import get_session
from contextlib import asynccontextmanager
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
async def run_binance():
symbols = [s.strip().lower() for s in settings.SYMBOLS.split(",") if
s.strip()]
# для Binance формат: "btcusdt@trade" (или @ticker)
streams = "/".join([f"{s}@ticker" for s in symbols])
url = f"wss://stream.binance.com:9443/stream?streams={streams}"
while True:
try:
async with websockets.connect(url, ping_interval=20,
ping_timeout=20) as ws:
async for msg in ws:
data = json.loads(msg)
if "data" not in data:
continue
d = data["data"]
sym = d.get("s")
last = float(d.get("c")) if d.get("c") else None
if sym and last:
orderbook.update("binance", sym, last)
async with session_scope() as sess:
await check_arbitrage(sess, sym)
except Exception:
await asyncio.sleep(3)
