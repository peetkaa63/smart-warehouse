import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { optimizedHistoryRepository } from '../repositories/OptimizedHistoryRepository';

const router = express.Router();

// GET /api/history - оптимизированное получение истории
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      from,
      to,
      zone,
      status,
      product_id,
      robot_id,
      page,
      limit,
      cursor,
      use_cursor = 'false'
    } = req.query;

    console.log('📊 Optimized history request:', {
      from, to, zone, status, product_id, robot_id, page, limit, cursor, use_cursor
    });

    const filters = {
      from: from as string,
      to: to as string,
      zone: zone as string,
      status: status as string,
      product_id: product_id as string,
      robot_id: robot_id as string,
      page: page as string,
      limit: limit as string,
      cursor: typeof cursor === 'string' ? cursor : undefined
    };

    // Выбираем тип пагинации
    const result = use_cursor === 'true' 
      ? await optimizedHistoryRepository.getHistoryOptimized({ ...filters, cursor: cursor as string })
      : await optimizedHistoryRepository.getHistoryOptimized(filters);

    res.json({
      success: true,
      data: result.items,
      pagination: result.pagination,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Optimized history error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// GET /api/history/stats - кэшированная статистика
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { from, to } = req.query;

    console.log('📈 Optimized stats request:', { from, to });

    const stats = await optimizedHistoryRepository.getCachedStats({
      from: from as string,
      to: to as string
    });

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Optimized stats error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// POST /api/history/refresh - принудительное обновление кэша
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 Refreshing history cache');
    
    await optimizedHistoryRepository.invalidateHistoryCache();
    
    res.json({
      success: true,
      message: 'History cache refreshed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Cache refresh error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// GET /api/history/export - экспорт с оптимизированной пагинацией
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const {
      from,
      to,
      zone,
      status,
      product_id,
      robot_id,
      format = 'json'
    } = req.query;

    console.log('📤 Optimized export request:', {
      from, to, zone, status, product_id, robot_id, format
    });

    // Для экспорта используем cursor-based пагинацию
    const filters = {
      from: from as string,
      to: to as string,
      zone: zone as string,
      status: status as string,
      product_id: product_id as string,
      robot_id: robot_id as string,
      limit: '1000' // Большой лимит для экспорта
    };

    let allItems: any[] = [];
    let cursor: string | undefined;
    let hasNext = true;

    // Собираем все данные по частям
    while (hasNext) {
      const result = await optimizedHistoryRepository.getHistoryOptimized({
        ...filters,
        cursor
      });

      allItems = allItems.concat(result.items);
      hasNext = result.pagination.hasNext;
      cursor = result.pagination.nextCursor;

      // Защита от бесконечного цикла
      if (allItems.length > 100000) {
        console.warn('⚠️ Export limit reached: 100,000 items');
        break;
      }
    }

    if (format === 'csv') {
      // Экспорт в CSV
      const csv = convertToCSV(allItems);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=inventory_history.csv');
      res.send(csv);
    } else {
      // Экспорт в JSON
      res.json({
        success: true,
        data: allItems,
        total: allItems.length,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error: any) {
    console.error('❌ Optimized export error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Утилита для конвертации в CSV
function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Экранируем запятые и кавычки
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

export default router;
