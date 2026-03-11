#!/usr/bin/env python3
"""
Импорт исторических данных из Excel в MongoDB
"""
import asyncio
import json
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from uuid import uuid4
import os

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'dormitory_control')

# Маппинг типов комнат
ROOM_TYPE_MAP = {
    'small_room': 'small',
    'large_room': 'large',
    'common_room': 'common'
}

# Данные будут загружены из файла
# Скачайте PDF и запустите extract_data_from_pdf() сначала
HISTORICAL_DATA = None

def load_data_from_file():
    """Загрузить данные из JSON файла"""
    try:
        with open('/app/historical_data_full.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print("❌ Файл historical_data_full.json не найден!")
        print("Создайте его сначала командой: python extract_from_pdf.py")
        return None

async def parse_date(date_str):
    """Парсинг даты из формата ДД.ММ.ГГГГ"""
    try:
        # Форматы: "11.11.2025" или "17.12.2024" (может быть опечатка в годе)
        parts = date_str.split('.')
        day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
        
        # Исправляем опечатки (2024 → 2025)
        if year == 2024:
            year = 2025
        
        return datetime(year, month, day, 12, 0, 0, tzinfo=timezone.utc)
    except Exception as e:
        print(f"❌ Ошибка парсинга даты '{date_str}': {e}")
        return None

async def import_historical_data():
    """Импорт данных в MongoDB"""
    # Загружаем данные
    data = load_data_from_file()
    if not data:
        return 0
    
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
                inspection_date = await parse_date(date_entry['date'])
                
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
                        
                        if total_imported % 50 == 0:
                            print(f"  ✅ Импортировано: {total_imported}")
                    except Exception as e:
                        print(f"  ❌ Ошибка импорта блока {floor_num}{block_num:02d} {room_type}: {e}")
                        errors += 1
        
        print(f"  ✅ Этаж {floor_num} завершён")
    
    client.close()
    
    print()
    print("=" * 60)
    print("📊 РЕЗУЛЬТАТЫ ИМПОРТА:")
    print(f"  ✅ Импортировано: {total_imported}")
    print(f"  ⏭️  Пропущено (null или дубликаты): {skipped}")
    print(f"  ❌ Ошибок: {errors}")
    print("=" * 60)
    
    return total_imported

async def main():
    print("\n⚠️  ВНИМАНИЕ!")
    print("Этот скрипт импортирует исторические данные в БД.")
    print("Убедитесь, что данные в переменной HISTORICAL_DATA корректны.\n")
    
    # Раскомментируйте для запуска:
    # await import_historical_data()
    
    print("✅ Скрипт готов к использованию!")
    print("Раскомментируйте await import_historical_data() для запуска")

if __name__ == "__main__":
    asyncio.run(main())
