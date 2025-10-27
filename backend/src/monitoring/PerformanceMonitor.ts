import { pool } from '../config/database';
import { cacheManager, CacheKeys } from '../config/redis';

export interface QueryMetrics {
  query: string;
  executionTime: number;
  rowsReturned: number;
  timestamp: Date;
  cacheHit?: boolean;
}

export interface DatabaseStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingConnections: number;
  cacheHitRatio: number;
  slowQueries: QueryMetrics[];
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private queryMetrics: QueryMetrics[] = [];
  private maxMetricsHistory = 1000;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Запись метрик запроса
  recordQuery(query: string, executionTime: number, rowsReturned: number, cacheHit = false): void {
    const metric: QueryMetrics = {
      query: this.sanitizeQuery(query),
      executionTime,
      rowsReturned,
      timestamp: new Date(),
      cacheHit
    };

    this.queryMetrics.push(metric);

    // Ограничиваем размер истории
    if (this.queryMetrics.length > this.maxMetricsHistory) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxMetricsHistory);
    }

    // Логируем медленные запросы
    if (executionTime > 1000) { // > 1 секунды
      console.warn(`🐌 Slow query detected (${executionTime}ms):`, query.substring(0, 100));
    }
  }

  // Получение статистики базы данных
  async getDatabaseStats(): Promise<DatabaseStats> {
    try {
      const [connectionStats, cacheStats, slowQueries] = await Promise.all([
        this.getConnectionStats(),
        this.getCacheStats(),
        this.getSlowQueries()
      ]);

      return {
        totalConnections: connectionStats.totalConnections || 0,
        activeConnections: connectionStats.activeConnections || 0,
        idleConnections: connectionStats.idleConnections || 0,
        waitingConnections: connectionStats.waitingConnections || 0,
        cacheHitRatio: cacheStats.cacheHitRatio || 0,
        slowQueries
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        waitingConnections: 0,
        cacheHitRatio: 0,
        slowQueries: []
      };
    }
  }

  // Получение статистики подключений
  private async getConnectionStats(): Promise<Partial<DatabaseStats>> {
    const query = `
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections,
        count(*) FILTER (WHERE state = 'idle in transaction') as waiting_connections
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `;

    const result = await pool.query(query);
    const stats = result.rows[0];

    return {
      totalConnections: parseInt(stats.total_connections),
      activeConnections: parseInt(stats.active_connections),
      idleConnections: parseInt(stats.idle_connections),
      waitingConnections: parseInt(stats.waiting_connections)
    };
  }

  // Получение статистики кэша
  private async getCacheStats(): Promise<Partial<DatabaseStats>> {
    try {
      // Получаем статистику кэша Redis
      const info = await cacheManager.getRedisInfo('stats');
      const lines = info.split('\r\n');
      
      let hits = 0;
      let misses = 0;

      for (const line of lines) {
        if (line.startsWith('keyspace_hits:')) {
          hits = parseInt(line.split(':')[1]);
        } else if (line.startsWith('keyspace_misses:')) {
          misses = parseInt(line.split(':')[1]);
        }
      }

      const cacheHitRatio = hits + misses > 0 ? (hits / (hits + misses)) * 100 : 0;

      return { cacheHitRatio: Math.round(cacheHitRatio * 100) / 100 };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { cacheHitRatio: 0 };
    }
  }

  // Получение медленных запросов
  private getSlowQueries(): QueryMetrics[] {
    return this.queryMetrics
      .filter(metric => metric.executionTime > 500) // > 500ms
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10); // Топ 10 медленных запросов
  }

  // Получение статистики производительности
  getPerformanceStats(): {
    averageExecutionTime: number;
    totalQueries: number;
    cacheHitRate: number;
    slowQueriesCount: number;
  } {
    const recentMetrics = this.queryMetrics.slice(-100); // Последние 100 запросов
    
    if (recentMetrics.length === 0) {
      return {
        averageExecutionTime: 0,
        totalQueries: 0,
        cacheHitRate: 0,
        slowQueriesCount: 0
      };
    }

    const totalExecutionTime = recentMetrics.reduce((sum, metric) => sum + metric.executionTime, 0);
    const averageExecutionTime = totalExecutionTime / recentMetrics.length;
    
    const cacheHits = recentMetrics.filter(metric => metric.cacheHit).length;
    const cacheHitRate = (cacheHits / recentMetrics.length) * 100;
    
    const slowQueriesCount = recentMetrics.filter(metric => metric.executionTime > 1000).length;

    return {
      averageExecutionTime: Math.round(averageExecutionTime * 100) / 100,
      totalQueries: recentMetrics.length,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      slowQueriesCount
    };
  }

  // Очистка метрик
  clearMetrics(): void {
    this.queryMetrics = [];
  }

  // Санитизация запроса для логирования
  private sanitizeQuery(query: string): string {
    return query
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200); // Ограничиваем длину
  }

  // Получение рекомендаций по оптимизации
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const stats = this.getPerformanceStats();

    if (stats.averageExecutionTime > 100) {
      recommendations.push('Consider adding more database indexes');
    }

    if (stats.cacheHitRate < 50) {
      recommendations.push('Increase cache TTL or add more cache keys');
    }

    if (stats.slowQueriesCount > 5) {
      recommendations.push('Review and optimize slow queries');
    }

    return recommendations;
  }
}

// Middleware для автоматического мониторинга запросов
export const queryMonitoringMiddleware = (monitor: PerformanceMonitor) => {
  return async (req: any, res: any, next: any) => {
    const startTime = Date.now();
    
    // Перехватываем оригинальный метод res.json
    const originalJson = res.json;
    res.json = function(data: any) {
      const executionTime = Date.now() - startTime;
      
      // Записываем метрики
      monitor.recordQuery(
        req.originalUrl,
        executionTime,
        Array.isArray(data) ? data.length : 1,
        false // API запросы не кэшируются на уровне middleware
      );
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Экспорт singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();
