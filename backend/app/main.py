import asyncio
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.websockets import WebSocket
from sqlalchemy.ext.asyncio import AsyncSession
from .config import settings
from .db import Base, engine, get_session
from .models import Signal
from .ws.binance import run_binance
from .ws.bybit import run_bybit
app = FastAPI(title="Arb Web Bot")
app.add_middleware(
  CORSMiddleware,
  allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",")],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)
@app.on_event("startup")
async def startup():
  async with engine.begin() as conn:
    await conn.run_sync(Base.metadata.create_all)
    # Запускаем фоновые коннекторы
asyncio.create_task(run_binance())
asyncio.create_task(run_bybit())
@app.get("/health")
async def health():
  return {"ok": True}
  @app.get("/signals")
  async def list_signals(limit: int = 100, session: AsyncSession =
                         Depends(get_session)):
                           res = await session.execute(
                             "SELECT id, symbol, src, dst, src_price, dst_price, spread_bps,
                             created_at FROM signals ORDER BY id DESC LIMIT :lim",
                             {"lim": limit},
                             )
                             rows = [dict(r._mapping) for r in res]
                             return {"items": rows}
                             @app.websocket("/ws")
                             async def websocket_endpoint(ws: WebSocket):
                             await ws.accept()
                             # Простой пуш каждые 2 сек: последние 50 сигналов
                             try:
                             while True:
                             await asyncio.sleep(2)
                             # raw SQL для простоты
                             async with get_session() as session:
                             res = await session.execute(
                             "SELECT id, symbol, src, dst, src_price, dst_price,
                             spread_bps, created_at FROM signals ORDER BY id DESC LIMIT 50"
                             )
                             rows = [dict(r._mapping) for r in res]
                             await ws.send_json({"type": "signals", "items": rows})
                             except Exception:
                             pass
