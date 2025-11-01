import express from 'express';
import { robotsService } from '../services/AllServices';
import { robotService } from '../sockets/websocket';
import notificationAnalyzerService from '../services/notificationAnalyzerService';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';
import { taskQueueService } from '../services/TaskQueueService';
import { getTransportMode } from '../services/TransportMode';
import { robotsRepository } from '../repositories/RobotsRepository';

const router = express.Router();

/**
 * @swagger
 * /api/robots/data:
 *   post:
 *     summary: Прием данных от роботов
 *     description: Принимает данные от роботов о сканировании инвентаря, местоположении и статусе
 *     tags: [Robots]
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RobotData'
 *           example:
 *             robot_id: "RB-001"
 *             status: "active"
 *             battery_level: 85
 *             location:
 *               zone: "A"
 *               row: 5
 *               shelf: 3
 *             scan_results:
 *               - product_id: "TEL-4567"
 *                 product_name: "Роутер RT-AC68U"
 *                 quantity: 25
 *                 status: "OK"
 *             timestamp: "2024-01-15T10:30:00.000Z"
 *     responses:
 *       200:
 *         description: Данные робота успешно обработаны
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 processed_scans:
 *                   type: integer
 *                   example: 3
 *                   description: Количество обработанных сканирований
 *                 message:
 *                   type: string
 *                   example: "Данные робота обработаны успешно"
 *             example:
 *               success: true
 *               processed_scans: 3
 *               message: "Данные робота обработаны успешно"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/data', async (req, res) => {
  try {
    if (getTransportMode() !== 'http') {
      return res.status(409).json({ success: false, error: 'Transport mode is socket. HTTP data disabled' });
    }
    const robotData = req.body;
    const result = await robotsService.processRobotData(robotData);
    
    // Отправляем уведомления через WebSocket
    if (robotService) {
      robotService.io.emit('robot_data_received', {
        robot_id: robotData.robot_id,
        processed_scans: result.processed_scans,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json(result);
  } catch (error: any) {
    console.error('❌ Robot data processing error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/robots:
 *   get:
 *     summary: Получить список всех роботов
 *     description: Возвращает информацию о всех роботах в системе
 *     tags: [Robots]
 *     responses:
 *       200:
 *         description: Список роботов успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 robots:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Robot'
 *             example:
 *               robots:
 *                 - id: "RB-001"
 *                   status: "active"
 *                   battery_level: 85
 *                   current_zone: "A"
 *                   current_row: 5
 *                   current_shelf: 3
 *                   last_update: "2024-01-15T10:30:00.000Z"
 *                 - id: "RB-002"
 *                   status: "charging"
 *                   battery_level: 15
 *                   current_zone: "B"
 *                   current_row: 10
 *                   current_shelf: 1
 *                   last_update: "2024-01-15T10:25:00.000Z"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/', async (req, res) => {
  try {
    const robots = await robotsService.getAllRobots();
    res.json({ robots });
  } catch (error: any) {
    console.error('❌ Get robots error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/robots/{id}/pause:
 *   post:
 *     summary: Поставить робота на паузу
 *     description: Временно останавливает работу робота. Робот переходит в статус 'paused'. Доступно для операторов и администраторов.
 *     tags: [Robots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "RB-001"
 *         description: ID робота
 *     responses:
 *       200:
 *         description: Робот успешно поставлен на паузу
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Robot RB-001 paused"
 *             example:
 *               success: true
 *               message: "Robot RB-001 paused"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Пауза робота (оператор/админ)
router.post('/:id/pause', authenticateToken, requireRole(['operator', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const robot = await robotsRepository.updateRobotStatus(id, 'paused');
    robotService.io.emit('robot_command', { type: 'pause', robotId: id, timestamp: new Date().toISOString() });
    // Команда паузы передается по сокету; не добавляем её в очередь задач
    console.log(`[PAUSE] Текущий статус робота после паузы:`, robot);
    // Больше не переносим автоматически задачи при паузе — сохраняем очередь у этого робота
    res.json({ success: true, message: `Robot ${id} paused` });
  } catch (error: any) {
    console.error('❌ Pause robot error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/robots/{id}/resume:
 *   post:
 *     summary: Возобновить работу робота
 *     description: Возобновляет работу робота после паузы. Робот переходит в статус 'active'. Доступно для операторов и администраторов.
 *     tags: [Robots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "RB-001"
 *         description: ID робота
 *     responses:
 *       200:
 *         description: Робот успешно возобновлен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Robot RB-001 resumed"
 *             example:
 *               success: true
 *               message: "Robot RB-001 resumed"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Возобновление робота (оператор/админ)
router.post('/:id/resume', authenticateToken, requireRole(['operator', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const robot = await robotsRepository.updateRobotStatus(id, 'active');
    robotService.io.emit('robot_command', { type: 'resume', robotId: id, timestamp: new Date().toISOString() });
    // Команда продолжения передается по сокету; не добавляем её в очередь задач
    console.log(`[RESUME] Текущий статус робота после продолжения:`, robot);
    res.json({ success: true, message: `Robot ${id} resumed` });
  } catch (error: any) {
    console.error('❌ Resume robot error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/robots/{id}/rescan:
 *   post:
 *     summary: Пересканировать зону или ячейку
 *     description: Отправляет команду роботу на повторное сканирование указанной зоны, ряда и полки. Доступно для операторов и администраторов.
 *     tags: [Robots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "RB-001"
 *         description: ID робота
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               zone:
 *                 type: string
 *                 pattern: '^[A-E]$'
 *                 example: "A"
 *                 description: Зона для пересканирования
 *               row:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 20
 *                 example: 5
 *                 description: Ряд для пересканирования
 *               shelf:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *                 example: 3
 *                 description: Полка для пересканирования
 *           example:
 *             zone: "A"
 *             row: 5
 *             shelf: 3
 *     responses:
 *       200:
 *         description: Команда пересканирования отправлена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Robot RB-001 requested to rescan"
 *                 target:
 *                   type: object
 *                   properties:
 *                     zone:
 *                       type: string
 *                       example: "A"
 *                     row:
 *                       type: integer
 *                       example: 5
 *                     shelf:
 *                       type: integer
 *                       example: 3
 *             example:
 *               success: true
 *               message: "Robot RB-001 requested to rescan"
 *               target:
 *                 zone: "A"
 *                 row: 5
 *                 shelf: 3
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Пересканировать зону или ячейку (оператор/админ)
router.post('/:id/rescan', authenticateToken, requireRole(['operator', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { zone, row, shelf } = req.body || {};
    robotService.io.emit('robot_command', { type: 'rescan', robotId: id, zone, row, shelf, timestamp: new Date().toISOString() });
    res.json({ success: true, message: `Robot ${id} requested to rescan`, target: { zone, row, shelf } });
  } catch (error: any) {
    console.error('❌ Rescan command error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/robots/{id}/tasks/assign:
 *   post:
 *     summary: Назначить задачу роботу
 *     description: Добавляет новую задачу в очередь робота. Доступно для операторов и администраторов.
 *     tags: [Robots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "RB-001"
 *         description: ID робота
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [taskId]
 *             properties:
 *               taskId:
 *                 type: string
 *                 example: "TASK-001"
 *                 description: Идентификатор задачи
 *               priority:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *                 example: 1
 *                 description: Приоритет задачи (1 - высший, 10 - низший)
 *               payload:
 *                 type: object
 *                 example:
 *                   zone: "A"
 *                   row: 5
 *                   shelf: 3
 *                 description: Дополнительные данные задачи
 *           example:
 *             taskId: "TASK-001"
 *             priority: 1
 *             payload:
 *               zone: "A"
 *               row: 5
 *               shelf: 3
 *     responses:
 *       200:
 *         description: Задача успешно назначена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *             example:
 *               success: true
 *       400:
 *         description: Ошибка валидации
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "taskId required"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Назначить задачу роботу
router.post('/:id/tasks/assign', authenticateToken, requireRole(['operator', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { taskId, priority, payload } = req.body || {};
    if (!taskId) return res.status(400).json({ error: 'taskId required' });
    taskQueueService.enqueue(id, { id: String(taskId), priority, payload });
    robotService.io.emit('task_assigned', { robotId: id, taskId, priority, timestamp: new Date().toISOString() });
    // Новое: обновить очереди задач для всех подписчиков
    robotService.io.emit('robot_tasks_update', await getAllRobotTasks());
    res.json({ success: true });
  } catch (error: any) {
    console.error('❌ Assign task error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/robots/{id}/tasks/next:
 *   get:
 *     summary: Получить следующую задачу робота (для эмулятора)
 *     description: Возвращает и удаляет из очереди следующую задачу для робота. Используется эмулятором робота для получения задач. Не требует аутентификации.
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "RB-001"
 *         description: ID робота
 *     responses:
 *       200:
 *         description: Задача успешно получена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 task:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "TASK-001"
 *                     priority:
 *                       type: integer
 *                       example: 1
 *                     payload:
 *                       type: object
 *                       example:
 *                         zone: "A"
 *                         row: 5
 *                         shelf: 3
 *             example:
 *               success: true
 *               task:
 *                 id: "TASK-001"
 *                 priority: 1
 *                 payload:
 *                   zone: "A"
 *                   row: 5
 *                   shelf: 3
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Получить следующую задачу робота (эмулятор будет опрашивать)
router.get('/:id/tasks/next', async (req, res) => {
  try {
    const { id } = req.params;
    const task = taskQueueService.dequeue(id);
    if (!task) return res.json({ success: true, task: null });
    res.json({ success: true, task });
  } catch (error: any) {
    console.error('❌ Next task error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/robots/{id}/tasks:
 *   get:
 *     summary: Получить список задач робота
 *     description: Возвращает все задачи в очереди указанного робота. Доступно для операторов и администраторов.
 *     tags: [Robots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "RB-001"
 *         description: ID робота
 *     responses:
 *       200:
 *         description: Список задач успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "TASK-001"
 *                       priority:
 *                         type: integer
 *                         example: 1
 *                       payload:
 *                         type: object
 *             example:
 *               success: true
 *               data:
 *                 - id: "TASK-001"
 *                   priority: 1
 *                   payload:
 *                     zone: "A"
 *                     row: 5
 *                     shelf: 3
 *                 - id: "TASK-002"
 *                   priority: 2
 *                   payload:
 *                     zone: "B"
 *                     row: 10
 *                     shelf: 1
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Получить список задач для робота
router.get('/:id/tasks', authenticateToken, requireRole(['operator','admin']), (req, res) => {
  try {
    const { id } = req.params;
    const list = taskQueueService.getTasks(id);
    res.json({ success: true, data: list });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * @swagger
 * /api/robots/{id}/tasks/peek:
 *   get:
 *     summary: Просмотреть очередь задач робота (без удаления)
 *     description: Возвращает все задачи в очереди робота без их удаления. Используется для просмотра очереди без изменения. Не требует аутентификации.
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "RB-001"
 *         description: ID робота
 *     responses:
 *       200:
 *         description: Очередь задач успешно получена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 tasks:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "TASK-001"
 *                       priority:
 *                         type: integer
 *                         example: 1
 *                       payload:
 *                         type: object
 *             example:
 *               success: true
 *               tasks:
 *                 - id: "TASK-001"
 *                   priority: 1
 *                   payload:
 *                     zone: "A"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Получить ВСЮ очередь задач для робота (НЕ удалять из очереди, только READ)
router.get('/:id/tasks/peek', async (req, res) => {
  try {
    const { id } = req.params;
    const tasks = taskQueueService.getTasks(id);
    res.json({ success: true, tasks });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * @swagger
 * /api/robots/tasks:
 *   get:
 *     summary: Получить задачи всех роботов
 *     description: Возвращает очереди задач для всех роботов в системе. Доступно для операторов и администраторов.
 *     tags: [Robots]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список задач всех роботов успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       robotId:
 *                         type: string
 *                         example: "RB-001"
 *                       tasks:
 *                         type: array
 *                         items:
 *                           type: object
 *             example:
 *               success: true
 *               data:
 *                 - robotId: "RB-001"
 *                   tasks:
 *                     - id: "TASK-001"
 *                       priority: 1
 *                 - robotId: "RB-002"
 *                   tasks:
 *                     - id: "TASK-002"
 *                       priority: 2
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Получить список задач по всем роботам
router.get('/tasks', authenticateToken, requireRole(['operator','admin']), async (req, res) => {
  try {
    // В простом варианте соберём роботов и подтянем списки задач
    const robots = await robotsService.getAllRobots();
    const data = (robots || []).map((r: any) => ({ robotId: r.id, tasks: taskQueueService.getTasks(r.id) }));
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * @swagger
 * /api/robots/tasks/reassign:
 *   post:
 *     summary: Переназначить задачи между роботами
 *     description: Перемещает все задачи от одного робота к другому. Доступно для операторов и администраторов.
 *     tags: [Robots]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [from, to]
 *             properties:
 *               from:
 *                 type: string
 *                 example: "RB-001"
 *                 description: ID робота-источника
 *               to:
 *                 type: string
 *                 example: "RB-002"
 *                 description: ID робота-получателя
 *           example:
 *             from: "RB-001"
 *             to: "RB-002"
 *     responses:
 *       200:
 *         description: Задачи успешно переназначены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *             example:
 *               success: true
 *       400:
 *         description: Ошибка валидации
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "from/to robot ids required"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Ручное переназначение задач между роботами
router.post('/tasks/reassign', authenticateToken, requireRole(['operator','admin']), async (req, res) => {
  try {
    const { from, to } = req.body;
    if (!from || !to) return res.status(400).json({ error: 'from/to robot ids required' });
    await taskQueueService.moveTasks(from, to);
    robotService.io.emit('task_reassigned', { from, to, timestamp: new Date().toISOString() });
    // Новое: обновить очереди задач для всех подписчиков
    robotService.io.emit('robot_tasks_update', await getAllRobotTasks());
    res.json({ success: true });
  } catch (error: any) {
    console.error('❌ Move tasks error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/robots/tasks/delete:
 *   post:
 *     summary: Удалить задачу из очереди робота
 *     description: Удаляет задачу по индексу из очереди указанного робота. Доступно для операторов и администраторов.
 *     tags: [Robots]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [robotId, idx]
 *             properties:
 *               robotId:
 *                 type: string
 *                 example: "RB-001"
 *                 description: ID робота
 *               idx:
 *                 type: integer
 *                 minimum: 0
 *                 example: 1
 *                 description: Индекс задачи в очереди (начинается с 0)
 *           example:
 *             robotId: "RB-001"
 *             idx: 1
 *     responses:
 *       200:
 *         description: Задача успешно удалена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *             example:
 *               success: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Удалить задачу из очереди по индексу
router.post('/tasks/delete', authenticateToken, requireRole(['operator', 'admin']), async (req, res) => {
  try {
    const { robotId, idx } = req.body;
    const tasks = taskQueueService.getTasks(robotId);
    if (typeof idx === 'number' && idx >= 0 && idx < tasks.length) {
      tasks.splice(idx, 1);
      taskQueueService['robotTasks'].set(robotId, tasks);
      console.log(`[DELETE TASK] robot=${robotId} удалена задача по индексу ${idx}`);
      try {
        // Обновить очереди задач для всех подписчиков
        robotService.io.emit('robot_tasks_update', await getAllRobotTasks());
      } catch (e) {
        console.warn('robot_tasks_update emit failed after delete', e);
      }
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});
/**
 * @swagger
 * /api/robots/tasks/reorder:
 *   post:
 *     summary: Изменить порядок задач в очереди робота
 *     description: Позволяет изменить порядок задач в очереди робота (например, через drag-and-drop). Доступно для операторов и администраторов.
 *     tags: [Robots]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [robotId, tasks]
 *             properties:
 *               robotId:
 *                 type: string
 *                 example: "RB-001"
 *                 description: ID робота
 *               tasks:
 *                 type: array
 *                 description: Массив задач в новом порядке
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "TASK-001"
 *                     priority:
 *                       type: integer
 *                       example: 1
 *                     payload:
 *                       type: object
 *           example:
 *             robotId: "RB-001"
 *             tasks:
 *               - id: "TASK-002"
 *                 priority: 1
 *                 payload:
 *                   zone: "B"
 *               - id: "TASK-001"
 *                 priority: 2
 *                 payload:
 *                   zone: "A"
 *     responses:
 *       200:
 *         description: Порядок задач успешно изменен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *             example:
 *               success: true
 *       400:
 *         description: Ошибка валидации
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "tasks должен быть массивом"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Переустановить очередь (drag&drop)
router.post('/tasks/reorder', authenticateToken, requireRole(['operator','admin']), async (req, res) => {
  try {
    const { robotId, tasks } = req.body;
    if (!Array.isArray(tasks)) return res.status(400).json({ success: false, error: 'tasks должен быть массивом' });
    taskQueueService['robotTasks'].set(robotId, tasks);
    console.log(`[REORDER TASKS] robot=${robotId} новый порядок задач:`, tasks.map(t => t.id));
    try {
      // Обновить очереди задач для всех подписчиков
      robotService.io.emit('robot_tasks_update', await getAllRobotTasks());
    } catch (e) {
      console.warn('robot_tasks_update emit failed after reorder', e);
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * @swagger
 * /api/robots/stats:
 *   get:
 *     summary: Получить статистику роботов
 *     description: Возвращает статистическую информацию о роботах - количество активных, средний уровень батареи и т.д.
 *     tags: [Robots]
 *     responses:
 *       200:
 *         description: Статистика роботов успешно получена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_robots:
 *                   type: integer
 *                   example: 5
 *                   description: Общее количество роботов
 *                 active_robots:
 *                   type: integer
 *                   example: 3
 *                   description: Количество активных роботов
 *                 charging_robots:
 *                   type: integer
 *                   example: 1
 *                   description: Количество роботов на зарядке
 *                 offline_robots:
 *                   type: integer
 *                   example: 1
 *                   description: Количество офлайн роботов
 *                 avg_battery_level:
 *                   type: number
 *                   example: 78.5
 *                   description: Средний уровень заряда батареи
 *                 low_battery_robots:
 *                   type: integer
 *                   example: 2
 *                   description: Количество роботов с низким зарядом батареи
 *             example:
 *               total_robots: 5
 *               active_robots: 3
 *               charging_robots: 1
 *               offline_robots: 1
 *               avg_battery_level: 78.5
 *               low_battery_robots: 2
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await robotsService.getRobotsStats();
    res.json(stats);
  } catch (error: any) {
    console.error('❌ Get robots stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

const getAllRobotTasks = async () => {
  // Заменяем на выборку по всем текущим роботам
  const robotIds = Array.from(taskQueueService['robotTasks'].keys());
  return robotIds.map(robotId => ({ robotId, tasks: taskQueueService.getTasks(robotId) }));
};

export default router;