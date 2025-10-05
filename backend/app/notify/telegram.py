import httpx
from ..config import settings


async def tg_send(text: str):
    token = settings.TELEGRAM_BOT_TOKEN
    chat_id = settings.TELEGRAM_CHAT_ID

    # Проверка на наличие токена и chat_id
    if not token or not chat_id:
        print("⚠️ Telegram: отсутствует TOKEN или CHAT_ID, сообщение не отправлено.")
        return

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(url, json=payload)
    except Exception as e:
        print(f"⚠️ Ошибка отправки в Telegram: {e}")
