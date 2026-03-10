# Telegram Web App - Санитарный Контроль Общежития

## Описание проекта
Веб-приложение для мониторинга и управления санитарным состоянием комнат в общежитии. Интегрировано с Telegram как Mini App.

## Основные требования
- Охват этажей: 2-9 (8 этажей)
- На каждом этаже: 15 блоков
- В каждом блоке: Маленькая комната, Большая комната, Общее пространство
- Система оценок: 1-5 (1-2 = проблемные комнаты, выделены красным)
- Роли: Администратор, Старосты этажей (по одному на этаж)
- Публичный доступ для просмотра (без авторизации)

## Архитектура
```
/app/
├── backend/
│   ├── server.py       # FastAPI, API endpoints, модели
│   ├── tests/          # Pytest тесты
│   └── .env            # Переменные окружения
├── frontend/
│   ├── src/
│   │   ├── pages/      # LoginPage, FloorsList, BlocksList, BlockDetails, Admin, Transport
│   │   ├── context/    # AuthContext, TelegramContext
│   │   └── components/ # UI компоненты (Shadcn/UI)
│   └── .env
└── memory/
    └── PRD.md
```

## База данных (MongoDB)
- **users**: username, password_hash, role, floor_number, login_history
- **residents**: full_name, floor, block, room_type, is_block_leader
- **inspections**: floor, block, room_type, rating, inspector_id, inspection_date

## API Endpoints
- `POST /api/auth/login` - Авторизация
- `GET /api/auth/me` - Текущий пользователь
- `GET /api/blocks/{floor}/{block}` - Информация о блоке
- `POST /api/inspections` - Создание оценки
- `GET /api/inspections` - Список проверок (с фильтрами)
- `GET /api/residents?search=` - Поиск жителей
- `GET /api/admin/users` - Список пользователей
- `GET /api/admin/export/pdf` - Экспорт отчёта в PDF
- `GET /api/transport` - Расписание транспорта (с Yandex API fallback)
- `GET /api/telegram/bot-info` - Информация о боте
- `POST /api/telegram/webhook` - Webhook для Telegram

## Реализованные функции

### Завершено (10 марта 2026)
- [x] Полный бэкенд с FastAPI + MongoDB
- [x] Фронтенд на React + TailwindCSS + Shadcn/UI
- [x] Авторизация JWT (админ + старосты)
- [x] Загрузка 654 жителей в базу
- [x] Страницы: FloorsList, BlocksList, BlockDetails, Admin, Transport, Login
- [x] Кнопка "Выйти" для авторизованных пользователей
- [x] Фильтр по одной дате на странице этажа (BlocksList)
- [x] Переделанное модальное окно оценки комнаты
- [x] Режим быстрой оценки всех комнат (batch mode - "Оценить всё")
- [x] Экспорт отчётов в PDF
- [x] Просмотр истории входов в админ-панели
- [x] Красный цвет только для оценок 1-2 (не 1-3)
- [x] Глобальный поиск по номеру блока/ФИО жильца
- [x] Telegram Bot интеграция (@obshbsmc_bot)
  - Команды: /start, /help, /status
  - Telegram Web App support
  - Webhook настроен
- [x] Yandex Maps API для транспорта (с fallback на симуляцию)
- [x] Расписание автобусов и троллейбусов (Дом правосудия, Минск)

## Ожидающие задачи

### P3 - Будущие задачи
- [ ] Деплой на Contabo VPS + Duck DNS

## Учётные данные
- **Админ**: admin / admin123
- **Telegram Bot**: @obshbsmc_bot

## Интеграции
- **Telegram Bot Token**: 8435342350:AAHpzv8g1lg42yYM_OpiF1xHlaY8Hk7lpmQ
- **Yandex Maps API Key**: c6d6dc12-3699-4309-9fe1-b5173399116d

## Тестирование
- Backend: `/app/backend/tests/test_sanitary_control.py`
- Успешность: 100% (21/21 тестов)
