/**
 * @swagger
 * components:
 *   schemas:
 *     WebSocketConnection:
 *       type: object
 *       properties:
 *         socketId:
 *           type: string
 *           example: "socket_123456789"
 *           description: Уникальный ID WebSocket соединения
 *         userId:
 *           type: string
 *           example: "user_123"
 *           description: ID пользователя (если авторизован)
 *         userRole:
 *           type: string
 *           enum: [admin, operator, viewer]
 *           example: "admin"
 *           description: Роль пользователя
 *         connectedAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 *           description: Время подключения
 *         subscriptions:
 *           type: array
 *           items:
 *             type: string
 *           example: ["dashboard", "critical_alerts", "robots"]
 *           description: Активные подписки
 *     
 *     WebSocketMessage:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           example: "dashboard_update"
 *           description: Тип сообщения
 *         data:
 *           type: object
 *           description: Данные сообщения
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 *           description: Время отправки сообщения
 *         requestId:
 *           type: string
 *           example: "req_123456789"
 *           description: ID запроса (если применимо)
 *     
 *     WebSocketError:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           enum: [connection, authentication, data, timeout, unknown]
 *           example: "connection"
 *           description: Тип ошибки
 *         message:
 *           type: string
 *           example: "Ошибка подключения к серверу"
 *           description: Сообщение об ошибке
 *         code:
 *           type: string
 *           example: "CONNECTION_FAILED"
 *           description: Код ошибки
 *         details:
 *           type: object
 *           description: Дополнительные детали ошибки
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 *           description: Время возникновения ошибки
 * 
 *   parameters:
 *     WebSocketAuth:
 *       name: Authorization
 *       in: header
 *       description: JWT токен для авторизации WebSocket соединения
 *       required: false
 *       schema:
 *         type: string
 *         example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     
 *     WebSocketAPIKey:
 *       name: X-API-Key
 *       in: header
 *       description: API ключ для роботов
 *       required: false
 *       schema:
 *         type: string
 *         example: "robot_api_key_123456789"
 * 
 * tags:
 *   - name: WebSocket
 *     description: WebSocket события для реального времени
 *     externalDocs:
 *       description: WebSocket документация
 *       url: https://socket.io/docs/v4/
 */

