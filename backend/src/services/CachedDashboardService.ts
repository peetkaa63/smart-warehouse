import { pool } from '../config/database';
import { cacheManager, CacheKeys, CacheTTL } from '../config/redis';

export class CachedDashboardService {
  // Кэшированное получение статистики dashboard
  async getCachedDashboardStats() {
    const cacheKey = CacheKeys.DASHBOARD_STATS;
    
    // Пытаемся получить из кэша
    let stats = await cacheManager.get(cacheKey);
    
    if (!stats) {
      console.log('📊 Cache miss for dashboard stats, fetching from DB');
      
      // Получаем данные из БД
      stats = await this.fetchDashboardStatsFromDB();
      
      // Сохраняем в кэш
      await cacheManager.set(cacheKey, stats, CacheTTL.DASHBOARD);
    } else {
      console.log('📊 Cache hit for dashboard stats');
    }
    
    return stats;
  }

  // Кэшированное получение списка роботов
  async getCachedRobots() {
    const cacheKey = CacheKeys.ROBOTS_LIST;
    
    let robots = await cacheManager.get(cacheKey);
    
    if (!robots) {
      console.log('🤖 Cache miss for robots list, fetching from DB');
      
      robots = await this.fetchRobotsFromDB();
      
      await cacheManager.set(cacheKey, robots, CacheTTL.ROBOTS);
    } else {
      console.log('🤖 Cache hit for robots list');
    }
    
    return robots;
  }

  // Кэшированное получение последних сканирований
  async getCachedRecentScans(limit = 20) {
    const cacheKey = `${CacheKeys.RECENT_SCANS}:${limit}`;
    
    let scans = await cacheManager.get(cacheKey);
    
    if (!scans) {
      console.log('📋 Cache miss for recent scans, fetching from DB');
      
      scans = await this.fetchRecentScansFromDB(limit);
      
      await cacheManager.set(cacheKey, scans, CacheTTL.SCANS);
    } else {
      console.log('📋 Cache hit for recent scans');
    }
    
    return scans;
  }

  // Кэшированное получение статистики по зонам
  async getCachedZoneStatistics() {
    const cacheKey = CacheKeys.ZONE_STATISTICS;
    
    let zoneStats = await cacheManager.get(cacheKey);
    
    if (!zoneStats) {
      console.log('🏢 Cache miss for zone statistics, fetching from DB');
      
      zoneStats = await this.fetchZoneStatisticsFromDB();
      
      await cacheManager.set(cacheKey, zoneStats, CacheTTL.ANALYTICS);
    } else {
      console.log('🏢 Cache hit for zone statistics');
    }
    
    return zoneStats;
  }

  // Кэшированное получение трендов производительности
  async getCachedPerformanceTrends(hours = 24) {
    const cacheKey = `${CacheKeys.PERFORMANCE_TRENDS}:${hours}`;
    
    let trends = await cacheManager.get(cacheKey);
    
    if (!trends) {
      console.log('📈 Cache miss for performance trends, fetching from DB');
      
      trends = await this.fetchPerformanceTrendsFromDB(hours);
      
      await cacheManager.set(cacheKey, trends, CacheTTL.ANALYTICS);
    } else {
      console.log('📈 Cache hit for performance trends');
    }
    
    return trends;
  }

  // Кэшированное получение системных алертов
  async getCachedSystemAlerts() {
    const cacheKey = CacheKeys.SYSTEM_ALERTS;
    
    let alerts = await cacheManager.get(cacheKey);
    
    if (!alerts) {
      console.log('🚨 Cache miss for system alerts, fetching from DB');
      
      alerts = await this.fetchSystemAlertsFromDB();
      
      await cacheManager.set(cacheKey, alerts, CacheTTL.DASHBOARD);
    } else {
      console.log('🚨 Cache hit for system alerts');
    }
    
    return alerts;
  }

  // Инвалидация кэша при обновлении данных
  async invalidateDashboardCache() {
    console.log('🗑️ Invalidating dashboard cache');
    
    await Promise.all([
      cacheManager.del(CacheKeys.DASHBOARD_STATS),
      cacheManager.del(CacheKeys.ROBOTS_LIST),
      cacheManager.delPattern(`${CacheKeys.RECENT_SCANS}:*`),
      cacheManager.del(CacheKeys.SYSTEM_ALERTS)
    ]);
  }

  // Инвалидация кэша аналитики
  async invalidateAnalyticsCache() {
    console.log('🗑️ Invalidating analytics cache');
    
    await Promise.all([
      cacheManager.del(CacheKeys.ZONE_STATISTICS),
      cacheManager.delPattern(`${CacheKeys.PERFORMANCE_TRENDS}:*`),
      cacheManager.del(CacheKeys.PRODUCT_STATS)
    ]);
  }

  // Инвалидация кэша AI данных
  async invalidateAICache() {
    console.log('🗑️ Invalidating AI cache');
    
    await cacheManager.del(CacheKeys.AI_PREDICTIONS);
  }

