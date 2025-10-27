import { pool } from '../config/database';

export interface TrendData {
  data: any[];
  products: string[];
  period_days: number;
  generated_at: string;
}

export interface ProductStats {
  stats: any[];
  period_days: number;
}

export class AnalyticsRepository {
  // Получение данных для графика трендов
  async getTrendData(productIds: string[], periodDays: number = 7): Promise<TrendData> {
    const query = `
      SELECT 
        DATE(ih.scanned_at) as date,
        p.id as product_id,
        p.name as product_name,
        AVG(ih.quantity) as avg_quantity,
        COUNT(ih.id) as scan_count
      FROM inventory_history ih
      LEFT JOIN products p ON ih.product_id = p.id
      WHERE 
        p.id = ANY($1) 
        AND ih.scanned_at >= NOW() - INTERVAL '${periodDays} days'
      GROUP BY DATE(ih.scanned_at), p.id, p.name
      ORDER BY date ASC, p.name ASC
    `;

    const result = await pool.query(query, [productIds]);

    // Форматируем данные для графика
    const formattedData = this.formatChartData(result.rows, productIds);

    return {
      data: formattedData.chartData,
      products: formattedData.products,
      period_days: periodDays,
      generated_at: new Date().toISOString()
    };
  }

  // Получение списка товаров для выбора
  async getProducts(search?: string, limit: number = 50) {
    let query = `
      SELECT 
        id,
        name,
        category,
        min_stock,
        optimal_stock
      FROM products 
      WHERE 1=1
    `;
    
    const params: any[] = [];

    if (search && typeof search === 'string') {
      query += ` AND (name ILIKE $1 OR id ILIKE $1)`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY name ASC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);

    return {
      products: result.rows,
      total: result.rows.length
    };
  }

  // Получение статистики по товарам
  async getProductStats(productIds: string[], periodDays: number = 7): Promise<ProductStats> {
    const statsQuery = `
      SELECT 
        p.id as product_id,
        p.name as product_name,
        COUNT(ih.id) as total_scans,
        AVG(ih.quantity) as avg_quantity,
        MIN(ih.quantity) as min_quantity,
        MAX(ih.quantity) as max_quantity,
        SUM(CASE WHEN ih.status = 'CRITICAL' THEN 1 ELSE 0 END) as critical_count,
        SUM(CASE WHEN ih.status = 'LOW_STOCK' THEN 1 ELSE 0 END) as low_stock_count
      FROM inventory_history ih
      LEFT JOIN products p ON ih.product_id = p.id
      WHERE 
        p.id = ANY($1) 
        AND ih.scanned_at >= NOW() - INTERVAL '${periodDays} days'
      GROUP BY p.id, p.name
    `;

    const result = await pool.query(statsQuery, [productIds]);

    return {
      stats: result.rows,
      period_days: periodDays
    };
  }

  // Получение статистики склада
  async getWarehouseStats(periodDays: number = 7) {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_scans,
        COUNT(DISTINCT product_id) as unique_products,
        COUNT(DISTINCT robot_id) as active_robots,
        AVG(quantity) as avg_quantity
      FROM inventory_history
      WHERE scanned_at >= NOW() - INTERVAL '${periodDays} days'
    `;

    const result = await pool.query(statsQuery);

    return {
      total_scans: parseInt(result.rows[0].total_scans) || 0,
      unique_products: parseInt(result.rows[0].unique_products) || 0,
      active_robots: parseInt(result.rows[0].active_robots) || 0,
      avg_quantity: Math.round(parseFloat(result.rows[0].avg_quantity) * 10) / 10 || 0
    };
  }

  // Вспомогательная функция для форматирования данных графика
  private formatChartData(rows: any[], productIds: string[]) {
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
}

export const analyticsRepository = new AnalyticsRepository();