/**
 * @swagger
 * /socket.io/:
 *   get:
 *     summary: WebSocket соединение
 *     description: |
 *       Устанавливает WebSocket соединение для получения данных в реальном времени.
 *       
 *       ## Подключение
 *       ```javascript
 *       const socket = io('http://localhost:3000', {
 *         auth: {
 *           token: 'your_jwt_token'
 *         }
 *       });
 *       ```
 *       
 *       ## Авторизация
 *       После подключения необходимо авторизоваться:
 *       ```javascript
 *       socket.emit('authenticate', {
 *         token: 'your_jwt_token',
 *         userId: 'user_123',
 *         userRole: 'admin'
 *       });
 *       ```
 *       
 *       ## Подписки
 *       - `subscribe_dashboard` - подписка на обновления dashboard
 *       - `subscribe_critical_alerts` - подписка на критические алерты
 *       - `subscribe_robot_updates` - подписка на обновления роботов
 *       
 *       ## События
 *       - `dashboard_update` - обновление данных dashboard
 *       - `robot_update` - обновление статуса робота
 *       - `inventory_alert` - алерт о запасах
 *       - `critical_alert` - критический алерт
 *       - `notification` - общее уведомление
 *     tags: [WebSocket]
 *     parameters:
 *       - $ref: '#/components/parameters/WebSocketAuth'
 *     responses:
 *       101:
 *         description: WebSocket соединение установлено
 *         headers:
 *           Upgrade:
 *             description: Протокол обновлен на WebSocket
 *             schema:
 *               type: string
 *               example: "websocket"
 *           Connection:
 *             description: Соединение обновлено
 *             schema:
 *               type: string
 *               example: "Upgrade"
 *       400:
 *         description: Ошибка подключения
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebSocketError'
 *       401:
 *         description: Ошибка авторизации
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebSocketError'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     # События, отправляемые клиенту
 *     DashboardUpdateEvent:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           example: "dashboard_update"
 *         data:
 *           $ref: '#/components/schemas/DashboardData'
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 *     
 *     RobotUpdateEvent:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           example: "robot_update"
 *         data:
 *           $ref: '#/components/schemas/Robot'
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 *     
 *     InventoryAlertEvent:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           example: "inventory_alert"
 *         data:
 *           type: object
 *           properties:
 *             product_id:
 *               type: string
 *               example: "TEL-4567"
 *             product_name:
 *               type: string
 *               example: "Роутер RT-AC68U"
 *             quantity:
 *               type: integer
 *               example: 5
 *             status:
 *               type: string
 *               enum: [OK, LOW_STOCK, CRITICAL]
 *               example: "CRITICAL"
 *             robot_id:
 *               type: string
 *               example: "RB-001"
 *             zone:
 *               type: string
 *               example: "A"
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 *     
 *     CriticalAlertEvent:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           example: "critical_alert"
 *         data:
 *           type: object
 *           properties:
 *             alert_type:
 *               type: string
 *               enum: [ROBOT_BATTERY_LOW, ROBOT_STUCK, CRITICAL_STOCK, SYSTEM_ERROR]
 *               example: "ROBOT_BATTERY_LOW"
 *             message:
 *               type: string
 *               example: "Робот RB-001 имеет критически низкий уровень заряда батареи (5%)"
 *             severity:
 *               type: string
 *               enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *               example: "HIGH"
 *             robot_id:
 *               type: string
 *               example: "RB-001"
 *             requires_action:
 *               type: boolean
 *               example: true
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 *     
 *     NotificationEvent:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           example: "notification"
 *         data:
 *           type: object
 *           properties:
 *             title:
 *               type: string
 *               example: "Системное уведомление"
 *             message:
 *               type: string
 *               example: "Запланировано техническое обслуживание на 15:00"
 *             level:
 *               type: string
 *               enum: [info, warning, error, success]
 *               example: "info"
 *             duration:
 *               type: integer
 *               example: 5000
 *               description: Длительность отображения в миллисекундах (0 = не исчезает)
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 *     
 *     # События, отправляемые серверу
 *     AuthenticateRequest:
 *       type: object
 *       required: [token, userId, userRole]
 *       properties:
 *         token:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *           description: JWT токен авторизации
 *         userId:
 *           type: string
 *           example: "user_123"
 *           description: ID пользователя
 *         userRole:
 *           type: string
 *           enum: [admin, operator, viewer]
 *           example: "admin"
 *           description: Роль пользователя
 *     
 *     SubscribeRequest:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           enum: [dashboard, critical_alerts, robots]
 *           example: "dashboard"
 *           description: Тип подписки
 *     
 *     PingRequest:
 *       type: object
 *       properties:
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 *           description: Время отправки ping
 */

/**
 * @swagger
 * paths:
 *   /socket.io/events/authenticate:
 *     post:
 *       summary: Авторизация WebSocket соединения
 *       description: Авторизует WebSocket соединение для получения доступа к защищенным событиям
 *       tags: [WebSocket]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthenticateRequest'
 *       responses:
 *         200:
 *           description: Успешная авторизация
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success:
 *                     type: boolean
 *                     example: true
 *                   message:
 *                     type: string
 *                     example: "Успешная авторизация"
 *                   userId:
 *                     type: string
 *                     example: "user_123"
 *                   userRole:
 *                     type: string
 *                     example: "admin"
 *         401:
 *           description: Ошибка авторизации
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/WebSocketError'
 * 
 *   /socket.io/events/subscribe_dashboard:
 *     post:
 *       summary: Подписка на обновления dashboard
 *       description: Подписывается на получение обновлений данных dashboard в реальном времени
 *       tags: [WebSocket]
 *       security:
 *         - bearerAuth: []
 *       responses:
 *         200:
 *           description: Подписка активирована
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success:
 *                     type: boolean
 *                     example: true
 *                   message:
 *                     type: string
 *                     example: "Подписка на dashboard активирована"
 *         401:
 *           description: Необходима авторизация
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/WebSocketError'
 * 
 *   /socket.io/events/subscribe_critical_alerts:
 *     post:
 *       summary: Подписка на критические алерты
 *       description: Подписывается на получение критических алертов в реальном времени
 *       tags: [WebSocket]
 *       security:
 *         - bearerAuth: []
 *       responses:
 *         200:
 *           description: Подписка активирована
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success:
 *                     type: boolean
 *                     example: true
 *                   message:
 *                     type: string
 *                     example: "Подписка на критические алерты активирована"
 *         401:
 *           description: Необходима авторизация
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/WebSocketError'
 * 
 *   /socket.io/events/subscribe_robot_updates:
 *     post:
 *       summary: Подписка на обновления роботов
 *       description: Подписывается на получение обновлений статуса роботов в реальном времени
 *       tags: [WebSocket]
 *       security:
 *         - bearerAuth: []
 *       responses:
 *         200:
 *           description: Подписка активирована
 *             content:
 *               application/json:
 *                 schema:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: "Подписка на обновления роботов активирована"
 *         401:
 *           description: Необходима авторизация
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/WebSocketError'
 * 
 *   /socket.io/events/request_dashboard_update:
 *     post:
 *       summary: Запрос обновления dashboard
 *       description: Запрашивает принудительное обновление данных dashboard
 *       tags: [WebSocket]
 *       security:
 *         - bearerAuth: []
 *       responses:
 *         200:
 *           description: Обновление инициировано
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success:
 *                     type: boolean
 *                     example: true
 *                   message:
 *                     type: string
 *                     example: "Обновление dashboard инициировано"
 *         401:
 *           description: Необходима авторизация
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/WebSocketError'
 * 
 *   /socket.io/events/ping:
 *     post:
 *       summary: Ping сервера
 *       description: Отправляет ping для проверки соединения
 *       tags: [WebSocket]
 *       requestBody:
 *         required: false
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PingRequest'
 *       responses:
 *         200:
 *           description: Pong ответ
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     example: "pong"
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *                     example: "2024-01-15T10:30:00.000Z"
 */

