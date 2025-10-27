import { pool } from '../config/database';

export interface HistoryFilters {
  from?: string;
  to?: string;
  zone?: string;
  status?: string;
  product_id?: string;
  robot_id?: string;
  page?: string;
  limit?: string;
}

export interface HistoryStats {
  totalScans: number;
  uniqueProducts: number;
  discrepancies: number;
  avgZoneTime: number;
}

export class HistoryRepository {
  // Получение исторических данных с фильтрами
  async getHistory(filters: HistoryFilters) {
    const {
      from,
      to,
      zone,
      status,
      product_id,
      robot_id,
      page = '1',
      limit = '20'
    } = filters;

    let query = `
      SELECT 
        ih.id,
        ih.scanned_at as "scannedAt",
        r.id as "robotId",
        ih.zone,
        p.id as "productId",
        p.name as "productName",
        ih.quantity,
        ih.status,
        ih.row_number as "rowNumber",
        ih.shelf_number as "shelfNumber"
      FROM inventory_history ih
      LEFT JOIN robots r ON ih.robot_id = r.id
      LEFT JOIN products p ON ih.product_id = p.id
      WHERE 1=1
    `;
    
    const params: any[] = [];

    // Фильтр по дате "от"
    if (from && typeof from === 'string' && from.trim() !== '') {
      params.push(new Date(from));
      query += ` AND ih.scanned_at >= $${params.length}`;
    }

    // Фильтр по дате "до"
    if (to && typeof to === 'string' && to.trim() !== '') {
      params.push(new Date(to));
      query += ` AND ih.scanned_at <= $${params.length}`;
    }

    // Сортировка и пагинация
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    const offset = (pageNum - 1) * limitNum;
    
    query += ` ORDER BY ih.scanned_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limitNum, offset);

    console.log('📊 Executing history query:', query, params);
    const result = await pool.query(query, params);

    return {
      items: result.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: await this.getHistoryCount(filters),
        totalPages: Math.ceil((await this.getHistoryCount(filters)) / limitNum)
      }
    };
  }

  // Подсчет общего количества записей
  private async getHistoryCount(filters: HistoryFilters): Promise<number> {
    const { from, to } = filters;

    let countQuery = `
      SELECT COUNT(*) 
      FROM inventory_history ih
      LEFT JOIN robots r ON ih.robot_id = r.id
      LEFT JOIN products p ON ih.product_id = p.id
      WHERE 1=1
    `;
    
    const countParams: any[] = [];

    if (from && typeof from === 'string' && from.trim() !== '') {
      countParams.push(new Date(from));
      countQuery += ` AND ih.scanned_at >= $${countParams.length}`;
    }

    if (to && typeof to === 'string' && to.trim() !== '') {
      countParams.push(new Date(to));
      countQuery += ` AND ih.scanned_at <= $${countParams.length}`;
    }

    const countResult = await pool.query(countQuery, countParams);
    return parseInt(countResult.rows[0].count);
  }

  // Получение статистики за период
  async getStats(filters: { from?: string; to?: string }): Promise<HistoryStats> {
    const { from, to } = filters;

    console.log('📈 Fetching stats for period:', { from, to });

    // Основная статистика
    let statsQuery = `
      SELECT 
        COUNT(*) as total_scans,
        COUNT(DISTINCT product_id) as unique_products,
        COUNT(CASE WHEN status IN ('LOW_STOCK', 'CRITICAL') THEN 1 END) as discrepancies
      FROM inventory_history
      WHERE 1=1
    `;

    const params: any[] = [];

    if (from && typeof from === 'string' && from.trim() !== '') {
      params.push(new Date(from));
      statsQuery += ` AND scanned_at >= $${params.length}`;
    }

    if (to && typeof to === 'string' && to.trim() !== '') {
      params.push(new Date(to));
      statsQuery += ` AND scanned_at <= $${params.length}`;
    }

    console.log('📈 Executing stats query:', statsQuery, params);
    const statsResult = await pool.query(statsQuery, params);

    // Расчет среднего времени инвентаризации зоны
    let timeQuery = `
      SELECT 
        COALESCE(AVG(time_diff), 0) as avg_zone_time
      FROM (
        SELECT 
          EXTRACT(EPOCH FROM (next_scan - scanned_at)) / 60 as time_diff
        FROM (
          SELECT 
            robot_id,
            zone,
            scanned_at,
            LEAD(scanned_at) OVER (PARTITION BY robot_id, zone ORDER BY scanned_at) as next_scan
          FROM inventory_history
          WHERE scanned_at IS NOT NULL
        ) time_data
        WHERE next_scan IS NOT NULL
        AND EXTRACT(EPOCH FROM (next_scan - scanned_at)) BETWEEN 60 AND 3600
    `;

    const timeParams: any[] = [];

    if (from && typeof from === 'string' && from.trim() !== '') {
      timeParams.push(new Date(from));
      timeQuery += ` AND scanned_at >= $${timeParams.length}`;
    }

    if (to && typeof to === 'string' && to.trim() !== '') {
      timeParams.push(new Date(to));
      timeQuery += ` AND scanned_at <= $${timeParams.length}`;
    }

    timeQuery += ` ) valid_times`;

    console.log('⏱️ Executing time query:', timeQuery, timeParams);
    const timeResult = await pool.query(timeQuery, timeParams);

    return {
      totalScans: parseInt(statsResult.rows[0].total_scans) || 0,
      uniqueProducts: parseInt(statsResult.rows[0].unique_products) || 0,
      discrepancies: parseInt(statsResult.rows[0].discrepancies) || 0,
      avgZoneTime: Math.round(parseFloat(timeResult.rows[0]?.avg_zone_time) * 10) / 10 || 0
    };
  }
}

export const historyRepository = new HistoryRepository();

