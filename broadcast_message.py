#!/usr/bin/env python3
"""
Скрипт для отправки сообщения всем пользователям бота
"""
import asyncio
import httpx
from motor.motor_asyncio import AsyncIOMotorClient
import os

BOT_TOKEN = "8435342350:AAHpzv8g1lg42yYM_OpiF1xHlaY8Hk7lpmQ"
WEBAPP_URL = os.environ.get('WEBAPP_URL', 'https://bgmk-obsh.duckdns.org')
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'dormitory_control')

async def send_message(chat_id: int, text: str, reply_markup=None):
    """Отправить сообщение в чат"""
    async with httpx.AsyncClient() as client:
        url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
        data = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML"
        }
        if reply_markup:
            data["reply_markup"] = reply_markup
        
        try:
            response = await client.post(url, json=data, timeout=10)
            return response.json()
        except Exception as e:
            print(f"❌ Ошибка отправки в чат {chat_id}: {e}")
            return None

async def get_all_chat_ids():
    """Получить все chat_id из базы данных"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    users = await db.telegram_users.find({}, {"_id": 0, "chat_id": 1}).to_list(10000)
    chat_ids = [user['chat_id'] for user in users if 'chat_id' in user]
    
    client.close()
    return chat_ids

async def broadcast_message():
    """Отправить сообщение всем пользователям"""
    message_text = (
        "⚡️ <b>БОТ ОБНОВЛЁН!</b>\n\n"
        "Теперь доступен новый интерфейс с улучшенным дизайном.\n\n"
        "🔄 Для лучшего опыта рекомендуем:\n"
        "1. Удалить этот чат с ботом\n"
        "2. Найти бота заново через поиск\n"
        "3. Нажать /start\n\n"
        "Или просто нажмите кнопку ниже, чтобы открыть карту:"
    )
    
    reply_markup = {
        "inline_keyboard": [[
            {"text": "🗺 Открыть карту общежития", "web_app": {"url": WEBAPP_URL}}
        ]]
    }
    
    chat_ids = await get_all_chat_ids()
    
    if not chat_ids:
        print("⚠️  Нет пользователей для рассылки")
        print("💡 Попросите пользователей отправить /start боту один раз")
        return
    
    print(f"📤 Отправка сообщений {len(chat_ids)} пользователям...\n")
    
    success_count = 0
    failed_count = 0
    
    for i, chat_id in enumerate(chat_ids, 1):
        result = await send_message(chat_id, message_text, reply_markup)
        if result and result.get('ok'):
            success_count += 1
            print(f"  [{i}/{len(chat_ids)}] ✅ Отправлено в чат {chat_id}")
        else:
            failed_count += 1
            error = result.get('description', 'Unknown error') if result else 'No response'
            print(f"  [{i}/{len(chat_ids)}] ❌ Чат {chat_id}: {error}")
        
        # Задержка, чтобы не превысить лимиты API (30 сообщений в секунду)
        await asyncio.sleep(0.05)
    
    print(f"\n{'='*60}")
    print(f"📊 РЕЗУЛЬТАТЫ РАССЫЛКИ:")
    print(f"  ✅ Успешно доставлено: {success_count}")
    print(f"  ❌ Не доставлено: {failed_count}")
    print(f"  📨 Всего попыток: {len(chat_ids)}")
    print(f"{'='*60}")

async def main():
    print("=" * 60)
    print("📢 РАССЫЛКА СООБЩЕНИЯ ВСЕМ ПОЛЬЗОВАТЕЛЯМ")
    print("=" * 60)
    print()
    
    await broadcast_message()
    
    print("\n✅ ГОТОВО!")

if __name__ == "__main__":
    asyncio.run(main())
