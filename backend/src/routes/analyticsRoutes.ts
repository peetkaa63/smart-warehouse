// routes/analyticsRoutes.ts
import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { analyticsService } from '../services/HistoryService';

const router = express.Router();

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