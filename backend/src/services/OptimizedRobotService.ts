import { Server } from 'socket.io';
import { pool } from '../config/database';
import { NotificationManager, NotificationEventType } from '../sockets/NotificationObserver';

export class OptimizedRobotService {
  public io: Server;
  private notificationManager?: NotificationManager;

  constructor(io: Server, notificationManager?: NotificationManager) {
    this.io = io;
    this.notificationManager = notificationManager;
  }

  // ОПТИМИЗИРОВАННЫЙ МЕТОД: Объединенный запрос для всех dashboard данных
  async getDashboardStatsOptimized() {
    try {
      // Один запрос вместо 5 отдельных
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
    } catch (error) {
      console.error('Error fetching optimized dashboard stats:', error);
      return {
        activeRobots: 0,
        totalRobots: 0,
        scannedToday: 0,
        criticalStock: 0,
        avgBattery: 0
      };
    }
  }

  // ОПТИМИЗИРОВАННЫЙ МЕТОД: Получение роботов с кэшированием
  async getCurrentRobotsOptimized() {
    try {
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
    } catch (error) {
      console.error('Error fetching optimized robots:', error);
      return [];
    }
  }

  // ОПТИМИЗИРОВАННЫЙ МЕТОД: Получение последних сканирований
  async getRecentScansOptimized(limit = 20) {
    try {
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
    } catch (error) {
      console.error('Error fetching optimized recent scans:', error);
      return [];
    }
  }

  // ОПТИМИЗИРОВАННЫЙ МЕТОД: Объединенный dashboard update
  async broadcastDashboardUpdateOptimized() {
    try {
      // Используем Promise.all для параллельного выполнения
      const [robots, recentScans, statistics] = await Promise.all([
        this.getCurrentRobotsOptimized(),
        this.getRecentScansOptimized(),
        this.getDashboardStatsOptimized()
      ]);

      const dashboardData = {
        robots,
        recentScans,
        statistics,
        timestamp: new Date().toISOString()
      };

      this.io.to('dashboard').emit('dashboard_update', dashboardData);
      console.log('📊 Optimized dashboard update broadcasted');
    } catch (error) {
      console.error('Error broadcasting optimized dashboard update:', error);
    }
  }

  // НОВЫЙ МЕТОД: Получение статистики по зонам (для аналитики)
  async getZoneStatistics() {
    try {
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
    } catch (error) {
      console.error('Error fetching zone statistics:', error);
      return [];
    }
  }

  // НОВЫЙ МЕТОД: Получение трендов производительности
  async getPerformanceTrends(hours = 24) {
    try {
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
    } catch (error) {
      console.error('Error fetching performance trends:', error);
      return [];
    }
  }

  // НОВЫЙ МЕТОД: Получение алертов и предупреждений
  async getSystemAlerts() {
    try {
      const query = `
        WITH alerts AS (
          -- Роботы с низким зарядом
          SELECT 
            'low_battery' as alert_type,
            id as entity_id,
            'Robot ' || id || ' has low battery (' || battery_level || '%)' as message,
            'warning' as severity,
            last_update as created_at
          FROM robots
          WHERE battery_level < 20 AND status != 'offline'
          
          UNION ALL
          
          -- Критические товары
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
          
          -- Неактивные роботы
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
    } catch (error) {
      console.error('Error fetching system alerts:', error);
      return [];
    }
  }
}

