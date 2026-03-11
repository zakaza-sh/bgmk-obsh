#!/usr/bin/env python3
import asyncio
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from uuid import uuid4
import os

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'dormitory_control')

# Тестовая выборка данных (2 этаж, первые 5 блоков)
TEST_DATA = {
    "floors": [
        {
            "floor_number": 2,
            "blocks": [
                {
                    "block_number": 1,
                    "dates": [
                        {"date": "11.11.2025", "small": 4, "large": 4, "common": 5},
                        {"date": "17.11.2025", "small": 4, "large": 5, "common": 4},
                        {"date": "24.11.2025", "small": 4, "large": 4, "common": 4},
                        {"date": "30.11.2025", "small": 5, "large": 4, "common": 4},
                        {"date": "04.12.2025", "small": 5, "large": 4, "common": 5},
                        {"date": "08.12.2025", "small": 3, "large": 5, "common": 3},
                        {"date": "11.12.2025", "small": 3, "large": 5, "common": 4},
                        {"date": "17.12.2025", "small": 5, "large": 4, "common": 3},
                        {"date": "09.01.2026", "small": 3, "large": 5, "common": 4},
                        {"date": "04.02.2026", "small": 2, "large": 4, "common": 5}
                    ]
                },
                {
                    "block_number": 2,
                    "dates": [
                        {"date": "11.11.2025", "small": 5, "large": 3, "common": 4},
                        {"date": "17.11.2025", "small": 3, "large": 3, "common": 3},
                        {"date": "24.11.2025", "small": 5, "large": 4, "common": 4},
                        {"date": "30.11.2025", "small": 4, "large": 4, "common": 4},
                        {"date": "04.12.2025", "small": 5, "large": 4, "common": 3},
                        {"date": "08.12.2025", "small": 5, "large": 4, "common": 5},
                        {"date": "11.12.2025", "small": 4, "large": 5, "common": 4},
                        {"date": "17.12.2025", "small": 3, "large": 5, "common": 3},
                        {"date": "09.01.2026", "small": 2, "large": 4, "common": 5}
                    ]
                }
            ]
        }
    ]
}

async def import_test_data():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    total = 0
    for floor in TEST_DATA['floors']:
        for block in floor['blocks']:
            for date_entry in block['dates']:
                date_obj = datetime.strptime(date_entry['date'], '%d.%m.%Y').replace(hour=12, tzinfo=timezone.utc)
                
                for room_type in ['small', 'large', 'common']:
                    rating = date_entry.get(room_type)
                    if rating is None:
                        continue
                    
                    inspection = {
                        "id": str(uuid4()),
                        "floor": floor['floor_number'],
                        "block": block['block_number'],
                        "room_type": room_type,
                        "rating": rating,
                        "notes": None,
                        "inspector_id": "historical_import",
                        "inspector_name": "Исторический импорт",
                        "inspection_date": date_obj
                    }
                    
                    await db.inspections.insert_one(inspection)
                    total += 1
    
    client.close()
    print(f"✅ Импортировано {total} записей")
    return total

asyncio.run(import_test_data())
