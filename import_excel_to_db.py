#!/usr/bin/env python3
"""
Импорт исторических данных напрямую из PDF URL
"""
import asyncio
import httpx
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from uuid import uuid4
import os
import json

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'dormitory_control')

PDF_URL = "https://customer-assets.emergentagent.com/job_transit-qa/artifacts/m7h4ridm_%D0%9E%D0%B1%D1%89%D0%B0%D1%8F%20%D1%82%D0%B0%D0%B1%D0%BB%D0%B8%D1%86%D0%B0-2.pdf"

# Предварительно извлеченные данные (часть для теста)
SAMPLE_DATA = """
Здесь будут данные из Excel.
Для полного импорта используйте extract_from_pdf()
"""

# Маппинг типов комнат
ROOM_TYPE_MAP = {
    'small_room': 'small',
    'large_room': 'large',
    'common_room': 'common'
}

def parse_date(date_str):
    """Парсинг даты из формата ДД.ММ.ГГГГ"""
    try:
        parts = date_str.split('.')
        day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
        
        # Исправляем опечатки (2024 → 2025)
        if year == 2024:
            year = 2025
        
        return datetime(year, month, day, 12, 0, 0, tzinfo=timezone.utc)
    except Exception as e:
        print(f"❌ Ошибка парсинга даты '{date_str}': {e}")
        return None

async def import_from_json_data(data):
    """Импорт данных в MongoDB"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    total_imported = 0
    skipped = 0
    errors = 0
    
    print("=" * 60)
    print("📊 ИМПОРТ ИСТОРИЧЕСКИХ ДАННЫХ")
    print("=" * 60)
    print()
    
    for floor_data in data['floors']:
        floor_num = floor_data['floor_number']
        print(f"\n🏢 Этаж {floor_num}:")
        
        for block_data in floor_data['blocks']:
            block_num = block_data['block_number']
            
            for date_entry in block_data['dates']:
                inspection_date = parse_date(date_entry['date'])
                
                if not inspection_date:
                    errors += 1
                    continue
                
                # Импортируем оценки для каждого типа комнаты
                for room_key, room_type in ROOM_TYPE_MAP.items():
                    rating = date_entry.get(room_key)
                    
                    # Пропускаем null значения
                    if rating is None:
                        skipped += 1
                        continue
                    
                    # Проверяем, не существует ли уже эта запись
                    existing = await db.inspections.find_one({
                        "floor": floor_num,
                        "block": block_num,
                        "room_type": room_type,
                        "inspection_date": inspection_date
                    })
                    
                    if existing:
                        skipped += 1
                        continue
                    
                    # Создаем новую запись
                    inspection = {
                        "id": str(uuid4()),
                        "floor": floor_num,
                        "block": block_num,
                        "room_type": room_type,
                        "rating": rating,
                        "notes": None,
                        "inspector_id": "historical_import",
                        "inspector_name": "Исторический импорт",
                        "inspection_date": inspection_date
                    }
                    
                    try:
                        await db.inspections.insert_one(inspection)
                        total_imported += 1
                        
                        if total_imported % 100 == 0:
                            print(f"  ✅ Импортировано: {total_imported}")
                    except Exception as e:
                        print(f"  ❌ Ошибка: {e}")
                        errors += 1
        
        print(f"  ✅ Этаж {floor_num} завершён")
    
    client.close()
    
    print()
    print("=" * 60)
    print("📊 РЕЗУЛЬТАТЫ ИМПОРТА:")
    print(f"  ✅ Импортировано: {total_imported}")
    print(f"  ⏭️  Пропущено: {skipped}")
    print(f"  ❌ Ошибок: {errors}")
    print("=" * 60)
    
    return total_imported

async def download_and_parse_pdf():
    """Скачать PDF и извлечь данные (требует дополнительные библиотеки)"""
    print("💡 Для извлечения данных из PDF используйте:")
    print("   pip install pdfplumber")
    print()
    print("Или используйте предоставленный JSON файл")
    return None

async def main():
    print("\n🚀 ИМПОРТ ИСТОРИЧЕСКИХ ДАННЫХ ИЗ EXCEL")
    print()
    
    # Путь к JSON файлу с данными
    json_file = '/app/historical_data_full.json'
    
    if os.path.exists(json_file):
        print(f"📂 Загружаю данные из {json_file}...")
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f"✅ Данных загружено: {len(data.get('floors', []))} этажей\n")
        
        confirm = input("Начать импорт? (y/n): ")
        if confirm.lower() == 'y':
            await import_from_json_data(data)
        else:
            print("❌ Импорт отменён")
    else:
        print(f"❌ Файл {json_file} не найден")
        print("\n💡 Создайте файл с данными сначала")

if __name__ == "__main__":
    asyncio.run(main())
