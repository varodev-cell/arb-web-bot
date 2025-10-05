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
async def run_bybit():
  symbols = [s.strip().upper() for s in settings.SYMBOLS.split(",") if
           s.strip()]
url = settings.BYBIT_WS
topic = {"op": "subscribe", "args": [f"tickers.{s}" for s in symbols]}
while True:
  try:
  async with websockets.connect(url, ping_interval=20,
                              ping_timeout=20) as ws:
  await ws.send(json.dumps(topic))
async for msg in ws:
  data = json.loads(msg)
if data.get("topic",
            "").startswith("tickers.") and
data.get("type") == "snapshot":
  for item in data.get("data", []):
  sym = item.get("symbol")
last = float(item.get("lastPrice")) if
item.get("lastPrice") else None
if sym and last:
  orderbook.update("bybit", sym, last)
async with session_scope() as sess:
  await check_arbitrage(sess, sym)
except Exception:
await asyncio.sleep(3)
