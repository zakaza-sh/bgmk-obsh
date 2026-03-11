#!/usr/bin/env python3
"""
Скрипт для сброса всех чатов бота и отправки нового приветственного сообщения
"""
import os
import asyncio
import httpx
from motor.motor_asyncio import AsyncIOMotorClient

# Токен бота
BOT_TOKEN = "8435342350:AAHpzv8g1lg42yYM_OpiF1xHlaY8Hk7lpmQ"
WEBAPP_URL = os.environ.get('WEBAPP_URL', 'https://bgmk-obsh.duckdns.org')

# MongoDB подключение
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
            print(f"Ошибка отправки в чат {chat_id}: {e}")
            return None

async def delete_my_commands():
    """Удалить все команды бота (сброс меню)"""
    async with httpx.AsyncClient() as client:
        url = f"https://api.telegram.org/bot{BOT_TOKEN}/deleteMyCommands"
        try:
            response = await client.post(url, timeout=10)
            result = response.json()
            if result.get('ok'):
                print("✅ Команды бота сброшены")
            return result
        except Exception as e:
            print(f"Ошибка сброса команд: {e}")
            return None

async def set_bot_commands():
    """Установить команды бота"""
    async with httpx.AsyncClient() as client:
        url = f"https://api.telegram.org/bot{BOT_TOKEN}/setMyCommands"
        commands = [
            {"command": "start", "description": "🏠 Открыть карту общежития"},
            {"command": "help", "description": "📖 Справка по командам"},
            {"command": "status", "description": "📊 Статистика проверок"}
        ]
        try:
            response = await client.post(url, json={"commands": commands}, timeout=10)
            result = response.json()
            if result.get('ok'):
                print("✅ Команды бота установлены")
            return result
        except Exception as e:
            print(f"Ошибка установки команд: {e}")
            return None

async def get_all_chat_ids():
    """Получить все chat_id из базы данных (из логов входов)"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    chat_ids = set()
    
    # Попробуем найти чаты из разных источников
    # 1. Из коллекции пользователей (если есть telegram_chat_id)
    users = await db.users.find({}, {"_id": 0, "telegram_chat_id": 1}).to_list(1000)
    for user in users:
        if 'telegram_chat_id' in user:
            chat_ids.add(user['telegram_chat_id'])
    
    # 2. Можно добавить другие источники, если есть
    
    client.close()
    return list(chat_ids)

async def broadcast_new_message():
    """Отправить новое приветственное сообщение всем пользователям"""
    message_text = (
        "<b>🏠 Карта общежития БГМК</b>\n\n"
        "Данный бот создан для проверки санитарного состояния блоков на территории общежития БГМК.\n\n"
        "<b>📊 Здесь вы можете:</b>\n"
        "• Просмотреть оценки всех блоков\n"
        "• Найти информацию о проживающих\n"
        "• Отслеживать проблемные блоки\n\n"
        "По всем вопросам обращайтесь: @fighull\n\n"
        "👇 Нажмите кнопку ниже, чтобы открыть карту:"
    )
    
    reply_markup = {
        "inline_keyboard": [[
            {"text": "🗺 Открыть карту общежития", "web_app": {"url": WEBAPP_URL}}
        ]]
    }
    
    chat_ids = await get_all_chat_ids()
    
    if not chat_ids:
        print("⚠️  Не найдено chat_id в базе данных")
        print("💡 Пользователи увидят новое сообщение при следующем использовании команды /start")
        return
    
    print(f"📤 Отправка сообщений {len(chat_ids)} пользователям...")
    
    success_count = 0
    failed_count = 0
    
    for chat_id in chat_ids:
        result = await send_message(chat_id, message_text, reply_markup)
        if result and result.get('ok'):
            success_count += 1
            print(f"  ✅ Отправлено в чат {chat_id}")
        else:
            failed_count += 1
            print(f"  ❌ Не удалось отправить в чат {chat_id}")
        
        # Небольшая задержка, чтобы не превысить лимиты API
        await asyncio.sleep(0.1)
    
    print(f"\n📊 Результаты:")
    print(f"  ✅ Успешно: {success_count}")
    print(f"  ❌ Неудачно: {failed_count}")

async def main():
    print("=" * 60)
    print("🔄 СБРОС TELEGRAM БОТА")
    print("=" * 60)
    
    # 1. Сбросить команды бота
    print("\n1️⃣ Сброс команд бота...")
    await delete_my_commands()
    
    # 2. Установить новые команды
    print("\n2️⃣ Установка новых команд...")
    await set_bot_commands()
    
    # 3. Отправить новое сообщение всем пользователям
    print("\n3️⃣ Отправка нового приветственного сообщения...")
    await broadcast_new_message()
    
    print("\n" + "=" * 60)
    print("✅ ГОТОВО!")
    print("=" * 60)
    print("\n💡 Все пользователи получат новое сообщение при следующем /start")

if __name__ == "__main__":
    asyncio.run(main())
