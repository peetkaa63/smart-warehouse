import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { historyService } from '../services/HistoryService';

const router = express.Router();

/**
 * @swagger
 * /api/history:
 *   get:
 *     summary: Получить историю сканирований
 *     description: Возвращает исторические данные сканирований инвентаря с возможностью фильтрации. Доступно для всех авторизованных пользователей.
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Начальная дата для фильтрации
 *         example: "2024-01-01T00:00:00.000Z"
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Конечная дата для фильтрации
 *         example: "2024-01-15T23:59:59.999Z"
 *       - in: query
 *         name: zone
 *         schema:
 *           type: string
 *           pattern: '^[A-E]$'
 *         description: Фильтр по зоне
 *         example: "A"
 *       - in: query
 *         name: product_id
 *         schema:
 *           type: string
 *         description: Фильтр по ID товара
 *         example: "TEL-4567"
 *       - in: query
 *         name: robot_id
 *         schema:
 *           type: string
 *         description: Фильтр по ID робота
 *         example: "RB-001"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Номер страницы
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Количество записей на странице
 *         example: 20
 *     responses:
 *       200:
 *         description: История сканирований успешно получена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       scanned_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-15T10:30:00.000Z"
 *                       robot_id:
 *                         type: string
 *                         example: "RB-001"
 *                       product_id:
 *                         type: string
 *                         example: "TEL-4567"
 *                       product_name:
 *                         type: string
 *                         example: "Роутер RT-AC68U"
 *                       quantity:
 *                         type: integer
 *                         example: 25
 *                       status:
 *                         type: string
 *                         enum: [OK, LOW_STOCK, CRITICAL]
 *                         example: "OK"
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 150
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// GET /api/history - получение исторических данных с фильтрами
router.get('/', authenticateToken, async (req, res) => {
  try {
    const filters: any = { ...req.query };
    
    console.log('📥 Raw query params:', req.query);
    
    // Обработка массивов зон
    // Express автоматически парсит повторяющиеся параметры как массив или строку
    if (filters.zone) {
      if (Array.isArray(filters.zone)) {
        // Уже массив - оставляем как есть
        filters.zone = filters.zone.filter((z: any) => z && typeof z === 'string' && z.trim() !== '');
      } else if (typeof filters.zone === 'string') {
        // Если строка с запятыми - разбиваем
        if (filters.zone.includes(',')) {
          filters.zone = filters.zone.split(',').map((z: string) => z.trim()).filter((z: string) => z !== '');
        } else {
          // Одна зона - оставляем как строку, репозиторий обработает
          filters.zone = filters.zone.trim();
        }
      }
    }
    
    // Обработка массивов статусов
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        // Уже массив - оставляем как есть
        filters.status = filters.status.filter((s: any) => s && typeof s === 'string' && s.trim() !== '');
      } else if (typeof filters.status === 'string') {
        // Если строка с запятыми - разбиваем
        if (filters.status.includes(',')) {
          filters.status = filters.status.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '');
        } else {
          // Один статус - оставляем как строку, репозиторий обработает
          filters.status = filters.status.trim();
        }
      }
    }
    
    console.log('🔍 History filters processed:', JSON.stringify(filters, null, 2));
    
    const result = await historyService.getHistory(filters);
    res.json(result);
  } catch (error: any) {
    console.error('❌ Error fetching history:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/history/stats:
 *   get:
 *     summary: Получить статистику за период
 *     description: Возвращает статистическую информацию по истории сканирований за указанный период. Доступно для всех авторизованных пользователей.
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Начальная дата для статистики
 *         example: "2024-01-01T00:00:00.000Z"
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Конечная дата для статистики
 *         example: "2024-01-15T23:59:59.999Z"
 *     responses:
 *       200:
 *         description: Статистика успешно получена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalScans:
 *                   type: integer
 *                   example: 1500
 *                   description: Общее количество сканирований
 *                 uniqueProducts:
 *                   type: integer
 *                   example: 120
 *                   description: Количество уникальных товаров
 *                 discrepancies:
 *                   type: integer
 *                   example: 5
 *                   description: Количество расхождений
 *                 avgZoneTime:
 *                   type: number
 *                   example: 45.5
 *                   description: Среднее время сканирования зоны (минуты)
 *             example:
 *               totalScans: 1500
 *               uniqueProducts: 120
 *               discrepancies: 5
 *               avgZoneTime: 45.5
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// GET /api/history/stats - статистика за период (СОГЛАСНО ТЗ)
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { from, to } = req.query;
    const stats = await historyService.getStats({ 
      from: from as string, 
      to: to as string 
    });
    res.json(stats);
  } catch (error: any) {
    console.error('❌ Error fetching history stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;