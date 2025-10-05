# Arb Web Bot (MVP)
FastAPI + React, Binance/Bybit WebSocket‑тикеры, расчёт спрэда в bps,
Telegram‑уведомления, SQLite, Docker.
## Быстрый старт
1) `cp backend/.env.example backend/.env` и заполни `TELEGRAM_*`.
2) `cd backend && python -m venv .venv && source .venv/bin/activate && pip
install -r requirements.txt && uvicorn app.main:app --reload`
3) `cd frontend && npm i && npm run dev`
## Деплой
- Front → GitHub Pages (workflow в `.github/workflows/frontend-deploy.yml`).
- Back → Render/Railway/Fly.io (Dockerfile + переменные окружения).
