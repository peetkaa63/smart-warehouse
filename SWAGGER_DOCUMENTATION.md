# 📚 Swagger/OpenAPI Документация Smart Warehouse API

## 🚀 Быстрый старт

### Доступ к документации
- **Swagger UI**: http://localhost:3000/api-docs
- **JSON Schema**: http://localhost:3000/api-docs.json
- **Health Check**: http://localhost:3000/health

### Авторизация
1. Получите JWT токен через `POST /api/auth/login`
2. Нажмите кнопку "Authorize" в Swagger UI
3. Введите токен в формате: `Bearer your_jwt_token_here`

## 📋 Документированные API Endpoints

### 🔐 Authentication
- `POST /api/auth/login` - Вход в систему
- `GET /api/auth/me` - Получить текущего пользователя

### 📊 Dashboard
- `GET /api/dashboard/current` - Получить текущие данные dashboard
- `POST /api/dashboard/refresh` - Обновить данные dashboard

### 🤖 Robots
- `POST /api/robots/data` - Прием данных от роботов
- `GET /api/robots` - Получить список всех роботов
- `GET /api/robots/stats` - Получить статистику роботов

### 🎮 Управление роботами
- `POST /api/robots/:id/pause` - Поставить робота на паузу (operator, admin)
- `POST /api/robots/:id/resume` - Возобновить работу робота (operator, admin)
- `POST /api/robots/:id/rescan` - Инициировать пересканирование зоны/ячейки (operator, admin)
- `POST /api/robots/:id/tasks/assign` - Назначить задачу роботу (operator, admin)
- `GET /api/robots/:id/tasks` - Получить список всех задач робота (operator, admin)
- `GET /api/robots/:id/tasks/peek` - Просмотреть очередь задач робота без удаления
- `GET /api/robots/:id/tasks/next` - Получить следующую задачу робота (для эмулятора)
- `GET /api/robots/tasks` - Получить задачи всех роботов (operator, admin)
- `POST /api/robots/tasks/reassign` - Переназначить задачи между роботами (operator, admin)
- `POST /api/robots/tasks/reorder` - Переупорядочить задачи робота (operator, admin)
- `POST /api/robots/tasks/delete` - Удалить задачу (operator, admin)

### 🧠 AI Analytics
- `POST /api/ai/predict` - Получить прогнозы от ИИ
- `POST /api/ai/predict/advanced` - Расширенная аналитика с фильтрами
- `GET /api/ai/providers` - Получить список доступных AI провайдеров
- `PUT /api/ai/providers/{providerName}` - Изменить AI провайдера по умолчанию
- `GET /api/ai/history` - Получить историю прогнозов

### 🔌 WebSocket Events
- `GET /socket.io/` - WebSocket соединение
- `POST /socket.io/events/authenticate` - Авторизация WebSocket
- `POST /socket.io/events/subscribe_dashboard` - Подписка на dashboard
- `POST /socket.io/events/subscribe_critical_alerts` - Подписка на критические алерты
- `POST /socket.io/events/subscribe_robot_updates` - Подписка на обновления роботов

## 🛠️ Технические детали

### Используемые технологии
- **swagger-jsdoc** - Генерация OpenAPI спецификации из JSDoc комментариев
- **swagger-ui-express** - Swagger UI интерфейс
- **express** - HTTP сервер
- **socket.io** - WebSocket соединения

### Структура документации
```
backend/src/
├── config/
│   └── swagger.ts          # Конфигурация Swagger
├── routes/
│   ├── authRoutes.ts       # Документированные auth routes
│   ├── dashboardRoutes.ts  # Документированные dashboard routes
│   ├── robotsRoutes.ts     # Документированные robot routes
│   └── aiRoutes.ts         # Документированные AI routes
├── controllers/
│   └── authController.ts   # JSDoc комментарии в контроллерах
├── sockets/
│   └── WebSocketDocumentation.ts  # WebSocket документация
└── middleware/
    └── errorMiddleware.ts  # Обработка ошибок с Swagger схемами
```

## 📝 Примеры использования

