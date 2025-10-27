import { pool } from '../config/database';
import { cacheManager, CacheKeys, CacheTTL } from '../config/redis';

export interface HistoryFilters {
  from?: string;
  to?: string;
  zone?: string;
  status?: string;
  product_id?: string;
  robot_id?: string;
  page?: string;
  limit?: string;
  cursor?: string; // Для cursor-based пагинации
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string;
    prevCursor?: string;
  };
}

export class OptimizedHistoryRepository {
  // ОПТИМИЗИРОВАННАЯ ПАГИНАЦИЯ: Cursor-based вместо OFFSET
  async getHistoryOptimized(filters: HistoryFilters): Promise<PaginatedResult<any>> {
    const {
      from,
      to,
      zone,
      status,
      product_id,
      robot_id,
      page = '1',
      limit = '20',
      cursor
    } = filters;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;

    // Генерируем ключ кэша на основе фильтров
    const cacheKey = this.generateCacheKey('history', filters);
    
    // Пытаемся получить из кэша
    let result = await cacheManager.get(cacheKey);
    
    if (!result) {
      console.log('📊 Cache miss for history data, fetching from DB');
      
      if (cursor) {
        result = await this.getHistoryWithCursor(filters);
      } else {
        result = await this.getHistoryWithOffset(filters);
      }
      
      // Кэшируем результат на 2 минуты
      await cacheManager.set(cacheKey, result, CacheTTL.SCANS);
    } else {
      console.log('📊 Cache hit for history data');
    }

    return result as PaginatedResult<any>;
  }

  // Cursor-based пагинация (более эффективная для больших данных)
  private async getHistoryWithCursor(filters: HistoryFilters): Promise<PaginatedResult<any>> {
    const { cursor, limit = '20' } = filters;
    const limitNum = parseInt(limit as string) || 20;

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

    // Добавляем фильтры
    this.addFilters(query, params, filters);

    // Cursor-based пагинация
    if (cursor) {
      const cursorValue = this.decodeCursor(cursor);
      params.push(cursorValue);
      query += ` AND ih.scanned_at < $${params.length}`;
    }

    query += ` ORDER BY ih.scanned_at DESC LIMIT $${params.length + 1}`;
    params.push(limitNum + 1); // +1 для проверки hasNext

    const result = await pool.query(query, params);
    const items = result.rows;
    
    const hasNext = items.length > limitNum;
    if (hasNext) {
      items.pop(); // Убираем лишний элемент
    }

    const nextCursor = hasNext && items.length > 0 
      ? this.encodeCursor(items[items.length - 1].scannedAt)
      : undefined;

    return {
      items,
      pagination: {
        page: 1, // Cursor-based не использует страницы
        limit: limitNum,
        total: -1, // Не считаем общее количество для производительности
        totalPages: -1,
        hasNext,
        hasPrev: !!cursor,
        nextCursor,
        prevCursor: undefined // Для простоты не реализуем обратную навигацию
      }
    };
  }