  // Методы для получения данных из БД (приватные)
  private async fetchDashboardStatsFromDB() {
    const query = `
      WITH robot_stats AS (
        SELECT 
          COUNT(*) as total_robots,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_robots,
          ROUND(AVG(CASE WHEN status != 'offline' THEN battery_level END)) as avg_battery
        FROM robots
      ),
      scan_stats AS (
        SELECT 
          COUNT(*) as scanned_today,
          COUNT(DISTINCT CASE WHEN status = 'CRITICAL' AND scanned_at > NOW() - INTERVAL '1 hour' 
               THEN product_id END) as critical_stock
        FROM inventory_history
        WHERE DATE(scanned_at) = CURRENT_DATE
      )
      SELECT 
        rs.total_robots,
        rs.active_robots,
        rs.avg_battery,
        ss.scanned_today,
        ss.critical_stock
      FROM robot_stats rs, scan_stats ss
    `;

    const result = await pool.query(query);
    const stats = result.rows[0];

    return {
      activeRobots: parseInt(stats.active_robots) || 0,
      totalRobots: parseInt(stats.total_robots) || 0,
      scannedToday: parseInt(stats.scanned_today) || 0,
      criticalStock: parseInt(stats.critical_stock) || 0,
      avgBattery: parseInt(stats.avg_battery) || 0
    };
  }

  private async fetchRobotsFromDB() {
    const query = `
      SELECT 
        id, 
        status, 
        battery_level, 
        last_update,
        current_zone, 
        current_row, 
        current_shelf,
        CASE 
          WHEN last_update > NOW() - INTERVAL '5 minutes' THEN 'online'
          WHEN last_update > NOW() - INTERVAL '1 hour' THEN 'stale'
          ELSE 'offline'
        END as connection_status
      FROM robots 
      ORDER BY 
        CASE status 
          WHEN 'active' THEN 1 
          WHEN 'charging' THEN 2 
          WHEN 'offline' THEN 3 
          ELSE 4 
        END,
        id
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  private async fetchRecentScansFromDB(limit: number) {
    const query = `
      SELECT 
        ih.scanned_at as time,
        ih.robot_id,
        ih.zone,
        p.name as product_name,
        p.id as product_id,
        ih.quantity,
        ih.status,
        r.status as robot_status
      FROM inventory_history ih
      JOIN products p ON ih.product_id = p.id
      LEFT JOIN robots r ON ih.robot_id = r.id
      WHERE ih.scanned_at >= NOW() - INTERVAL '24 hours'
      ORDER BY ih.scanned_at DESC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  private async fetchZoneStatisticsFromDB() {
    const query = `
      WITH zone_stats AS (
        SELECT 
          zone,
          COUNT(*) as total_scans,
          COUNT(DISTINCT product_id) as unique_products,
          COUNT(DISTINCT robot_id) as active_robots,
          AVG(quantity) as avg_quantity,
          COUNT(CASE WHEN status = 'CRITICAL' THEN 1 END) as critical_items
        FROM inventory_history
        WHERE scanned_at >= NOW() - INTERVAL '24 hours'
        GROUP BY zone
      )
      SELECT 
        zone,
        total_scans,
        unique_products,
        active_robots,
        ROUND(avg_quantity::numeric, 2) as avg_quantity,
        critical_items,
        ROUND((critical_items::numeric / NULLIF(total_scans, 0)) * 100, 2) as critical_percentage
      FROM zone_stats
      ORDER BY total_scans DESC
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  private async fetchPerformanceTrendsFromDB(hours: number) {
    const query = `
      WITH hourly_stats AS (
        SELECT 
          DATE_TRUNC('hour', scanned_at) as hour,
          COUNT(*) as scans_count,
          COUNT(DISTINCT robot_id) as active_robots,
          COUNT(DISTINCT product_id) as unique_products,
          AVG(quantity) as avg_quantity
        FROM inventory_history
        WHERE scanned_at >= NOW() - INTERVAL '${hours} hours'
        GROUP BY DATE_TRUNC('hour', scanned_at)
        ORDER BY hour
      )
      SELECT 
        hour,
        scans_count,
        active_robots,
        unique_products,
        ROUND(avg_quantity::numeric, 2) as avg_quantity,
        ROUND(scans_count::numeric / NULLIF(active_robots, 0), 2) as scans_per_robot
      FROM hourly_stats
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  private async fetchSystemAlertsFromDB() {
    const query = `
      WITH alerts AS (
        SELECT 
          'low_battery' as alert_type,
          id as entity_id,
          'Robot ' || id || ' has low battery (' || battery_level || '%)' as message,
          'warning' as severity,
          last_update as created_at
        FROM robots
        WHERE battery_level < 20 AND status != 'offline'
        
        UNION ALL
        
        SELECT 
          'critical_stock' as alert_type,
          product_id as entity_id,
          'Product ' || p.name || ' is critically low (' || ih.quantity || ' units)' as message,
          'critical' as severity,
          ih.scanned_at as created_at
        FROM inventory_history ih
        JOIN products p ON ih.product_id = p.id
        WHERE ih.status = 'CRITICAL' 
          AND ih.scanned_at > NOW() - INTERVAL '1 hour'
        
        UNION ALL
        
        SELECT 
          'inactive_robot' as alert_type,
          id as entity_id,
          'Robot ' || id || ' has been inactive for ' || 
          EXTRACT(EPOCH FROM (NOW() - last_update))/3600 || ' hours' as message,
          'info' as severity,
          last_update as created_at
        FROM robots
        WHERE last_update < NOW() - INTERVAL '2 hours'
          AND status != 'offline'
      )
      SELECT * FROM alerts
      ORDER BY 
        CASE severity 
          WHEN 'critical' THEN 1 
          WHEN 'warning' THEN 2 
          WHEN 'info' THEN 3 
        END,
        created_at DESC
      LIMIT 10
    `;

    const result = await pool.query(query);
    return result.rows;
  }
}

// Экспорт singleton instance
export const cachedDashboardService = new CachedDashboardService();

