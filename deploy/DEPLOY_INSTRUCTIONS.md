# Инструкция по деплою на Contabo VPS

## Данные сервера
- **IP:** 109.199.106.197
- **Домен:** bgmk-obsh.duckdns.org
- **SSH:** root / ght336702

---

## Шаг 1: Подключитесь к серверу

```bash
ssh root@109.199.106.197
# Введите пароль: ght336702
```

---

## Шаг 2: Установите необходимые компоненты

```bash
# Обновление системы
apt update && apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl enable docker
systemctl start docker

# Установка Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Установка Git
apt install -y git
```

---

## Шаг 3: Настройте Duck DNS

```bash
# Создайте скрипт обновления IP
mkdir -p /opt/duckdns
cat > /opt/duckdns/duck.sh << 'EOF'
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=bgmk-obsh&token=ddd1b399-0607-4cce-82c2-8632c61c29bc&ip=" | curl -k -o /opt/duckdns/duck.log -K -
EOF

chmod +x /opt/duckdns/duck.sh

# Запустите сейчас
/opt/duckdns/duck.sh

# Добавьте в cron для автообновления
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/duckdns/duck.sh >/dev/null 2>&1") | crontab -

# Проверьте результат
cat /opt/duckdns/duck.log
# Должно показать: OK
```

---

## Шаг 4: Создайте папку приложения

```bash
mkdir -p /opt/sanitary-control
cd /opt/sanitary-control
```

---

## Шаг 5: Загрузите файлы приложения

**Вариант A: Через SCP (с вашего компьютера)**
```bash
# На вашем компьютере (не на сервере!)
scp -r /путь/к/backend root@109.199.106.197:/opt/sanitary-control/
scp -r /путь/к/frontend root@109.199.106.197:/opt/sanitary-control/
scp /путь/к/deploy/* root@109.199.106.197:/opt/sanitary-control/
```

**Вариант B: Скачать с Emergent (на сервере)**
Можно скачать проект через Git если он сохранён на GitHub.

---

## Шаг 6: Создайте структуру файлов

На сервере должна быть такая структура:
```
/opt/sanitary-control/
├── docker-compose.yml
├── deploy-ssl.sh
├── backend/
│   ├── Dockerfile
│   ├── server.py
│   └── requirements.txt
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── yarn.lock
│   ├── public/
│   └── src/
└── nginx/
    └── nginx.conf
```

---

## Шаг 7: Получите SSL сертификат и запустите

```bash
cd /opt/sanitary-control
chmod +x deploy-ssl.sh
./deploy-ssl.sh
```

Этот скрипт:
1. Запросит SSL сертификат от Let's Encrypt
2. Соберёт Docker образы
3. Запустит все сервисы

---

## Шаг 8: Проверьте работу

```bash
# Проверьте статус контейнеров
docker-compose ps

# Посмотрите логи
docker-compose logs -f

# Проверьте в браузере
# https://bgmk-obsh.duckdns.org
```

---

## Шаг 9: Обновите Telegram Webhook

```bash
curl "https://api.telegram.org/bot8435342350:AAHpzv8g1lg42yYM_OpiF1xHlaY8Hk7lpmQ/setWebhook?url=https://bgmk-obsh.duckdns.org/api/telegram/webhook"
```

---

## Полезные команды

```bash
# Перезапустить сервисы
docker-compose restart

# Остановить сервисы
docker-compose down

# Запустить сервисы
docker-compose up -d

# Пересобрать и запустить
docker-compose up -d --build

# Посмотреть логи backend
docker-compose logs -f backend

# Зайти в контейнер
docker exec -it sanitary-backend bash
```

---

## Бэкап базы данных

```bash
# Создать бэкап
docker exec sanitary-mongodb mongodump --out /data/backup

# Скопировать бэкап
docker cp sanitary-mongodb:/data/backup ./mongodb-backup
```

---

## Troubleshooting

**Если сайт не открывается:**
```bash
# Проверьте, работает ли nginx
docker-compose logs nginx

# Проверьте, что порты открыты
ufw allow 80
ufw allow 443
```

**Если SSL не работает:**
```bash
# Проверьте сертификаты
ls -la /opt/sanitary-control/certbot/conf/live/bgmk-obsh.duckdns.org/
```

**Если Duck DNS не обновляется:**
```bash
# Проверьте лог
cat /opt/duckdns/duck.log
```
