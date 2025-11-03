import express from 'express'
import { authenticateToken, requireRole } from '../middleware/authMiddleware'
import { taskQueueService } from '../services/TaskQueueService'
import { getTransportMode, setTransportMode } from '../services/TransportMode'
import { robotService } from '../sockets/websocket'
import { adminService } from '../services/AdminService'

const router = express.Router()

/**
 * @swagger
 * /api/admin/products/limits:
 *   get:
 *     summary: Получить лимиты товаров
 *     description: Возвращает минимальные и оптимальные уровни запаса для всех товаров. Доступно только для администраторов.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Лимиты товаров успешно получены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 products:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       product_id:
 *                         type: string
 *                         example: "TEL-4567"
 *                       product_name:
 *                         type: string
 *                         example: "Роутер RT-AC68U"
 *                       min_stock:
 *                         type: integer
 *                         example: 10
 *                       optimal_stock:
 *                         type: integer
 *                         example: 50
 *                 thresholds:
 *                   type: object
 *                   properties:
 *                     critical:
 *                       type: integer
 *                       example: 5
 *                     low_stock:
 *                       type: integer
 *                       example: 15
 *                     warning:
 *                       type: integer
 *                       example: 25
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Управление товарными лимитами
router.get('/products/limits', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const result = await adminService.getProductLimits();
    res.json({ 
      success: true, 
      products: result.products,
      thresholds: result.thresholds
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/products/{id}/limits:
 *   put:
 *     summary: Обновить лимиты товара
 *     description: Обновляет минимальный и оптимальный уровни запаса для конкретного товара. Доступно только для администраторов.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
 *         example: "TEL-4567"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - min_stock
 *               - optimal_stock
 *             properties:
 *               min_stock:
 *                 type: integer
 *                 minimum: 0
 *                 description: Минимальный уровень запаса
 *                 example: 10
 *               optimal_stock:
 *                 type: integer
 *                 minimum: 0
 *                 description: Оптимальный уровень запаса (должен быть >= min_stock)
 *                 example: 50
 *     responses:
 *       200:
 *         description: Лимиты товара успешно обновлены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Неверные параметры (optimal_stock < min_stock)
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put('/products/:id/limits', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { min_stock, optimal_stock } = req.body;
    
    await adminService.updateProductLimits(id, min_stock, optimal_stock);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/products/thresholds:
 *   put:
 *     summary: Обновить пороговые значения статусов
 *     description: Обновляет пороговые значения для статусов CRITICAL, LOW_STOCK и WARNING. Доступно только для администраторов.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               critical:
 *                 type: integer
 *                 minimum: 0
 *                 description: Порог для статуса CRITICAL
 *                 example: 5
 *               low_stock:
 *                 type: integer
 *                 minimum: 0
 *                 description: Порог для статуса LOW_STOCK
 *                 example: 15
 *               warning:
 *                 type: integer
 *                 minimum: 0
 *                 description: Порог для статуса WARNING
 *                 example: 25
 *     responses:
 *       200:
 *         description: Пороговые значения успешно обновлены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put('/products/thresholds', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { critical, low_stock, warning } = req.body;
    
    await adminService.updateThresholds({ critical, low_stock, warning });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/robots:
 *   get:
 *     summary: Получить список всех роботов
 *     description: Возвращает список всех роботов в системе с их статусами. Доступно только для администраторов.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список роботов успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 robots:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "RB-001"
 *                       name:
 *                         type: string
 *                         example: "Робот-сканер #1"
 *                       status:
 *                         type: string
 *                         enum: [active, paused, charging, offline]
 *                         example: "active"
 *                       battery_level:
 *                         type: integer
 *                         minimum: 0
 *                         maximum: 100
 *                         example: 85
 *                       current_zone:
 *                         type: string
 *                         example: "A"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Управление роботами
router.get('/robots', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const robots = await adminService.getRobots();
    res.json({ success: true, robots });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/robots:
 *   post:
 *     summary: Создать нового робота
 *     description: Создает нового робота в системе. Доступно только для администраторов.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: string
 *                 description: Уникальный ID робота
 *                 example: "RB-006"
 *               name:
 *                 type: string
 *                 description: Имя робота
 *                 example: "Робот-сканер #6"
 *               zone:
 *                 type: string
 *                 enum: [A, B, C, D, E]
 *                 description: Начальная зона робота
 *                 example: "A"
 *     responses:
 *       200:
 *         description: Робот успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Робот с таким ID уже существует
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/robots', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id, name, zone } = req.body;
    await adminService.createRobot(id, name, zone);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/robots/{id}:
 *   delete:
 *     summary: Удалить робота
 *     description: Удаляет робота из системы. Доступно только для администраторов.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID робота для удаления
 *         example: "RB-006"
 *     responses:
 *       200:
 *         description: Робот успешно удален
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       404:
 *         description: Робот не найден
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/robots/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    await adminService.deleteRobot(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/robots/{id}/charge:
 *   post:
 *     summary: Отправить робота на принудительную зарядку
 *     description: Отправляет команду роботу на немедленную зарядку. Доступно только для администраторов.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID робота
 *         example: "RB-001"
 *     responses:
 *       200:
 *         description: Команда на зарядку отправлена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/robots/:id/charge', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    // Отправляем команду на зарядку через WebSocket
    if (robotService.io) {
      robotService.io.emit('robot:command', {
        robotId: id,
        command: 'charge',
        force: true,
      });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/robots/{id}/maintenance:
 *   post:
 *     summary: Запланировать техническое обслуживание робота
 *     description: Планирует техническое обслуживание для указанного робота на указанную дату. Доступно только для администраторов.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID робота
 *         example: "RB-001"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *             properties:
 *               date:
 *                 type: string
 *                 format: date-time
 *                 description: Дата и время технического обслуживания
 *                 example: "2024-01-20T14:00:00.000Z"
 *     responses:
 *       200:
 *         description: Техническое обслуживание запланировано
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Неверная дата
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/robots/:id/maintenance', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.body;
    await adminService.scheduleMaintenance(id, date);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Получить список всех пользователей
 *     description: Возвращает список всех пользователей системы с их ролями и статусами. Доступно только для администраторов.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список пользователей успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Иван Иванов"
 *                       email:
 *                         type: string
 *                         example: "ivan@example.com"
 *                       role:
 *                         type: string
 *                         enum: [admin, operator, viewer]
 *                         example: "operator"
 *                       blocked:
 *                         type: boolean
 *                         example: false
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-15T10:00:00.000Z"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Управление пользователями
router.get('/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const users = await adminService.getUsers();
    res.json({ success: true, users });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     summary: Создать нового пользователя
 *     description: Создает нового пользователя в системе. Доступно только для администраторов.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *                 description: Имя пользователя
 *                 example: "Петр Петров"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email пользователя
 *                 example: "petr@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 description: Пароль пользователя (минимум 6 символов)
 *                 example: "password123"
 *               role:
 *                 type: string
 *                 enum: [admin, operator, viewer]
 *                 description: Роль пользователя
 *                 example: "operator"
 *     responses:
 *       200:
 *         description: Пользователь успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 5
 *                     name:
 *                       type: string
 *                       example: "Петр Петров"
 *                     email:
 *                       type: string
 *                       example: "petr@example.com"
 *                     role:
 *                       type: string
 *                       example: "operator"
 *       400:
 *         description: Пользователь с таким email уже существует или неверные данные
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const user = await adminService.createUser({ name, email, password, role });
    res.json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}/role:
 *   put:
 *     summary: Изменить роль пользователя
 *     description: Обновляет роль указанного пользователя. Доступно только для администраторов.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID пользователя
 *         example: 5
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, operator, viewer]
 *                 description: Новая роль пользователя
 *                 example: "admin"
 *     responses:
 *       200:
 *         description: Роль пользователя успешно обновлена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       404:
 *         description: Пользователь не найден
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put('/users/:id/role', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    await adminService.updateUserRole(Number(id), role);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}/block:
 *   put:
 *     summary: Заблокировать/разблокировать пользователя
 *     description: Блокирует или разблокирует указанного пользователя. Доступно только для администраторов.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID пользователя
 *         example: 5
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - blocked
 *             properties:
 *               blocked:
 *                 type: boolean
 *                 description: true - заблокировать, false - разблокировать
 *                 example: true
 *     responses:
 *       200:
 *         description: Статус блокировки пользователя успешно обновлен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       404:
 *         description: Пользователь не найден
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put('/users/:id/block', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { blocked } = req.body;
    await adminService.toggleUserBlock(Number(id), blocked);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/logs:
 *   get:
 *     summary: Получить системные логи администратора
 *     description: Возвращает логи системы управления роботами и задачами. Доступно только для администраторов.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Логи успешно получены
 */
