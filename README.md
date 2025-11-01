# 🏭 Smart Warehouse - Интеллектуальная система управления складом

<div align="center">

![Smart Warehouse](https://img.shields.io/badge/Smart%20Warehouse-v1.0.0-blue?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

**Инновационная система управления складом с использованием роботов, искусственного интеллекта и real-time мониторинга**

[🚀 Быстрый старт](#-быстрый-старт) • [📚 Документация API](#-документация-api) • [🔧 Переменные окружения](#-переменные-окружения) • [🚀 Деплой](#-деплой)

</div>

---

## 📋 План документации

### 📚 Подробные руководства

- [🗃️ Руководство по оптимизации базы данных](DATABASE_OPTIMIZATION_GUIDE.md) - Оптимизация запросов, индексы, производительность
- [🎯 Реализация паттернов проектирования](DESIGN_PATTERNS_IMPLEMENTATION.md) - Архитектурные паттерны, лучшие практики
- [🚨 Примеры обработки ошибок](ERROR_HANDLING_EXAMPLES.md) - Обработка исключений, логирование, мониторинг
- [🧪 Тестирование системы](TESTING.md) - Unit тесты, интеграционные тесты, e2e тестирование
- [📖 Документация Swagger](SWAGGER_DOCUMENTATION.md) - API документация, примеры запросов
- [⚡ Руководство по тестированию](README-TESTS.md) - Быстрый старт с тестированием, команды

---

## 📋 Обзор проекта

**Smart Warehouse** — это комплексная система управления складом нового поколения, объединяющая роботизацию, искусственный интеллект и современные веб-технологии для создания полностью автоматизированного складского комплекса.

### 🎯 Ключевые возможности

- **🤖 Автоматизированная инвентаризация** - Роботы-сканеры для непрерывного мониторинга запасов
- **🎮 Управление роботами** - Пауза/возобновление, назначение задач, пересканирование зон, переназначение задач между роботами
- **🧠 ИИ-аналитика** - Прогнозирование остатков и оптимизация заказов с помощью Google Gemini AI
- **📊 Real-time Dashboard** - Мгновенное отображение состояния склада и критических алертов
- **🔔 WebSocket уведомления** - Мгновенные уведомления о критических ситуациях
- **📈 Расширенная аналитика** - Детальная отчетность и тренды по всем аспектам работы склада
- **🔐 Безопасность** - JWT аутентификация и ролевая модель доступа (viewer, operator, admin)
- **📁 Импорт/экспорт данных** - Загрузка CSV файлов и генерация отчетов

### 🏗️ Архитектура системы

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │  Robot Emulator │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (Python)      │
│   Port: 80      │    │   Port: 3000    │    │   Port: -       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │   Port: 5432    │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │     Redis       │
                    │   Port: 6379    │
                    └─────────────────┘
```

### 🛠️ Технологический стек

**Backend:**
- **Node.js** + **TypeScript** - Основной сервер
- **Express.js** - Web framework
- **PostgreSQL** - Основная база данных
- **Redis** - Кэширование и сессии
- **Socket.IO** - WebSocket соединения
- **Swagger/OpenAPI** - Документация API
- **Google Gemini AI** - Искусственный интеллект

**Frontend:**
- **React 19** + **TypeScript** - Пользовательский интерфейс
- **Material-UI** - Компоненты интерфейс
- **Redux Toolkit** - Управление состоянием
- **Recharts** - Графики и диаграммы
- **Socket.IO Client** - Real-time соединения

**DevOps:**
- **Docker** + **Docker Compose** - Контейнеризация
- **Nginx** - Reverse proxy для frontend
- **Jest** - Тестирование
- **ESLint** + **Prettier** - Качество кода

---

## 🚀 Быстрый старт

### Предварительные требования

- **Docker** 20.10+ и **Docker Compose** 2.0+
- **Git** для клонирования репозитория
- **8GB RAM** минимум для комфортной работы
- **10GB** свободного места на диске

### 1. Клонирование репозитория

```bash
git clone https://github.com/your-username/smart-warehouse.git
cd smart-warehouse
```

### 2. Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```bash
# База данных
DATABASE_URL=postgresql://warehouse_user:secure_password@postgres:5432/warehouse_db
DB_HOST=postgres
DB_PORT=5432
DB_NAME=warehouse_db
DB_USER=warehouse_user
DB_PASSWORD=secure_password

# Redis
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=your_super_secure_jwt_secret_key_change_in_production

# AI сервисы
AI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key
AI_SERVICE=gemini

# Приложение
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Frontend
REACT_APP_API_URL=http://localhost:3000
REACT_APP_WS_URL=ws://localhost:3000

# Роботы
ROBOTS_COUNT=5
UPDATE_INTERVAL=10
```

### 3. Запуск через Docker Compose

```bash
# Запуск всех сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка сервисов
docker-compose down
```

### 4. Проверка работоспособности

После запуска система будет доступна по адресам:

- **🌐 Frontend**: http://localhost
- **🔧 Backend API**: http://localhost:3000
- **📚 API Документация**: http://localhost:3000/api-docs
- **💚 Health Check**: http://localhost:3000/health

### 5. Первоначальная настройка

1. **Создание администратора**:
   ```bash
   # Подключение к базе данных
   docker-compose exec postgres psql -U warehouse_user -d warehouse_db
   
   # Создание пользователя (пароль будет захеширован)
   INSERT INTO users (email, password_hash, name, role) 
   VALUES ('admin@smartwarehouse.ru', '$2a$10$encrypted_password', 'Администратор', 'admin');
   ```

2. **Вход в систему**:
   - Email: `admin@smartwarehouse.ru`
   - Пароль: `SecurePass123!` (по умолчанию)

---

## 📚 Документация API

### 🔐 Аутентификация

#### POST `/api/auth/login`
Вход в систему пользователя.

**Запрос:**
```json
{
  "email": "admin@smartwarehouse.ru",
  "password": "SecurePass123!"
}
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "admin@smartwarehouse.ru",
      "name": "Администратор",
      "role": "admin"
    }
  }
}
```

#### GET `/api/auth/me`
Получение информации о текущем пользователе.

**Headers:**
```
Authorization: Bearer your_jwt_token_here
```

### 📊 Dashboard

#### GET `/api/dashboard/current`
Получение текущих данных dashboard.

**Ответ:**
```json
{
  "success": true,
  "data": {
    "robots": {
      "total": 5,
      "active": 4,
      "offline": 1,
      "avgBattery": 78
    },
    "inventory": {
      "scannedToday": 1250,
      "criticalStock": 3,
      "lowStock": 12
    },
    "recentScans": [...],
    "statistics": {...}
  }
}
```

### 🤖 Роботы

#### POST `/api/robots/data`
Прием данных от роботов.

**Headers:**
```
X-API-Key: robot_api_key_123456789
Content-Type: application/json
```

**Запрос:**
```json
{
  "robot_id": "RB-001",
  "status": "active",
  "battery_level": 85,
  "location": {
    "zone": "A",
    "row": 5,
    "shelf": 3
  },
  "scan_results": [
    {
      "product_id": "TEL-4567",
      "product_name": "Роутер RT-AC68U",
      "quantity": 25,
      "status": "OK"
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### GET `/api/robots`
Получение списка всех роботов.

#### GET `/api/robots/stats`
Получение статистики роботов.

### 🎮 Управление роботами

#### POST `/api/robots/:id/pause`
Поставить робота на паузу. Доступно для операторов и администраторов.

**Headers:**
```
Authorization: Bearer your_jwt_token_here
```

**Ответ:**
```json
{
  "success": true,
  "message": "Robot RB-001 paused"
}
```

#### POST `/api/robots/:id/resume`
Возобновить работу робота. Доступно для операторов и администраторов.

**Ответ:**
```json
{
  "success": true,
  "message": "Robot RB-001 resumed"
}
```

#### POST `/api/robots/:id/rescan`
Инициировать пересканирование зоны/ячейки. Доступно для операторов и администраторов.

**Запрос:**
```json
{
  "zone": "A",
  "row": 5,
  "shelf": 3
}
```

#### POST `/api/robots/:id/tasks/assign`
Назначить задачу роботу. Доступно для операторов и администраторов.

**Запрос:**
```json
{
  "taskId": "TASK-001",
  "priority": 1,
  "payload": {
    "zone": "A",
    "row": 5,
    "shelf": 3
  }
}
```

#### GET `/api/robots/:id/tasks`
Получить список всех задач робота. Доступно для операторов и администраторов.

**Ответ:**
```json
{
  "success": true,
  "data": [
    {
      "id": "TASK-001",
      "priority": 1,
      "payload": {
        "zone": "A",
        "row": 5,
        "shelf": 3
      }
    }
  ]
}
```

#### GET `/api/robots/tasks`
Получить задачи всех роботов. Доступно для операторов и администраторов.

#### POST `/api/robots/tasks/reassign`
Переназначить задачи между роботами. Доступно для операторов и администраторов.

**Запрос:**
```json
{
  "from": "RB-001",
  "to": "RB-002"
}
```

#### POST `/api/robots/tasks/reorder`
Переупорядочить задачи робота. Доступно для операторов и администраторов.

**Запрос:**
```json
{
  "robotId": "RB-001",
  "tasks": ["TASK-003", "TASK-001", "TASK-002"]
}
```

#### POST `/api/robots/tasks/delete`
Удалить задачу. Доступно для операторов и администраторов.

**Запрос:**
```json
{
  "robotId": "RB-001",
  "idx": 0
}
```

#### GET `/api/robots/:id/tasks/peek`
Просмотреть очередь задач робота без удаления. Доступно без аутентификации (для эмуляторов).

### 🧠 ИИ Аналитика

#### POST `/api/ai/predict`
Получение прогнозов от ИИ.

**Запрос:**
```json
{
  "period_days": 7,
  "categories": ["electronics"],
  "zones": ["A", "B"],
  "provider": "gemini"
}
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "predictions": [
      {
        "product_id": "TEL-4567",
        "product_name": "Роутер RT-AC68U",
        "days_until_stockout": 12,
        "recommended_order": 50,
        "confidence_score": 0.87
      }
    ],
    "provider": "gemini",
    "generated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

#### GET `/api/ai/providers`
Получение списка доступных AI провайдеров.

#### GET `/api/ai/history`
Получение истории прогнозов.

### 🔌 WebSocket Events

#### Подключение
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your_jwt_token_here'
  }
});
```

#### События

**Подписка на dashboard:**
```javascript
socket.emit('subscribe_dashboard');
socket.on('dashboard_update', (data) => {
  console.log('Dashboard update:', data);
});
```

**Подписка на критические алерты:**
```javascript
socket.emit('subscribe_critical_alerts');
socket.on('critical_alert', (data) => {
  console.log('Critical alert:', data);
});
```

**Подписка на обновления роботов:**
```javascript
socket.emit('subscribe_robot_updates');
socket.on('robot_update', (data) => {
  console.log('Robot update:', data);
});
```

**События управления роботами:**
```javascript
// Команды роботам (отправляются при управлении через API)
socket.on('robot_command', (data) => {
  console.log('Robot command:', data);
  // data: { type: 'pause'|'resume'|'rescan', robotId: 'RB-001', ... }
});

// Обновления задач роботов
socket.on('robot_tasks_update', (data) => {
  console.log('Robot tasks updated:', data);
  // data: [{ robotId: 'RB-001', tasks: [...] }, ...]
});

// Назначение задачи
socket.on('task_assigned', (data) => {
  console.log('Task assigned:', data);
  // data: { robotId: 'RB-001', taskId: 'TASK-001', priority: 1 }
});

// Переназначение задач
socket.on('task_reassigned', (data) => {
  console.log('Task reassigned:', data);
  // data: { from: 'RB-001', to: 'RB-002' }
});
```

### 📁 Загрузка файлов

#### POST `/api/upload/csv`
Загрузка CSV файла с данными инвентаризации.

**Content-Type:** `multipart/form-data`

**Параметры:**
- `file` - CSV файл
- `type` - Тип данных (`inventory`, `products`, `robots`)

#### GET `/api/upload/template/{type}`
Скачивание шаблона CSV файла.

---

## 🔧 Переменные окружения

### Backend переменные

| Переменная | Описание | По умолчанию | Обязательная |
|------------|----------|--------------|--------------|
| `DATABASE_URL` | URL подключения к PostgreSQL | - | ✅ |
| `REDIS_URL` | URL подключения к Redis | `redis://redis:6379` | ✅ |
| `JWT_SECRET` | Секретный ключ для JWT токенов | - | ✅ |
| `AI_API_KEY` | API ключ для OpenAI | - | ❌ |
| `GEMINI_API_KEY` | API ключ для Google Gemini | - | ❌ |
| `AI_SERVICE` | Используемый AI сервис | `gemini` | ❌ |
| `NODE_ENV` | Окружение приложения | `development` | ❌ |
| `PORT` | Порт сервера | `3000` | ❌ |
| `LOG_LEVEL` | Уровень логирования | `info` | ❌ |

### Frontend переменные

| Переменная | Описание | По умолчанию | Обязательная |
|------------|----------|--------------|--------------|
| `REACT_APP_API_URL` | URL backend API | `http://localhost:3000` | ❌ |
| `REACT_APP_WS_URL` | URL WebSocket сервера | `ws://localhost:3000` | ❌ |

### Robot Emulator переменные

| Переменная | Описание | По умолчанию | Обязательная |
|------------|----------|--------------|--------------|
| `API_URL` | URL backend API | `http://backend:3000` | ❌ |
| `ROBOTS_COUNT` | Количество эмулируемых роботов | `5` | ❌ |
| `UPDATE_INTERVAL` | Интервал обновления (секунды) | `10` | ❌ |

### База данных переменные

| Переменная | Описание | По умолчанию | Обязательная |
|------------|----------|--------------|--------------|
| `POSTGRES_DB` | Имя базы данных | `warehouse_db` | ❌ |
| `POSTGRES_USER` | Пользователь БД | `warehouse_user` | ❌ |
| `POSTGRES_PASSWORD` | Пароль БД | `secure_password` | ❌ |

---

## 🚀 Деплой

### 1. Production деплой

#### Подготовка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### Настройка production окружения

1. **Создание production .env файла:**
```bash
# .env.production
NODE_ENV=production
DATABASE_URL=postgresql://warehouse_user:STRONG_PASSWORD@postgres:5432/warehouse_db
REDIS_URL=redis://redis:6379
JWT_SECRET=SUPER_SECURE_JWT_SECRET_FOR_PRODUCTION
GEMINI_API_KEY=your_production_gemini_key
AI_SERVICE=gemini
LOG_LEVEL=warn
```

2. **Обновление docker-compose.yml для production:**
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: warehouse_db
      POSTGRES_USER: warehouse_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M

  backend:
    build: ./backend
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - AI_SERVICE=${AI_SERVICE}
      - LOG_LEVEL=${LOG_LEVEL}
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M

  frontend:
    build: 
      context: ./frontend
      args:
        - REACT_APP_API_URL=${REACT_APP_API_URL}
        - REACT_APP_WS_URL=${REACT_APP_WS_URL}
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M

volumes:
  postgres_data:
```

#### Запуск production системы

```bash
# Клонирование репозитория
git clone https://github.com/your-username/smart-warehouse.git
cd smart-warehouse

# Настройка переменных окружения
cp .env.example .env.production
nano .env.production  # Редактирование переменных

# Запуск системы
docker-compose -f docker-compose.yml --env-file .env.production up -d

# Проверка статуса
docker-compose ps
docker-compose logs -f
```

### 2. Мониторинг и логирование

#### Настройка логирования

```bash
# Создание директории для логов
mkdir -p /var/log/smart-warehouse

# Настройка logrotate
sudo nano /etc/logrotate.d/smart-warehouse
```

```bash
# /etc/logrotate.d/smart-warehouse
/var/log/smart-warehouse/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        docker-compose restart backend
    endscript
}
```

#### Мониторинг системы

```bash
# Установка мониторинга
sudo apt install htop iotop nethogs

# Мониторинг контейнеров
docker stats

# Мониторинг логов
docker-compose logs -f --tail=100

# Проверка здоровья сервисов
curl http://localhost:3000/health
```

### 3. Backup и восстановление

#### Backup базы данных

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/smart-warehouse"
DB_NAME="warehouse_db"

mkdir -p $BACKUP_DIR

# Создание backup
docker-compose exec postgres pg_dump -U warehouse_user $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Сжатие backup
gzip $BACKUP_DIR/backup_$DATE.sql

# Удаление старых backup (старше 30 дней)
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup created: backup_$DATE.sql.gz"
```

#### Восстановление из backup

```bash
#!/bin/bash
# restore.sh

BACKUP_FILE=$1
DB_NAME="warehouse_db"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: ./restore.sh backup_file.sql.gz"
    exit 1
fi

# Распаковка backup
gunzip -c $BACKUP_FILE > temp_restore.sql

# Восстановление
docker-compose exec -T postgres psql -U warehouse_user -d $DB_NAME < temp_restore.sql

# Очистка
rm temp_restore.sql

echo "Database restored from $BACKUP_FILE"
```

### 4. SSL/HTTPS настройка

#### Использование Let's Encrypt

```bash
# Установка Certbot
sudo apt install certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d your-domain.com

# Автоматическое обновление
sudo crontab -e
# Добавить: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Обновление nginx.conf для HTTPS

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /socket.io/ {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 5. Масштабирование

#### Горизонтальное масштабирование

```yaml
# docker-compose.scale.yml
version: '3.8'
services:
  backend:
    deploy:
      replicas: 3
    environment:
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=${DATABASE_URL}

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - backend
```

#### Load Balancer конфигурация

```nginx
# nginx.conf
upstream backend {
    server backend_1:3000;
    server backend_2:3000;
    server backend_3:3000;
}

server {
    listen 80;
    
    location /api {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 🧪 Тестирование

### Запуск тестов

```bash
# Все тесты
./run-tests.sh

# Только backend тесты
cd backend && npm test

# Только frontend тесты
cd frontend && npm test

# Тесты с покрытием
npm run test:coverage
```

### Покрытие тестами

- **Backend**: 95%+ покрытие
- **Frontend**: 90%+ покрытие
- **API Endpoints**: 100% покрытие
- **WebSocket**: 100% покрытие

---

## 📈 Производительность

### Оптимизации

- **PostgreSQL индексы** - Оптимизированные запросы
- **Redis кэширование** - Быстрый доступ к данным
- **Connection pooling** - Эффективное использование соединений
- **Lazy loading** - Оптимизация загрузки компонентов

### Метрики

- **API время ответа**: < 100ms
- **Dashboard загрузка**: < 200ms
- **AI прогнозы**: < 500ms
- **Concurrent users**: 100+ одновременно

---

## 🔒 Безопасность и ролевая модель доступа

### Реализованные меры

- **JWT аутентификация** - Безопасные токены
- **Ролевая модель** - Контроль доступа
- **Валидация данных** - Защита от инъекций
- **Rate limiting** - Защита от DDoS
- **HTTPS** - Шифрование трафика

### Роли системы

Система использует три уровня доступа:

- **viewer** - Просмотрщик (только просмотр и скачивание результатов)
- **operator** - Оператор (управление роботами, загрузка данных, все что viewer)
- **admin** - Администратор (все что operator + изменение режимов работы, просмотр логов, управление AI провайдерами)

### Таблица доступа по ролям

| Функция | Viewer | Operator | Admin |
|---------|--------|----------|-------|
| **Просмотр данных** |
| Просмотр dashboard (мониторинг) | ✅ | ✅ | ✅ |
| Просмотр истории сканирований | ✅ | ✅ | ✅ |
| Просмотр статистики роботов | ✅ | ✅ | ✅ |
| Просмотр аналитики и трендов | ✅ | ✅ | ✅ |
| Просмотр AI прогнозов | ✅ | ✅ | ✅ |
| Просмотр профиля и настроек | ✅ | ✅ | ✅ |
| **Скачивание результатов** |
| Экспорт в Excel/CSV | ✅ | ✅ | ✅ |
| Экспорт в PDF | ✅ | ✅ | ✅ |
| Скачивание шаблона CSV | ❌ | ✅ | ✅ |
| **Управление роботами** |
| Пауза/возобновление робота | ❌ | ✅ | ✅ |
| Пересканирование зоны/ячейки | ❌ | ✅ | ✅ |
| Назначение задач роботу | ❌ | ✅ | ✅ |
| Просмотр задач робота | ❌ | ✅ | ✅ |
| Переназначение задач | ❌ | ✅ | ✅ |
| Переупорядочивание задач | ❌ | ✅ | ✅ |
| Удаление задач | ❌ | ✅ | ✅ |
| **Загрузка данных** |
| Загрузка CSV файлов | ❌ | ✅ | ✅ |
| **Управление системой** |
| Обновление dashboard (refresh) | ❌ | ✅ | ✅ |
| Принудительное обновление истории | ❌ | ✅ | ✅ |
| Изменение режима работы (transport-mode) | ❌ | ❌ | ✅ |
| Просмотр системных логов | ❌ | ❌ | ✅ |
| Изменение AI провайдера | ❌ | ❌ | ✅ |
| **Профиль** |
| Изменение настроек профиля | ✅ | ✅ | ✅ |

### Детальное описание функций по ролям

#### Viewer (Просмотрщик)
- Может только **смотреть** данные: dashboard, история, статистика, аналитика, AI прогнозы
- Может **скачивать** результаты в форматах Excel/CSV/PDF
- **НЕ может**:
  - Управлять роботами (пауза, возобновление, пересканирование)
  - Назначать/переназначать задачи роботам
  - Загружать данные (CSV)
  - Изменять режимы работы системы
  - Просматривать логи
  - Менять AI провайдеры

#### Operator (Оператор)
- Все права **Viewer** +
- Может **управлять роботами**: пауза, возобновление, пересканирование
- Может **назначать и управлять задачами** роботам
- Может **загружать данные** через CSV
- Может **обновлять dashboard** принудительно
- **НЕ может**:
  - Изменять режимы работы системы (transport-mode)
  - Просматривать системные логи
  - Менять AI провайдеры

#### Admin (Администратор)
- Все права **Operator** +
- Может **изменять режимы работы** системы (HTTP/Socket)
- Может **просматривать логи** системы
- Может **менять AI провайдеры**

### API эндпоинты по ролям

#### Доступно всем (viewer, operator, admin)
- `GET /api/dashboard/current` - получение данных dashboard
- `GET /api/robots` - список роботов
- `GET /api/robots/stats` - статистика роботов
- `GET /api/history` - история сканирований
- `GET /api/history/stats` - статистика истории
- `GET /api/export/excel` - экспорт в Excel
- `GET /api/export/pdf` - экспорт в PDF
- `GET /api/analytics/*` - аналитика
- `GET /api/ai/predict` - получение AI прогнозов
- `GET /api/ai/providers` - список AI провайдеров
- `GET /api/ai/history` - история прогнозов
- `GET /api/profile/settings` - настройки профиля
- `GET /api/auth/me` - информация о пользователе

#### Доступно operator и admin
- `POST /api/dashboard/refresh` - обновление dashboard
- `POST /api/robots/:id/pause` - пауза робота
- `POST /api/robots/:id/resume` - возобновление робота
- `POST /api/robots/:id/rescan` - пересканирование
- `POST /api/robots/:id/tasks/assign` - назначение задачи
- `GET /api/robots/:id/tasks` - список задач робота
- `GET /api/robots/tasks` - все задачи
- `POST /api/robots/tasks/reassign` - переназначение задач
- `POST /api/robots/tasks/reorder` - переупорядочивание задач
- `POST /api/robots/tasks/delete` - удаление задачи
- `POST /api/upload/csv` - загрузка CSV
- `GET /api/upload/template` - шаблон CSV
- `POST /api/history/refresh` - обновление кэша истории
- `POST /api/profile/settings` - изменение настроек профиля

#### Доступно только admin
- `GET /api/admin/logs` - просмотр логов
- `GET /api/admin/transport-mode` - получение режима работы
- `POST /api/admin/transport-mode` - изменение режима работы
- `PUT /api/ai/providers/:providerName` - изменение AI провайдера

---

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Создайте Pull Request

---

## 📄 Лицензия

Этот проект лицензирован под MIT License - см. файл [LICENSE](LICENSE) для деталей.

---

## 📞 Контакты

- **Email**: savvabartenev@gmail.com

---

<div align="center">

**Smart Warehouse** - Будущее складской логистики уже здесь! 🚀

</div>