import os
from pydantic import BaseSettings
class Settings(BaseSettings):
  BINANCE_WS: str = "wss://stream.binance.com:9443/ws"
  BYBIT_WS: str = "wss://stream.bybit.com/v5/public/spot"
  SYMBOLS: str = "BTCUSDT,ETHUSDT" MIN_SPREAD_BPS: float = 5.0 # общий список символов для трекинга
  # порог в базисных пунктах (0.01% = 1
bps)
MAX_SIGNALS: int = 200
# сколько последних сигналов держать в БД
TELEGRAM_BOT_TOKEN: str = ""
TELEGRAM_CHAT_ID: str = "" # твой личный chat_id для MVP
DATABASE_URL: str = "sqlite+aiosqlite:///./signals.db"
CORS_ORIGINS: str = "*"
class Config:
  env_file = ".env"
  settings = Settings()
