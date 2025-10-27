import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { historyService } from '../services/HistoryService';

const router = express.Router();

// GET /api/history - получение исторических данных с фильтрами
router.get('/', authenticateToken, async (req, res) => {
  try {
    const filters = req.query;
    const result = await historyService.getHistory(filters);
    res.json(result);
  } catch (error: any) {
    console.error('❌ Error fetching history:', error);
    res.status(500).json({ error: error.message });
  }
});

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