### 1. Авторизация
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@smartwarehouse.ru",
    "password": "SecurePass123!"
  }'
```

### 2. Получение данных dashboard
```bash
curl -X GET http://localhost:3000/api/dashboard/current \
  -H "Authorization: Bearer your_jwt_token_here"
```

### 3. Отправка данных от робота
```bash
curl -X POST http://localhost:3000/api/robots/data \
  -H "Content-Type: application/json" \
  -H "X-API-Key: robot_api_key_123456789" \
  -d '{
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
  }'
```

### 4. Получение AI прогнозов
```bash
curl -X POST http://localhost:3000/api/ai/predict \
  -H "Authorization: Bearer your_jwt_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "period_days": 7,
    "categories": ["electronics"],
    "zones": ["A", "B"],
    "provider": "Gemini"
  }'
```

### 5. WebSocket подключение (JavaScript)
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your_jwt_token_here'
  }
});

// Авторизация
socket.emit('authenticate', {
  token: 'your_jwt_token_here',
  userId: 'user_123',
  userRole: 'admin'
});

// Подписка на события
socket.emit('subscribe_dashboard');
socket.emit('subscribe_critical_alerts');
socket.emit('subscribe_robot_updates');

// Обработка событий
socket.on('dashboard_update', (data) => {
  console.log('Dashboard update:', data);
});

socket.on('critical_alert', (data) => {
  console.log('Critical alert:', data);
});

socket.on('robot_update', (data) => {
  console.log('Robot update:', data);
});
```

## 🔧 Настройка и конфигурация

### Environment переменные
```bash
# .env
API_URL=http://localhost:3000
NODE_ENV=development
PORT=3000
```

### Кастомизация Swagger UI
Swagger UI настраивается в `backend/src/config/swagger.ts`:
- Кастомные CSS стили
- Настройки отображения
- Фильтрация и поиск
- Авторизация

### Добавление новых endpoints
1. Добавьте JSDoc комментарии в route файл:
```typescript
/**
 * @swagger
 * /api/your-endpoint:
 *   get:
 *     summary: Описание endpoint
 *     description: Подробное описание
 *     tags: [YourTag]
 *     responses:
 *       200:
 *         description: Успешный ответ
 */
```

2. Обновите схемы в `swagger.ts` если нужно
3. Перезапустите сервер

## 📊 Схемы данных

### Основные схемы
- **User** - Пользователь системы
- **Robot** - Робот склада
- **RobotData** - Данные от робота
- **ScanResult** - Результат сканирования
- **DashboardData** - Данные dashboard
- **Error** - Структурированная ошибка

### WebSocket схемы
- **WebSocketMessage** - Базовое WebSocket сообщение
- **DashboardUpdateEvent** - Событие обновления dashboard
- **RobotUpdateEvent** - Событие обновления робота
- **InventoryAlertEvent** - Событие алерта о запасах
- **CriticalAlertEvent** - Событие критического алерта

## 🚨 Обработка ошибок

Все API endpoints возвращают структурированные ошибки:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Ошибка валидации данных",
    "messageRu": "Ошибка валидации данных",
    "statusCode": 400,
    "severity": "LOW",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_123456789",
    "details": {
      "validationErrors": [...]
    }
  }
}
```

## 🔍 Отладка

### Логирование
- Все запросы логируются с Request ID
- Ошибки логируются с детальной информацией
- WebSocket события логируются отдельно

### Мониторинг
- Health check endpoint для проверки состояния
- Request ID для трассировки запросов
- Детальная информация об ошибках

## 📚 Дополнительные ресурсы

- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)
- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Express.js Documentation](https://expressjs.com/)

## 🤝 Вклад в документацию

1. Добавляйте JSDoc комментарии к новым endpoints
2. Обновляйте схемы в `swagger.ts`
3. Тестируйте документацию в Swagger UI
4. Обновляйте примеры использования

---

**Примечание**: Документация автоматически генерируется из JSDoc комментариев при запуске сервера. Убедитесь, что все изменения сохранены и сервер перезапущен.

