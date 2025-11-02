// routes/analyticsRoutes.ts
import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { analyticsService } from '../services/HistoryService';

const router = express.Router();

/**
 * @swagger
 * /api/analytics/trend:
 *   get:
 *     summary: Получить данные трендов для графиков
 *     description: Возвращает данные для построения графиков трендов по указанным товарам за указанный период. Доступно для всех авторизованных пользователей.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: product_ids
 *         schema:
 *           type: string
 *         description: Список ID товаров через запятую
 *         example: "TEL-4567,TEL-4568"
 *       - in: query
 *         name: period_days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 7
 *         description: Период для анализа в днях
 *         example: 30
 *     responses:
 *       200:
 *         description: Данные трендов успешно получены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 products:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// GET /api/analytics/trend - получение данных для графика трендов
router.get('/trend', authenticateToken, async (req, res) => {
  try {
    const { product_ids, period_days = 7 } = req.query;

    let productIds: string[] = [];
    if (typeof product_ids === 'string') {
      productIds = product_ids.split(',');
    }

    const result = await analyticsService.getTrendData(productIds, parseInt(period_days as string));
    res.json(result);
  } catch (error: any) {
    console.error('Analytics trend error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/analytics/products:
 *   get:
 *     summary: Получить список товаров для аналитики
 *     description: Возвращает список товаров с возможностью поиска для использования в аналитике. Доступно для всех авторизованных пользователей.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Поисковый запрос для фильтрации товаров
 *         example: "роутер"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Максимальное количество товаров для возврата
 *         example: 50
 *     responses:
 *       200:
 *         description: Список товаров успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// GET /api/analytics/products - получение списка товаров для выбора
router.get('/products', authenticateToken, async (req, res) => {
  try {
    const { search, limit = 50 } = req.query;
    const result = await analyticsService.getProducts(search as string, parseInt(limit as string));
    res.json(result);
  } catch (error: any) {
    console.error('Analytics products error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/analytics/stats:
 *   get:
 *     summary: Получить статистику по товарам
 *     description: Возвращает статистическую информацию по указанным товарам за указанный период. Доступно для всех авторизованных пользователей.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: product_ids
 *         schema:
 *           type: string
 *         description: Список ID товаров через запятую
 *         example: "TEL-4567,TEL-4568"
 *       - in: query
 *         name: period_days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 7
 *         description: Период для анализа в днях
 *         example: 30
 *     responses:
 *       200:
 *         description: Статистика по товарам успешно получена
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// GET /api/analytics/stats - получение статистики по товарам
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { product_ids, period_days = 7 } = req.query;

    let productIds: string[] = [];
    if (typeof product_ids === 'string') {
      productIds = product_ids.split(',');
    }

    const result = await analyticsService.getProductStats(productIds, parseInt(period_days as string));
    res.json(result);
  } catch (error: any) {
    console.error('Analytics stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/analytics/product-stats:
 *   get:
 *     summary: Получить детальную статистику по товарам
 *     description: Возвращает детальную статистическую информацию по указанным товарам за указанный период. Доступно для всех авторизованных пользователей.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: product_ids
 *         schema:
 *           type: string
 *         description: Список ID товаров через запятую
 *         example: "TEL-4567,TEL-4568"
 *       - in: query
 *         name: period_days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 7
 *         description: Период для анализа в днях
 *         example: 30
 *     responses:
 *       200:
 *         description: Детальная статистика по товарам успешно получена
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// GET /api/analytics/product-stats - статистика по товарам
router.get('/product-stats', authenticateToken, async (req, res) => {
  try {
    const { product_ids, period_days = 7 } = req.query;

    let productIds: string[] = [];
    if (typeof product_ids === 'string') {
      productIds = product_ids.split(',');
    }

    const result = await analyticsService.getProductStats(productIds, parseInt(period_days as string));
    res.json(result);
  } catch (error: any) {
    console.error('Product stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;