import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # WebSocket адреса
    BINANCE_WS: str = "wss://stream.binance.com:9443/ws"
    BYBIT_WS: str = "wss://stream.bybit.com/v5/public/spot"

    # Общий список символов для трекинга
    SYMBOLS: str = "BTCUSDT,ETHUSDT"

    # Порог в базисных пунктах (0.01% = 1 bps)
    MIN_SPREAD_BPS: float = 5.0

    # Сколько последних сигналов держать в БД
    MAX_SIGNALS: int = 200

    # Настройки Telegram (заполняются из переменных окружения)
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    TELEGRAM_CHAT_ID: str = os.getenv("TELEGRAM_CHAT_ID", "")

    # База данных
    DATABASE_URL: str = "sqlite+aiosqlite:///./signals.db"

    # CORS для фронтенда
    CORS_ORIGINS: str = "*"

    class Config:
        env_file = ".env"

settings = Settings()
