from dataclasses import dataclass
from typing import Dict, Optional
from ..config import settings
from ..notify.telegram import tg_send
from ..models import Signal
from sqlalchemy.ext.asyncio import AsyncSession
@dataclass
class Quote:
  price: float
class OrderBook:
def __init__(self):
self.data: Dict[str, Dict[str, Quote]] = {"binance": {}, "bybit": {}}
def update(self, exchange: str, symbol: str, price: float):
self.data.setdefault(exchange, {})[symbol] = Quote(price=price)
def get(self, exchange: str, symbol: str) -> Optional[Quote]:
return self.data.get(exchange, {}).get(symbol)
orderbook = OrderBook()
async def check_arbitrage(session: AsyncSession, symbol: str):
b = orderbook.get("binance", symbol)
y = orderbook.get("bybit", symbol)
if not b or not y:
return
# два направления: купить дешевле, продать дороже
candidates = [
("binance", b.price, "bybit", y.price),
("bybit", y.price, "binance", b.price),
]
for src, src_p, dst, dst_p in candidates:
if src_p <= 0 or dst_p <= 0:
continue
spread = (dst_p - src_p) / src_p * 10000 # в bps
if spread >= settings.MIN_SPREAD_BPS:
text = (
f"<b>{symbol}</b>\n"
f"{src} → {dst}\n"
f"{src_p:.4f} → {dst_p:.4f} | <b>{spread:.1f} bps</b>"
)
await tg_send(text)
# Сохраняем в БД
s = Signal(symbol=symbol, src=src, dst=dst, src_price=src_p,
dst_price=dst_p, spread_bps=spread)
session.add(s)
await session.commit()
# Обрезаем хвост по MAX_SIGNALS
await session.execute(
"DELETE FROM signals WHERE id NOT IN (SELECT id FROM signals
ORDER BY id DESC LIMIT :lim)",
{"lim": settings.MAX_SIGNALS},
)
await session.commit()
return # один сигнал за вызов достаточно