/**
 * @swagger
 * components:
 *   examples:
 *     # Примеры WebSocket событий
 *     DashboardUpdateExample:
 *       summary: Обновление dashboard
 *       value:
 *         type: "dashboard_update"
 *         data:
 *           robots:
 *             - id: "RB-001"
 *               status: "active"
 *               battery_level: 85
 *               current_zone: "A"
 *               current_row: 5
 *               current_shelf: 3
 *               last_update: "2024-01-15T10:30:00.000Z"
 *           recentScans:
 *             - time: "2024-01-15T10:30:00.000Z"
 *               robot_id: "RB-001"
 *               zone: "A"
 *               product_name: "Роутер RT-AC68U"
 *               product_id: "TEL-4567"
 *               quantity: 25
 *               status: "OK"
 *           statistics:
 *             activeRobots: 3
 *             totalRobots: 5
 *             scannedToday: 150
 *             criticalStock: 2
 *             avgBattery: 78
 *         timestamp: "2024-01-15T10:30:00.000Z"
 *     
 *     RobotUpdateExample:
 *       summary: Обновление робота
 *       value:
 *         type: "robot_update"
 *         data:
 *           id: "RB-001"
 *           status: "active"
 *           battery_level: 85
 *           current_zone: "A"
 *           current_row: 5
 *           current_shelf: 3
 *           last_update: "2024-01-15T10:30:00.000Z"
 *         timestamp: "2024-01-15T10:30:00.000Z"
 *     
 *     InventoryAlertExample:
 *       summary: Алерт о запасах
 *       value:
 *         type: "inventory_alert"
 *         data:
 *           product_id: "TEL-4567"
 *           product_name: "Роутер RT-AC68U"
 *           quantity: 5
 *           status: "CRITICAL"
 *           robot_id: "RB-001"
 *           zone: "A"
 *         timestamp: "2024-01-15T10:30:00.000Z"
 *     
 *     CriticalAlertExample:
 *       summary: Критический алерт
 *       value:
 *         type: "critical_alert"
 *         data:
 *           alert_type: "ROBOT_BATTERY_LOW"
 *           message: "Робот RB-001 имеет критически низкий уровень заряда батареи (5%)"
 *           severity: "HIGH"
 *           robot_id: "RB-001"
 *           requires_action: true
 *         timestamp: "2024-01-15T10:30:00.000Z"
 *     
 *     NotificationExample:
 *       summary: Системное уведомление
 *       value:
 *         type: "notification"
 *         data:
 *           title: "Системное уведомление"
 *           message: "Запланировано техническое обслуживание на 15:00"
 *           level: "info"
 *           duration: 5000
 *         timestamp: "2024-01-15T10:30:00.000Z"
 */

export default {};

