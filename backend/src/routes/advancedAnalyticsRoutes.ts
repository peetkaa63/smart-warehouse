// routes/advancedAnalyticsRoutes.ts
import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { advancedAnalyticsServiceNew as advancedAnalyticsService } from '../services/AllServices';

const router = express.Router();

// GET /api/advancedAnalytics/trends - данные для расширенных графиков
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

// GET /api/advancedAnalytics/efficiency - эффективность роботов
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

// GET /api/advancedAnalytics/ai-insights - AI инсайты
router.get('/ai-insights', authenticateToken, async (req, res) => {
  try {
    const result = await advancedAnalyticsService.getAIInsights();
    res.json(result);
  } catch (error: any) {
    console.error('Advanced analytics AI insights error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/advancedAnalytics/notifications - уведомления
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