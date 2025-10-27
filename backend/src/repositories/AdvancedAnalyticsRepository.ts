import { pool } from '../config/database';

export interface AdvancedTrendData {
  data: any[];
  products: string[];
  period_days: number;
  generated_at: string;
}

export interface EfficiencyData {
  robot_id: string;
  scans_count: number;
  avg_time_per_scan: number;
  zones_covered: number;
  efficiency_score: number;
}

export interface AIInsight {
  category: string;
  title: string;
  description: string;
  priority: string;
  expected_impact: string;
}

export class AdvancedAnalyticsRepository {
  // Получение топ товаров по активности
  async getTopProducts(limit: number = 5): Promise<string[]> {
    const query = `
      SELECT product_id 
      FROM inventory_history 
      WHERE scanned_at >= NOW() - INTERVAL '30 days'
      GROUP BY product_id 
      ORDER BY COUNT(*) DESC 
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    return result.rows.map(row => row.product_id);
  }

  // Получение расширенных трендов
  async getEnhancedTrends(productIds: string[], periodDays: number = 30): Promise<AdvancedTrendData> {
    const query = `
      SELECT 
        DATE(ih.scanned_at) as date,
        p.id as product_id,
        p.name as product_name,
        AVG(ih.quantity) as avg_quantity,
        COUNT(*) as scan_count
      FROM inventory_history ih
      LEFT JOIN products p ON ih.product_id = p.id
      WHERE 
        p.id = ANY($1) 
        AND ih.scanned_at >= NOW() - INTERVAL '${periodDays} days'
      GROUP BY DATE(ih.scanned_at), p.id, p.name
      ORDER BY date ASC
    `;

    const result = await pool.query(query, [productIds]);
    
    // Форматируем данные для расширенного графика
    const formattedData = this.formatEnhancedChartData(result.rows, productIds);

    return {
      data: formattedData.chartData,
      products: formattedData.products,
      period_days: periodDays,
      generated_at: new Date().toISOString()
    };
  }

  // Получение данных об эффективности роботов
  async getEfficiencyData(periodDays: number = 7): Promise<EfficiencyData[]> {
    const query = `
      SELECT 
        r.id as robot_id,
        COUNT(ih.id) as scans_count,
        AVG(EXTRACT(EPOCH FROM (next_scan - ih.scanned_at)) / 60) as avg_time_per_scan,
        COUNT(DISTINCT ih.zone) as zones_covered
      FROM robots r
      LEFT JOIN inventory_history ih ON r.id = ih.robot_id
      LEFT JOIN LATERAL (
        SELECT scanned_at as next_scan
        FROM inventory_history ih2
        WHERE ih2.robot_id = ih.robot_id 
        AND ih2.scanned_at > ih.scanned_at
        ORDER BY ih2.scanned_at ASC
        LIMIT 1
      ) next_scan ON true
      WHERE ih.scanned_at >= NOW() - INTERVAL '${periodDays} days'
      GROUP BY r.id
      ORDER BY scans_count DESC
    `;

    const result = await pool.query(query);
    
    return result.rows.map(row => ({
      robot_id: row.robot_id,
      scans_count: parseInt(row.scans_count) || 0,
      avg_time_per_scan: Math.round(parseFloat(row.avg_time_per_scan) * 10) / 10 || 0,
      zones_covered: parseInt(row.zones_covered) || 0,
      efficiency_score: this.calculateEfficiencyScore(
        parseInt(row.scans_count) || 0,
        parseFloat(row.avg_time_per_scan) || 0,
        parseInt(row.zones_covered) || 0
      )
    }));
  }

  // Получение критических остатков
  async getCriticalStock(): Promise<any[]> {
    const query = `
      SELECT 
        p.id as product_id,
        p.name as product_name,
        COALESCE(SUM(ih.quantity), 0) as current_stock,
        p.min_stock,
        p.optimal_stock
      FROM products p
      LEFT JOIN inventory_history ih ON p.id = ih.product_id
      WHERE ih.scanned_at >= NOW() - INTERVAL '7 days'
      GROUP BY p.id, p.name, p.min_stock, p.optimal_stock
      HAVING COALESCE(SUM(ih.quantity), 0) <= p.min_stock
      ORDER BY current_stock ASC
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  // Получение проблем с роботами
  async getRobotIssues(): Promise<any[]> {
    const query = `
      SELECT 
        r.id as robot_id,
        r.status,
        r.battery_level,
        r.last_update,
        CASE 
          WHEN r.battery_level < 20 THEN 'LOW_BATTERY'
          WHEN r.last_update < NOW() - INTERVAL '1 hour' THEN 'OFFLINE'
          WHEN r.status = 'charging' AND r.last_update < NOW() - INTERVAL '2 hours' THEN 'CHARGING_ISSUE'
          ELSE 'OK'
        END as issue_type
      FROM robots r
      WHERE r.battery_level < 20 
         OR r.last_update < NOW() - INTERVAL '1 hour'
         OR (r.status = 'charging' AND r.last_update < NOW() - INTERVAL '2 hours')
      ORDER BY r.battery_level ASC
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  // Получение уведомлений
  async getNotifications(limit: number = 20): Promise<any[]> {
    const query = `
      SELECT 
        'LOW_STOCK' as type,
        p.name as message,
        ih.scanned_at as created_at,
        'HIGH' as priority
      FROM inventory_history ih
      LEFT JOIN products p ON ih.product_id = p.id
      WHERE ih.status IN ('LOW_STOCK', 'CRITICAL')
      AND ih.scanned_at >= NOW() - INTERVAL '24 hours'
      
      UNION ALL
      
      SELECT 
        'ROBOT_ISSUE' as type,
        CONCAT('Robot ', r.id, ' has low battery') as message,
        r.last_update as created_at,
        'MEDIUM' as priority
      FROM robots r
      WHERE r.battery_level < 20
      AND r.last_update >= NOW() - INTERVAL '24 hours'
      
      ORDER BY created_at DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  // Получение статистики склада для AI инсайтов
  async getWarehouseStatsForAI(): Promise<{
    total_scans: number;
    unique_products: number;
    active_robots: number;
    avg_quantity: number;
  }> {
    const query = `
      SELECT 
        COUNT(ih.id) as total_scans,
        COUNT(DISTINCT ih.product_id) as unique_products,
        COUNT(DISTINCT ih.robot_id) as active_robots,
        AVG(ih.quantity) as avg_quantity
      FROM inventory_history ih
      WHERE ih.scanned_at >= NOW() - INTERVAL '24 hours'
    `;

    const result = await pool.query(query);
    return {
      total_scans: parseInt(result.rows[0].total_scans) || 0,
      unique_products: parseInt(result.rows[0].unique_products) || 0,
      active_robots: parseInt(result.rows[0].active_robots) || 0,
      avg_quantity: Math.round(parseFloat(result.rows[0].avg_quantity) * 10) / 10 || 0
    };
  }

  // Вспомогательная функция для форматирования данных расширенного графика
  private formatEnhancedChartData(rows: any[], productIds: string[]) {
    const dates = [...new Set(rows.map(row => row.date))].sort();
    const products = [...new Set(rows.map(row => row.product_name))];
    
    const chartData: any[] = [];
    
    dates.forEach(date => {
      const dayData: any = { date };
      
      products.forEach(product => {
        const productData = rows.find(row => 
          row.date === date && row.product_name === product
        );
        dayData[product] = productData ? Math.round(productData.avg_quantity) : 0;
      });
      
      chartData.push(dayData);
    });

    return {
      chartData,
      products,
      dates
    };
  }

  // Расчет показателя эффективности робота
  private calculateEfficiencyScore(scansCount: number, avgTimePerScan: number, zonesCovered: number): number {
    // Простая формула эффективности (можно улучшить)
    const timeScore = avgTimePerScan > 0 ? Math.max(0, 10 - avgTimePerScan / 5) : 0;
    const scanScore = Math.min(10, scansCount / 10);
    const zoneScore = Math.min(10, zonesCovered * 2);
    
    return Math.round((timeScore + scanScore + zoneScore) / 3 * 10) / 10;
  }
}

export const advancedAnalyticsRepository = new AdvancedAnalyticsRepository();

