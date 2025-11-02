// routes/advancedAnalyticsRoutes.ts
import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { advancedAnalyticsServiceNew as advancedAnalyticsService } from '../services/AllServices';

const router = express.Router();

/**
 * @swagger
 * /api/advancedAnalytics/trends:
 *   get:
 *     summary: Получить расширенные данные трендов
 *     description: Возвращает расширенные данные для графиков трендов по товарам за указанный период
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period_days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Количество дней для анализа трендов
 *       - in: query
 *         name: product_ids
 *         schema:
 *           type: string
 *         description: Список ID товаров через запятую (например: "PROD-001,PROD-002")
 *     responses:
 *       200:
 *         description: Данные трендов успешно получены
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
 *             example:
 *               success: true
 *               data: []
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/trends', authenticateToken, async (req, res) => {
  try {
    const { period_days = 30, product_ids } = req.query;

    let productIds: string[] = [];
    if (typeof product_ids === 'string' && product_ids) {
      productIds = product_ids.split(',');
    }

    const result = await advancedAnalyticsService.getEnhancedTrends(productIds, parseInt(period_days as string));
    res.json(result);
  } catch (error: any) {
    console.error('Advanced analytics trends error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/advancedAnalytics/efficiency:
 *   get:
 *     summary: Получить данные об эффективности роботов
 *     description: Возвращает аналитику по эффективности работы роботов за указанный период
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period_days
 *         schema:
 *           type: integer
 *           default: 7
 *         description: Количество дней для анализа эффективности
 *     responses:
 *       200:
 *         description: Данные об эффективности успешно получены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Данные об эффективности роботов
 *             example:
 *               success: true
 *               data: {}
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/efficiency', authenticateToken, async (req, res) => {
  try {
    const { period_days = 7 } = req.query;
    const result = await advancedAnalyticsService.getEfficiencyData(parseInt(period_days as string));
    res.json(result);
  } catch (error: any) {
    console.error('Advanced analytics efficiency error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/advancedAnalytics/ai-insights:
 *   get:
 *     summary: Получить AI инсайты и рекомендации
 *     description: Возвращает рекомендации и анализ от AI на основе текущего состояния склада, роботов и статистики
 *     tags: [Analytics, AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: AI инсайты успешно получены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       category:
 *                         type: string
 *                         enum: [INVENTORY, ROBOTS, PROCESS]
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       priority:
 *                         type: string
 *                         enum: [HIGH, MEDIUM, LOW]
 *                       expected_impact:
 *                         type: string
 *                 risks:
 *                   type: array
 *                   items:
 *                     type: object
 *                 summary:
 *                   type: string
 *             example:
 *               recommendations: []
 *               risks: []
 *               summary: "Анализ склада выполнен"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/ai-insights', authenticateToken, async (req, res) => {
  try {
    const result = await advancedAnalyticsService.getAIInsights();
    res.json(result);
  } catch (error: any) {
    console.error('Advanced analytics AI insights error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/advancedAnalytics/notifications:
 *   get:
 *     summary: Получить уведомления
 *     description: Возвращает список уведомлений системы для аналитики (низкий запас, критические статусы и т.д.)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Максимальное количество уведомлений для возврата
 *     responses:
 *       200:
 *         description: Уведомления успешно получены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       type:
 *                         type: string
 *                       message:
 *                         type: string
 *                       severity:
 *                         type: string
 *                         enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *             example:
 *               notifications: []
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const result = await advancedAnalyticsService.getNotifications(parseInt(limit as string));
    res.json(result);
  } catch (error: any) {
    console.error('Advanced analytics notifications error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;