router.get('/logs', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    // Temporary fix until getLogs method is implemented
    const logs: any[] = []; // taskQueueService.getLogs();
    res.json({ success: true, data: logs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/transport-mode:
 *   get:
 *     summary: Получить режим транспорта
 *     description: Возвращает текущий режим транспорта для коммуникации с роботами (WebSocket или HTTP). Доступно только для администраторов.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Режим транспорта успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 mode:
 *                   type: string
 *                   enum: [websocket, http]
 *                   description: Текущий режим транспорта
 *                   example: "websocket"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/transport-mode', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const mode = getTransportMode();
    res.json({ success: true, mode });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/transport-mode:
 *   post:
 *     summary: Установить режим транспорта
 *     description: Устанавливает режим транспорта для коммуникации с роботами (WebSocket или HTTP). Доступно только для администраторов.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mode
 *             properties:
 *               mode:
 *                 type: string
 *                 enum: [websocket, http]
 *                 description: Режим транспорта для установки
 *                 example: "websocket"
 *     responses:
 *       200:
 *         description: Режим транспорта успешно установлен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 mode:
 *                   type: string
 *                   example: "websocket"
 *       400:
 *         description: Неверный режим транспорта
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/transport-mode', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { mode } = req.body;
    setTransportMode(mode);
    res.json({ success: true, mode });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;