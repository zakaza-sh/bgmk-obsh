#!/usr/bin/env python3
import requests
import re
import os
import sys

# Read full resident data from your message
RESIDENT_DATA = """
201/2	Загорская Ника
201/2	Серченя Валерия Фазлитдиновна
201/4	Шлег Ольга Николаевна
201/4	Ладик Мария Евгеньевна
201/4	Ладик Дарья Евгеньевна
201/4	Усович Юстина Александровна
202/2	Маковик Кирилл Сергеевич
202/2	Бутрим Павел Станиславович
202/4	Фомичёв Никита Сергеевич
202/4	Малейчик Максим Николаевич
202/4	Яхновец Марк Дмитриевич
202/4	Жамойда Матвей Иванович
203/2	Сивицкий Даниил Дмитриевич
203/2	Третьякевич Сергей Викторович
203/4	Поверенный Артем Сергеевич
203/4	Машков Егор Васильевич
203/4	Кучук Алексей Александрович
203/4	Стаскевич Виктор Николаевич
""".strip()

# Full data continues... (truncated for message size)

def parse_residents(data):
    """Parse resident data from text format"""
    residents = []
    lines = data.strip().split('\n')
    
    for line in lines:
        if not line.strip():
            continue
        
        parts = line.split('\t')
        if len(parts) < 2:
            continue
        
        location = parts[0].strip()
        name = parts[1].strip()
        
        if not name or not location:
            continue
        
        # Parse: 201/2 -> floor=2, block=1, room=small
        match = re.match(r'(\d)(\d{2})/(\d)', location)
        if not match:
            continue
        
        floor = int(match.group(1))
        block = int(match.group(2))
        room_num = int(match.group(3))
        
        # Map room number to type: 2=small, 3 or 4=large
        if room_num == 2:
            room_type = 'small'
        elif room_num in [3, 4]:
            room_type = 'large'
        else:
            continue
        
        residents.append({
            'full_name': name,
            'floor': floor,
            'block': block,
            'room_type': room_type,
            'is_block_leader': False
        })
    
    return residents

def upload_residents(api_url, token, residents):
    """Upload residents to API"""
    success = 0
    failed = 0
    
    for i, resident in enumerate(residents, 1):
        try:
            response = requests.post(
                f"{api_url}/api/residents",
                json=resident,
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if response.status_code in [200, 201]:
                success += 1
                if i % 50 == 0:
                    print(f"  Загружено {i}/{len(residents)}...")
            else:
                failed += 1
                print(f"  ✗ Ошибка: {resident['full_name']} - {response.status_code}")
        
        except Exception as e:
            failed += 1
            print(f"  ✗ Ошибка: {resident['full_name']} - {str(e)}")
    
    return success, failed

if __name__ == "__main__":
    API_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://transit-qa.preview.emergentagent.com')
    
    print("=== Загрузка проживающих ===\n")
    
    # Authenticate
    print("1. Авторизация...")
    login_response = requests.post(
        f"{API_URL}/api/auth/login",
        json={"username": "admin_dorm", "password": "ADm1n@D0rm2024!"}
    )
    
    if login_response.status_code != 200:
        print("✗ Ошибка авторизации!")
        sys.exit(1)
    
    token = login_response.json()['access_token']
    print("✓ Успешно авторизованы\n")
    
    # Parse residents
    print("2. Парсинг данных...")
    residents = parse_residents(RESIDENT_DATA)
    print(f"✓ Обработано {len(residents)} проживающих\n")
    
    # Upload
    print("3. Загрузка в базу данных...")
    success, failed = upload_residents(API_URL, token, residents)
    
    print(f"\n=== Результат ===")
    print(f"✓ Успешно: {success}")
    print(f"✗ Ошибок: {failed}")
    print(f"Всего: {len(residents)}")