  // Offset-based пагинация с оптимизацией
  private async getHistoryWithOffset(filters: HistoryFilters): Promise<PaginatedResult<any>> {
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

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    const offset = (pageNum - 1) * limitNum;

    // Основной запрос данных
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

    // Добавляем фильтры
    this.addFilters(query, params, filters);

    // Сортировка и пагинация
    query += ` ORDER BY ih.scanned_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limitNum, offset);

    // Параллельно выполняем запрос данных и подсчет
    const [dataResult, countResult] = await Promise.all([
      pool.query(query, params),
      this.getOptimizedCount(filters)
    ]);

    const total = countResult;
    const totalPages = Math.ceil(total / limitNum);

    return {
      items: dataResult.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    };
  }

  // ОПТИМИЗИРОВАННЫЙ ПОДСЧЕТ: Используем приблизительный подсчет для больших таблиц
  private async getOptimizedCount(filters: HistoryFilters): Promise<number> {
    const { from, to } = filters;

    // Если нет фильтров по дате, используем приблизительный подсчет
    if (!from && !to) {
      return await this.getApproximateCount();
    }

    // Если есть фильтры по дате, делаем точный подсчет
    return await this.getExactCount(filters);
  }

  // Приблизительный подсчет через статистику PostgreSQL
  private async getApproximateCount(): Promise<number> {
    try {
      const query = `
        SELECT n_tup_ins - n_tup_del as approximate_count
        FROM pg_stat_user_tables 
        WHERE relname = 'inventory_history'
      `;
      
      const result = await pool.query(query);
      return parseInt(result.rows[0]?.approximate_count) || 0;
    } catch (error) {
      console.error('Error getting approximate count:', error);
      return 0;
    }
  }

  // Точный подсчет с фильтрами
  private async getExactCount(filters: HistoryFilters): Promise<number> {
    let countQuery = `
      SELECT COUNT(*) as count
      FROM inventory_history ih
      WHERE 1=1
    `;
    
    const params: any[] = [];
    this.addFilters(countQuery, params, filters);

    const result = await pool.query(countQuery, params);
    return parseInt(result.rows[0].count);
  }

  // Добавление фильтров к запросу
  private addFilters(query: string, params: any[], filters: HistoryFilters): void {
    const { from, to, zone, status, product_id, robot_id } = filters;

    if (from && typeof from === 'string' && from.trim() !== '') {
      params.push(new Date(from));
      query += ` AND ih.scanned_at >= $${params.length}`;
    }

    if (to && typeof to === 'string' && to.trim() !== '') {
      params.push(new Date(to));
      query += ` AND ih.scanned_at <= $${params.length}`;
    }

    if (zone && typeof zone === 'string' && zone.trim() !== '') {
      params.push(zone);
      query += ` AND ih.zone = $${params.length}`;
    }

    if (status && typeof status === 'string' && status.trim() !== '') {
      params.push(status);
      query += ` AND ih.status = $${params.length}`;
    }

    if (product_id && typeof product_id === 'string' && product_id.trim() !== '') {
      params.push(product_id);
      query += ` AND ih.product_id = $${params.length}`;
    }

    if (robot_id && typeof robot_id === 'string' && robot_id.trim() !== '') {
      params.push(robot_id);
      query += ` AND ih.robot_id = $${params.length}`;
    }
  }

  // Генерация ключа кэша
  private generateCacheKey(prefix: string, filters: HistoryFilters): string {
    const filterString = Object.entries(filters)
      .filter(([_, value]) => value !== undefined && value !== '')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join('|');
    
    return `${prefix}:${Buffer.from(filterString).toString('base64')}`;
  }

  // Кодирование курсора
  private encodeCursor(value: any): string {
    return Buffer.from(JSON.stringify(value)).toString('base64');
  }

  // Декодирование курсора
  private decodeCursor(cursor: string): any {
    try {
      return JSON.parse(Buffer.from(cursor, 'base64').toString());
    } catch (error) {
      console.error('Error decoding cursor:', error);
      return null;
    }
  }

  // ОПТИМИЗИРОВАННАЯ СТАТИСТИКА: С кэшированием
  async getCachedStats(filters: { from?: string; to?: string }): Promise<any> {
    const cacheKey = `stats:${JSON.stringify(filters)}`;
    
    let stats = await cacheManager.get(cacheKey);
    
    if (!stats) {
      console.log('📈 Cache miss for stats, fetching from DB');
      
      stats = await this.fetchStatsFromDB(filters);
      
      await cacheManager.set(cacheKey, stats, CacheTTL.ANALYTICS);
    } else {
      console.log('📈 Cache hit for stats');
    }
    
    return stats;
  }

  private async fetchStatsFromDB(filters: { from?: string; to?: string }): Promise<any> {
    const { from, to } = filters;

    // Оптимизированный запрос статистики
    const query = `
      WITH base_stats AS (
        SELECT 
          COUNT(*) as total_scans,
          COUNT(DISTINCT product_id) as unique_products,
          COUNT(CASE WHEN status IN ('LOW_STOCK', 'CRITICAL') THEN 1 END) as discrepancies,
          COUNT(DISTINCT robot_id) as active_robots
        FROM inventory_history
        WHERE 1=1
        ${from ? 'AND scanned_at >= $1' : ''}
        ${to ? `AND scanned_at <= $${from ? '2' : '1'}` : ''}
      ),
      time_stats AS (
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
            ${from ? 'AND scanned_at >= $1' : ''}
            ${to ? `AND scanned_at <= $${from ? '2' : '1'}` : ''}
          ) time_data
          WHERE next_scan IS NOT NULL
          AND EXTRACT(EPOCH FROM (next_scan - scanned_at)) BETWEEN 60 AND 3600
        ) valid_times
      )
      SELECT 
        bs.total_scans,
        bs.unique_products,
        bs.discrepancies,
        bs.active_robots,
        ts.avg_zone_time
      FROM base_stats bs, time_stats ts
    `;

    const params: any[] = [];
    if (from) params.push(new Date(from));
    if (to) params.push(new Date(to));

    const result = await pool.query(query, params);
    const stats = result.rows[0];

    return {
      totalScans: parseInt(stats.total_scans) || 0,
      uniqueProducts: parseInt(stats.unique_products) || 0,
      discrepancies: parseInt(stats.discrepancies) || 0,
      activeRobots: parseInt(stats.active_robots) || 0,
      avgZoneTime: parseFloat(stats.avg_zone_time) || 0
    };
  }

  // Инвалидация кэша при обновлении данных
  async invalidateHistoryCache(): Promise<void> {
    console.log('🗑️ Invalidating history cache');
    await cacheManager.delPattern('history:*');
    await cacheManager.delPattern('stats:*');
  }
}

// Экспорт singleton instance
export const optimizedHistoryRepository = new OptimizedHistoryRepository();
