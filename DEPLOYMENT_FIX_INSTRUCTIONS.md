# Инструкция по деплою исправления на сервер

## Что было исправлено

**Критическая проблема:** Ошибка "Ошибка сохранения" при попытке сохранить или удалить оценки.

**Корневая причина:** На фронтенде токен авторизации считывался только один раз при загрузке компонента, что приводило к использованию устаревшего или пустого токена в запросах.

**Решение:** Теперь токен считывается из localStorage непосредственно перед каждым запросом, и добавлено детальное логирование ошибок.

## Изменённые файлы

1. `/app/frontend/src/pages/BlockDetails.js` - исправлена функция `handleSaveAll` и `handleDeleteInspection`

## Инструкция по развертыванию

### Вариант 1: Автоматический деплой (рекомендуется)

Выполните на вашем локальном компьютере:

```bash
# 1. Подключитесь к серверу
ssh root@109.199.106.197

# 2. Перейдите в директорию проекта
cd /root/bgmk-obsh

# 3. Обновите код
git pull origin main

# 4. Удалите проблемную строку из requirements.txt
cd deploy/backend
sed -i '/emergentintegrations/d' requirements.txt

# 5. Обновите Node.js версию в Dockerfile
sed -i 's/node:18-alpine/node:20-alpine/g' ../frontend/Dockerfile

# 6. Скопируйте yarn.lock
cp ../../frontend/yarn.lock ../frontend/

# 7. Измените Dockerfile для frontend - уберите --frozen-lockfile
sed -i 's/--frozen-lockfile//g' ../frontend/Dockerfile

# 8. Пересоберите контейнеры
cd /root/bgmk-obsh/deploy
docker-compose down
docker system prune -af
docker-compose up -d --build
```

### Вариант 2: Ручное обновление файла

Если автоматический деплой не работает, обновите файл вручную:

1. Подключитесь к серверу: `ssh root@109.199.106.197`
2. Откройте файл: `nano /root/bgmk-obsh/frontend/src/pages/BlockDetails.js`
3. Найдите функцию `handleSaveAll` (строка ~73)
4. Замените:
```javascript
if (!token) {
```
на:
```javascript
// Get fresh token from localStorage
const freshToken = localStorage.getItem('token');

if (!freshToken) {
```

5. Замените в axios.post:
```javascript
{ headers: { Authorization: `Bearer ${token}` } }
```
на:
```javascript
{ headers: { Authorization: `Bearer ${freshToken}` } }
```

6. В блоке catch замените:
```javascript
toast.error('Ошибка сохранения');
```
на:
```javascript
console.error('Save error:', error.response?.data || error.message);
toast.error(error.response?.data?.detail || 'Ошибка сохранения');
```

7. Повторите то же самое для функции `handleDeleteInspection` (строка ~114)

8. Сохраните файл (Ctrl+O, Enter, Ctrl+X)

9. Пересоберите frontend:
```bash
cd /root/bgmk-obsh/deploy
docker-compose restart frontend
```

## Проверка работоспособности

После деплоя:

1. Откройте https://bgmk-obsh.duckdns.org/login
2. Войдите как админ: `admin` / `admin123`
3. Перейдите на любой блок
4. Выберите оценку и нажмите "Сохранить оценки"
5. Должно появиться сообщение "Оценки сохранены!"

## Если что-то не работает

1. Проверьте логи контейнеров:
```bash
docker logs deploy-frontend-1
docker logs deploy-backend-1
```

2. Проверьте, что контейнеры запущены:
```bash
docker ps
```

3. Если билд не проходит из-за yarn/npm:
```bash
# Попробуйте очистить кэш Docker
docker system prune -af --volumes
docker-compose up -d --build
```

## Контакты для помощи

Если возникнут проблемы с деплоем, пришлите вывод команд:
- `docker ps`
- `docker logs deploy-frontend-1`
- `docker logs deploy-backend-1`
