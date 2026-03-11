#!/usr/bin/env python3
"""
Обновление кнопки Web App в меню бота
"""
import asyncio
import httpx
import os

BOT_TOKEN = "8435342350:AAHpzv8g1lg42yYM_OpiF1xHlaY8Hk7lpmQ"
WEBAPP_URL = os.environ.get('WEBAPP_URL', 'https://bgmk-obsh.duckdns.org')

async def set_menu_button():
    """Установить кнопку меню бота"""
    async with httpx.AsyncClient() as client:
        url = f"https://api.telegram.org/bot{BOT_TOKEN}/setChatMenuButton"
        
        # Устанавливаем кнопку для всех чатов
        menu_button = {
            "type": "web_app",
            "text": "🗺 Карта общежития",
            "web_app": {"url": WEBAPP_URL}
        }
        
        try:
            response = await client.post(url, json={"menu_button": menu_button}, timeout=10)
            result = response.json()
            
            if result.get('ok'):
                print("✅ Кнопка меню успешно обновлена!")
                print(f"   Текст: {menu_button['text']}")
                print(f"   URL: {menu_button['web_app']['url']}")
            else:
                print(f"❌ Ошибка: {result.get('description')}")
            
            return result
        except Exception as e:
            print(f"❌ Ошибка установки кнопки меню: {e}")
            return None

async def get_menu_button():
    """Получить текущую кнопку меню"""
    async with httpx.AsyncClient() as client:
        url = f"https://api.telegram.org/bot{BOT_TOKEN}/getChatMenuButton"
        
        try:
            response = await client.post(url, timeout=10)
            result = response.json()
            
            if result.get('ok'):
                button = result.get('result', {})
                print("📋 Текущая кнопка меню:")
                if button.get('type') == 'web_app':
                    print(f"   Текст: {button.get('text', 'N/A')}")
                    print(f"   URL: {button.get('web_app', {}).get('url', 'N/A')}")
                else:
                    print(f"   Тип: {button.get('type', 'default')}")
            
            return result
        except Exception as e:
            print(f"❌ Ошибка получения кнопки меню: {e}")
            return None

async def main():
    print("=" * 60)
    print("🔧 ОБНОВЛЕНИЕ КНОПКИ WEB APP В МЕНЮ БОТА")
    print("=" * 60)
    print()
    
    # Показываем текущую кнопку
    print("1️⃣ Проверяем текущую кнопку...")
    await get_menu_button()
    print()
    
    # Обновляем кнопку
    print("2️⃣ Устанавливаем новую кнопку...")
    await set_menu_button()
    print()
    
    print("=" * 60)
    print("✅ ГОТОВО!")
    print("=" * 60)
    print()
    print("💡 ВАЖНО: После обновления пользователям нужно:")
    print("   1. Закрыть бота полностью")
    print("   2. Очистить кэш Telegram")
    print("   3. Открыть бота заново")
    print()

if __name__ == "__main__":
    asyncio.run(main())
