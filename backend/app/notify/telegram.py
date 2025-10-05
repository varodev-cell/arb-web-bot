import httpx
from ..config import settings
async def tg_send(text: str):
  token = settings.TELEGRAM_BOT_TOKEN
  chat_id = settings.TELEGRAM_CHAT_ID
  if not token or not chat_id:
    return
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {"chat_id": chat_id, "text": text, "parse_mode": "HTML",
               "disable_web_page_preview": True}
    async with httpx.AsyncClient(timeout=10) as client:
      try:
        await client.post(url, json=payload)
      except Exception
