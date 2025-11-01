import express from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';
import { aiService } from '../services/AllServices';

const router = express.Router();

/**
 * @swagger
 * /api/ai/predict:
 *   post:
 *     summary: Получить прогнозы от ИИ
 *     description: Генерирует прогнозы по запасам и рекомендации с использованием искусственного интеллекта
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               period_days:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 365
 *                 default: 7
 *                 example: 7
 *                 description: Период для анализа в днях
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["electronics", "tools"]
 *                 description: Фильтр по категориям товаров
 *               zones:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [A, B, C, D, E]
 *                 example: ["A", "B"]
 *                 description: Фильтр по зонам склада
 *               provider:
 *                 type: string
 *                 enum: [Gemini, OpenAI, LocalAI]
 *                 example: "Gemini"
 *                 description: AI провайдер для анализа
 *     responses:
 *       200:
 *         description: Прогнозы успешно получены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 predictions:
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
 *                       prediction_date:
 *                         type: string
 *                         format: date
 *                         example: "2024-01-22"
 *                       days_until_stockout:
 *                         type: integer
 *                         nullable: true
 *                         example: 15
 *                       recommended_order:
 *                         type: integer
 *                         nullable: true
 *                         example: 50
 *                       confidence_score:
 *                         type: number
 *                         minimum: 0
 *                         maximum: 1
 *                         example: 0.85
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       category:
 *                         type: string
 *                         enum: [INVENTORY, LOGISTICS, EFFICIENCY]
 *                         example: "INVENTORY"
 *                       title:
 *                         type: string
 *                         example: "Оптимизация быстропродаваемых товаров"
 *                       description:
 *                         type: string
 *                         example: "Сосредоточьтесь на оптимизации уровней запасов для товаров с высокой оборачиваемостью"
 *                       priority:
 *                         type: string
 *                         enum: [HIGH, MEDIUM, LOW]
 *                         example: "HIGH"
 *                       expected_impact:
 *                         type: string
 *                         example: "Снижение отходов и улучшение денежного потока"
 *                 summary:
 *                   type: string
 *                   example: "Анализ ИИ показывает здоровый инвентарь с незначительными областями для оптимизации"
 *                 overall_score:
 *                   type: integer
 *                   minimum: 0
 *                   maximum: 100
 *                   example: 85
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/predict', authenticateToken, async (req, res) => {
  try {
    const { period_days = 7, categories = [], zones = [], provider } = req.body;
    const result = await aiService.getPredictions(period_days, categories, provider);
    res.json(result);
  } catch (error: any) {
    console.error('AI predict error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/ai/predict/advanced:
 *   post:
 *     summary: Расширенная аналитика с фильтрами
 *     description: Генерирует детальные прогнозы с расширенными фильтрами и настройками
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               period_days:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 365
 *                 default: 7
 *               zones:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [A, B, C, D, E]
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *               products:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Список конкретных ID товаров для анализа
 *               provider:
 *                 type: string
 *                 enum: [Gemini, OpenAI, LocalAI]
 *     responses:
 *       200:
 *         description: Расширенные прогнозы успешно получены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 predictions:
 *                   type: array
 *                   items:
 *                     type: object
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: object
 *                 summary:
 *                   type: string
 *                 overall_score:
 *                   type: integer
 *                 filters_applied:
 *                   type: object
 *                   description: Примененные фильтры
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/predict/advanced', authenticateToken, async (req, res) => {
  try {
    const filters = req.body;
    const result = await aiService.getAdvancedPredictions(filters);
    res.json(result);
  } catch (error: any) {
    console.error('AI advanced predict error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/ai/providers:
 *   get:
 *     summary: Получить список доступных AI провайдеров
 *     description: Возвращает информацию о доступных AI провайдерах и их статусе
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список провайдеров успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 providers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: "Gemini"
 *                       status:
 *                         type: object
 *                         properties:
 *                           initialized:
 *                             type: boolean
 *                             example: true
 *                           message:
 *                             type: string
 *                             example: "Gemini AI Provider is ready."
 *                 current_provider:
 *                   type: string
 *                   example: "Gemini"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/providers', authenticateToken, async (req, res) => {
  try {
    const providers = aiService.getProvidersInfo();
    const currentProvider = aiService.getCurrentProvider();
    
    res.json({
      providers,
      current_provider: currentProvider
    });
  } catch (error: any) {
    console.error('AI providers error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/ai/providers/{providerName}:
 *   put:
 *     summary: Изменить AI провайдера по умолчанию
 *     description: Устанавливает указанный AI провайдер как провайдер по умолчанию
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: providerName
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Gemini, OpenAI, LocalAI]
 *         example: "OpenAI"
 *         description: Название AI провайдера
 *     responses:
 *       200:
 *         description: Провайдер успешно изменен
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
 *                   example: "AI провайдер изменен на OpenAI"
 *                 current_provider:
 *                   type: string
 *                   example: "OpenAI"
 *       400:
 *         description: Неверный провайдер
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error:
 *                 code: "INVALID_PROVIDER"
 *                 message: "Провайдер OpenAI не найден или не инициализирован"
 *                 messageRu: "Провайдер OpenAI не найден или не инициализирован"
 *                 statusCode: 400
 *                 severity: "LOW"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put('/providers/:providerName', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { providerName } = req.params;
    const success = aiService.setDefaultProvider(providerName);
    
    if (success) {
      res.json({
        success: true,
        message: `AI провайдер изменен на ${providerName}`,
        current_provider: providerName
      });
    } else {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PROVIDER',
          message: `Провайдер ${providerName} не найден или не инициализирован`,
          messageRu: `Провайдер ${providerName} не найден или не инициализирован`,
          statusCode: 400,
          severity: 'LOW'
        }
      });
    }
  } catch (error: any) {
    console.error('AI provider change error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/ai/history:
 *   get:
 *     summary: Получить историю прогнозов
 *     description: Возвращает историю предыдущих прогнозов ИИ
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         example: 10
 *         description: Количество записей для возврата
 *     responses:
 *       200:
 *         description: История прогнозов успешно получена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 predictions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       product_id:
 *                         type: string
 *                         example: "TEL-4567"
 *                       prediction_date:
 *                         type: string
 *                         format: date
 *                         example: "2024-01-22"
 *                       days_until_stockout:
 *                         type: integer
 *                         example: 15
 *                       recommended_order:
 *                         type: integer
 *                         example: 50
 *                       confidence_score:
 *                         type: number
 *                         example: 0.85
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-15T10:30:00.000Z"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const history = await aiService.getPredictionHistory(limit);
    
    res.json({
      predictions: history
    });
  } catch (error: any) {
    console.error('AI history error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;