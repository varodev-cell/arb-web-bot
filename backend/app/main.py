import asyncio
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.websockets import WebSocket
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text  # ← ВАЖНО

from .config import settings
from .db import Base, engine, get_session
from .ws.binance import run_binance
from .ws.bybit import run_bybit

app = FastAPI(title="Arb Web Bot")

# CORS (читаем из переменной окружения CORS_ORIGINS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    # создаём таблицы при старте
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # фоново запускаем слушателей
    asyncio.create_task(run_binance())
    asyncio.create_task(run_bybit())

@app.get("/health")
async def health():
    return {"ok": True}

@app.get("/signals")
async def list_signals(
    limit: int = 100,
    session: AsyncSession = Depends(get_session),
):
    sql = text(
        """
        SELECT id, symbol, src, dst, src_price, dst_price, spread_bps, created_at
        FROM signals
        ORDER BY id DESC
        LIMIT :lim
        """
    )
    res = await session.execute(sql, {"lim": limit})
    rows = [dict(r._mapping) for r in res]
    return {"items": rows}

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            await asyncio.sleep(2)
            async with get_session() as session:
                sql = text(
                    """
                    SELECT id, symbol, src, dst, src_price, dst_price, spread_bps, created_at
                    FROM signals
                    ORDER BY id DESC
                    LIMIT 50
                    """
                )
                res = await session.execute(sql)
                rows = [dict(r._mapping) for r in res]
            await ws.send_json({"type": "signals", "items": rows})
    except Exception:
        # можно добавить логирование
        pass
