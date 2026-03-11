#!/usr/bin/env python3
"""
Сбор всех chat_id из истории бота и отправка сообщения
"""
import asyncio
import httpx
from motor.motor_asyncio import AsyncIOMotorClient
import os

BOT_TOKEN = "8435342350:AAHpzv8g1lg42yYM_OpiF1xHlaY8Hk7lpmQ"
WEBAPP_URL = os.environ.get('WEBAPP_URL', 'https://bgmk-obsh.duckdns.org')
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'dormitory_control')

async def get_updates_and_save_chat_ids():
    """Получить все обновления от бота и сохранить chat_id"""
    async with httpx.AsyncClient() as client:
        url = f"https://api.telegram.org/bot{BOT_TOKEN}/getUpdates"
        
        try:
            # Получаем последние 100 обновлений
            response = await client.post(
                url, 
                json={"limit": 100, "offset": -100},
                timeout=30
            )
            result = response.json()
            
            if not result.get('ok'):
                print(f"❌ Ошибка получения обновлений: {result.get('description')}")
                return set()
            
            updates = result.get('result', [])
            print(f"📥 Получено обновлений: {len(updates)}")
            
            chat_ids = set()
            
            # Извлекаем chat_id из всех обновлений
            for update in updates:
                # Из обычных сообщений
                if 'message' in update:
                    chat_id = update['message'].get('chat', {}).get('id')
                    if chat_id:
                        chat_ids.add(chat_id)
                
                # Из callback запросов
                if 'callback_query' in update:
                    chat_id = update['callback_query'].get('message', {}).get('chat', {}).get('id')
                    if chat_id:
                        chat_ids.add(chat_id)
            
            print(f"✅ Найдено уникальных chat_id: {len(chat_ids)}")
            
            # Сохраняем в MongoDB
            if chat_ids:
                mongo_client = AsyncIOMotorClient(MONGO_URL)
                db = mongo_client[DB_NAME]
                
                from datetime import datetime, timezone
                for chat_id in chat_ids:
                    await db.telegram_users.update_one(
                        {"chat_id": chat_id},
                        {
                            "$set": {
                                "chat_id": chat_id,
                                "discovered_at": datetime.now(timezone.utc).isoformat()
                            }
                        },
                        upsert=True
                    )
                
                mongo_client.close()
                print(f"💾 Сохранено в БД: {len(chat_ids)} пользователей")
            
            return chat_ids
            
        except Exception as e:
            print(f"❌ Ошибка: {e}")
            return set()

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
            return {"ok": False, "error": str(e)}

async def get_all_chat_ids_from_db():
    """Получить все chat_id из базы данных"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    users = await db.telegram_users.find({}, {"_id": 0, "chat_id": 1}).to_list(10000)
    chat_ids = [user['chat_id'] for user in users if 'chat_id' in user]
    
    client.close()
    return chat_ids

async def broadcast_update_message():
    """Отправить сообщение об обновлении всем пользователям"""
    message_text = (
        "⚡️ <b>ВАЖНО! БОТ ОБНОВЛЁН</b>\n\n"
        "Обновлена карта общежития с новым дизайном и исправлениями.\n\n"
        "🔄 <b>Чтобы увидеть новую версию:</b>\n"
        "1. Закройте этот чат с ботом\n"
        "2. Очистите кэш Telegram:\n"
        "   Настройки → Данные и память → Очистить кэш\n"
        "3. Откройте бота заново\n\n"
        "Теперь кнопка <b>\"🗺 Карта общежития\"</b> (возле поля ввода) откроет новую версию!\n\n"
        "Или нажмите кнопку ниже:"
    )
    
    reply_markup = {
        "inline_keyboard": [[
            {"text": "🗺 Открыть карту общежития", "web_app": {"url": WEBAPP_URL}}
        ]]
    }
    
    chat_ids = await get_all_chat_ids_from_db()
    
    if not chat_ids:
        print("⚠️  Нет пользователей в БД")
        return
    
    print(f"📤 Отправка сообщений {len(chat_ids)} пользователям...\n")
    
    success_count = 0
    failed_count = 0
    blocked_count = 0
    
    for i, chat_id in enumerate(chat_ids, 1):
        result = await send_message(chat_id, message_text, reply_markup)
        
        if result.get('ok'):
            success_count += 1
            print(f"  [{i}/{len(chat_ids)}] ✅ Чат {chat_id}")
        else:
            failed_count += 1
            error_desc = result.get('description', result.get('error', 'Unknown'))
            
            # Проверяем причину ошибки
            if 'blocked' in error_desc.lower() or 'bot was blocked' in error_desc.lower():
                blocked_count += 1
                print(f"  [{i}/{len(chat_ids)}] 🚫 Чат {chat_id}: Заблокирован")
            elif 'chat not found' in error_desc.lower():
                print(f"  [{i}/{len(chat_ids)}] ⚠️  Чат {chat_id}: Не найден")
            else:
                print(f"  [{i}/{len(chat_ids)}] ❌ Чат {chat_id}: {error_desc}")
        
        # Задержка (30 сообщений в секунду макс)
        await asyncio.sleep(0.05)
    
    print(f"\n{'='*60}")
    print(f"📊 РЕЗУЛЬТАТЫ РАССЫЛКИ:")
    print(f"  ✅ Успешно доставлено: {success_count}")
    print(f"  🚫 Заблокировали бота: {blocked_count}")
    print(f"  ❌ Другие ошибки: {failed_count - blocked_count}")
    print(f"  📨 Всего попыток: {len(chat_ids)}")
    print(f"  📈 Успешность: {success_count/len(chat_ids)*100:.1f}%")
    print(f"{'='*60}")

async def main():
    print("=" * 60)
    print("📢 МАССОВАЯ РАССЫЛКА ОБНОВЛЕНИЯ БОТА")
    print("=" * 60)
    print()
    
    # Шаг 1: Собираем chat_id из истории
    print("1️⃣ Сбор chat_id из истории бота...")
    await get_updates_and_save_chat_ids()
    print()
    
    # Шаг 2: Отправляем сообщение всем
    print("2️⃣ Отправка сообщений всем пользователям...")
    await broadcast_update_message()
    print()
    
    print("✅ ГОТОВО!")

if __name__ == "__main__":
    asyncio.run(main())
