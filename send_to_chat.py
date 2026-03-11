#!/usr/bin/env python3
"""
Отправка сообщения через webhook
"""
import asyncio
import httpx
import os

BOT_TOKEN = "8435342350:AAHpzv8g1lg42yYM_OpiF1xHlaY8Hk7lpmQ"
WEBAPP_URL = "https://bgmk-obsh.duckdns.org"

async def send_message_to_user(chat_id: int):
    """Отправить сообщение конкретному пользователю"""
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
    
    async with httpx.AsyncClient() as client:
        url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
        data = {
            "chat_id": chat_id,
            "text": message_text,
            "parse_mode": "HTML",
            "reply_markup": reply_markup
        }
        
        try:
            response = await client.post(url, json=data, timeout=10)
            result = response.json()
            
            if result.get('ok'):
                print(f"✅ Сообщение отправлено в чат {chat_id}")
            else:
                print(f"❌ Ошибка: {result.get('description')}")
            
            return result
        except Exception as e:
            print(f"❌ Ошибка отправки: {e}")
            return None

async def main():
    print("=" * 60)
    print("📤 ОТПРАВКА СООБЩЕНИЯ")
    print("=" * 60)
    print()
    
    # Замените на ваш chat_id
    # Чтобы узнать свой chat_id, отправьте /start боту
    # и посмотрите в логах или используйте @userinfobot
    
    print("💡 Чтобы отправить сообщение, введите chat_id:")
    print("   Отправьте боту любое сообщение, затем проверьте логи:")
    print("   docker logs sanitary-backend --tail 20 | grep 'chat_id'")
    print()
    
    # Пример: await send_message_to_user(123456789)
    
    print("Скрипт готов к использованию!")
    print("Раскомментируйте строку выше и укажите chat_id")

if __name__ == "__main__":
    asyncio.run(main())
