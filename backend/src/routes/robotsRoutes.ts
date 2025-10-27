import express from 'express';
import { robotsService } from '../services/AllServices';
import { robotService } from '../sockets/websocket';
import notificationAnalyzerService from '../services/notificationAnalyzerService';

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

export default router;