import express from 'express';
import { robotsService } from '../services/AllServices';
import { robotService } from '../sockets/websocket';
import notificationAnalyzerService from '../services/notificationAnalyzerService';
import { pool } from '../config/database';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';
import { taskQueueService } from '../services/TaskQueueService';
import { getTransportMode } from '../services/TransportMode';

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

// Пауза робота (оператор/админ)
router.post('/:id/pause', authenticateToken, requireRole(['operator', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`UPDATE robots SET status = 'paused', last_update = NOW() WHERE id = $1`, [id]);
    robotService.io.emit('robot_command', { type: 'pause', robotId: id, timestamp: new Date().toISOString() });
    // Добавлено: ставим задачу паузы для эмулятора
    taskQueueService.enqueue(id, { id: 'pause' });
    // Переназначение задач на другого активного робота с наибольшим зарядом
    const candidates = await pool.query(`SELECT id FROM robots WHERE status = 'active' ORDER BY battery_level DESC LIMIT 1`);
    const target = candidates.rows?.[0]?.id;
    if (target) {
      taskQueueService.moveTasks(id, target);
      robotService.io.emit('task_reassigned', { from: id, to: target, timestamp: new Date().toISOString() });
    }
    res.json({ success: true, message: `Robot ${id} paused` });
  } catch (error: any) {
    console.error('❌ Pause robot error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Возобновление робота (оператор/админ)
router.post('/:id/resume', authenticateToken, requireRole(['operator', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`UPDATE robots SET status = 'active', last_update = NOW() WHERE id = $1`, [id]);
    robotService.io.emit('robot_command', { type: 'resume', robotId: id, timestamp: new Date().toISOString() });
    // Добавлено: ставим задачу resume для эмулятора
    taskQueueService.enqueue(id, { id: 'resume' });
    res.json({ success: true, message: `Robot ${id} resumed` });
  } catch (error: any) {
    console.error('❌ Resume robot error:', error);
    res.status(500).json({ error: error.message });
  }
});

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

// Получить ВСЮ очередь задач для робота (НЕ удалять из очереди, только READ)
router.get('/:id/tasks/peek', authenticateToken, requireRole(['operator','admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const tasks = taskQueueService.getTasks(id);
    res.json({ success: true, tasks });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

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