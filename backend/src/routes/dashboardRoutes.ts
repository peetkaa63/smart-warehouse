import express from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';
import { robotService } from '../sockets/websocket';
import { inventoryRepository } from '../repositories/InventoryRepository';

const router = express.Router();

/**
 * @swagger
 * /api/dashboard/current:
 *   get:
 *     summary: Получить текущие данные dashboard
 *     description: Возвращает актуальные данные для главной панели управления - роботы, последние сканирования и статистику
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Данные dashboard успешно получены
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardData'
 *             example:
 *               robots:
 *                 - id: "RB-001"
 *                   status: "active"
 *                   battery_level: 85
 *                   current_zone: "A"
 *                   current_row: 5
 *                   current_shelf: 3
 *                   last_update: "2024-01-15T10:30:00.000Z"
 *               recentScans:
 *                 - time: "2024-01-15T10:30:00.000Z"
 *                   robot_id: "RB-001"
 *                   zone: "A"
 *                   product_name: "Роутер RT-AC68U"
 *                   product_id: "TEL-4567"
 *                   quantity: 25
 *                   status: "OK"
 *               statistics:
 *                 activeRobots: 3
 *                 totalRobots: 5
 *                 scannedToday: 150
 *                 criticalStock: 2
 *                 avgBattery: 78
 *               timestamp: "2024-01-15T10:30:00.000Z"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/current', authenticateToken, async (req, res) => {
  try {
    console.log('📊 Fetching dashboard data for user:', (req as any).user.email);
    
    const [robots, recentScans, statistics] = await Promise.all([
      robotService.getCurrentRobots(),
      robotService.getRecentScans(),
      robotService.getDashboardStats()
    ]);

    res.json({
      robots,
      recentScans,
      statistics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

/**
 * @swagger
 * /api/dashboard/refresh:
 *   post:
 *     summary: Обновить данные dashboard
 *     description: Принудительно обновляет данные dashboard и отправляет их всем подключенным клиентам через WebSocket. Доступно для операторов и администраторов.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Обновление dashboard инициировано
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Dashboard refresh initiated"
 *             example:
 *               message: "Dashboard refresh initiated"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *         description: Доступ запрещен (требуется роль operator или admin)
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/refresh', authenticateToken, requireRole(['operator', 'admin']), async (req, res) => {
  try {
    await robotService.broadcastDashboardUpdate();
    res.json({ message: 'Dashboard refresh initiated' });
  } catch (error) {
    console.error('Error refreshing dashboard:', error);
    res.status(500).json({ error: 'Failed to refresh dashboard' });
  }
});

export default router;

// Дополнительно: предложения по пополнению (простая эвристика)
export const replenishmentRouter = express.Router();

replenishmentRouter.get('/suggestions', authenticateToken, async (req, res) => {
  try {
    const low = await inventoryRepository.getLowStockSuggestions(5);
    const surplus = await inventoryRepository.getSurplusSuggestions(5);
    res.json({ success: true, data: { low, surplus } });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});