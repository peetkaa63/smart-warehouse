import { pool } from '../config/database';

export interface AIPrediction {
  product_id: string;
  prediction_date: string;
  days_until_stockout: number;
  recommended_order_quantity: number;
  confidence_score: number;
  created_at: string;
}

export interface HistoricalData {
  product_id: string;
  product_name: string;
  history: Array<{
    date: string;
    quantity: number;
    zone: string;
    status: string;
  }>;
}

export class AIRepository {
  // Получение исторических данных для AI анализа
  async getHistoricalData(periodDays: number = 30): Promise<HistoricalData[]> {
    const query = `
      SELECT 
        ih.product_id,
        p.name as product_name,
        ih.scanned_at,
        ih.quantity,
        ih.zone,
        ih.status
      FROM inventory_history ih
      LEFT JOIN products p ON ih.product_id = p.id
      WHERE ih.scanned_at >= NOW() - INTERVAL '${periodDays} days'
      ORDER BY ih.product_id, ih.scanned_at ASC
    `;

    const result = await pool.query(query);
    return this.prepareHistoricalData(result.rows);
  }

  // Получение текущих остатков
  async getCurrentStock(): Promise<any[]> {
    const query = `
      SELECT 
        p.id as product_id,
        p.name as product_name,
        COALESCE(SUM(ih.quantity), 0) as current_stock
      FROM products p
      LEFT JOIN inventory_history ih ON p.id = ih.product_id
      WHERE ih.scanned_at >= NOW() - INTERVAL '7 days'
      GROUP BY p.id, p.name
      ORDER BY p.name
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  // Сохранение прогнозов AI в БД
  async savePredictions(predictions: any[]): Promise<void> {
    for (const prediction of predictions) {
      await pool.query(`
        INSERT INTO ai_predictions (
          product_id,
          prediction_date,
          days_until_stockout,
          recommended_order,
          confidence_score,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (product_id, prediction_date) 
        DO UPDATE SET
          days_until_stockout = EXCLUDED.days_until_stockout,
          recommended_order = EXCLUDED.recommended_order,
          confidence_score = EXCLUDED.confidence_score,
          created_at = EXCLUDED.created_at
      `, [
        prediction.product_id,
        prediction.prediction_date || new Date().toISOString().split('T')[0],
        prediction.days_until_stockout,
        prediction.recommended_order_quantity,
        prediction.confidence_score,
        new Date()
      ]);
    }
  }

  // Получение истории прогнозов
  async getPredictionHistory(limit: number = 10): Promise<AIPrediction[]> {
    const query = `
      SELECT 
        product_id,
        prediction_date,
        days_until_stockout,
        recommended_order as recommended_order_quantity,
        confidence_score,
        created_at
      FROM ai_predictions
      ORDER BY created_at DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  // Очистка старых прогнозов
  async cleanupOldPredictions(): Promise<void> {
    await pool.query('DELETE FROM ai_predictions WHERE created_at < NOW() - INTERVAL \'1 hour\'');
  }

  // Получение последних прогнозов
  async getLatestPredictions(): Promise<AIPrediction[]> {
    const query = `
      SELECT DISTINCT ON (product_id)
        product_id,
        prediction_date,
        days_until_stockout,
        recommended_order as recommended_order_quantity,
        confidence_score,
        created_at
      FROM ai_predictions
      ORDER BY product_id, created_at DESC
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  // Получение статуса AI сервиса
  async getAIStatus(): Promise<{ predictions_count: number; last_prediction: string | null }> {
    const query = `
      SELECT 
        COUNT(*) as predictions_count,
        MAX(created_at) as last_prediction
      FROM ai_predictions
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `;

    const result = await pool.query(query);
    return {
      predictions_count: parseInt(result.rows[0].predictions_count),
      last_prediction: result.rows[0].last_prediction
    };
  }

  // Вспомогательная функция для подготовки исторических данных
  private prepareHistoricalData(rows: any[]): HistoricalData[] {
    const groupedData: { [key: string]: any[] } = {};

    rows.forEach(row => {
      if (!groupedData[row.product_id]) {
        groupedData[row.product_id] = [];
      }

      groupedData[row.product_id].push({
        date: row.scanned_at,
        quantity: row.quantity,
        zone: row.zone,
        status: row.status
      });
    });

    return Object.keys(groupedData).map(productId => ({
      product_id: productId,
      product_name: rows.find(r => r.product_id === productId)?.product_name,
      history: groupedData[productId]
    }));
  }
}

export const aiRepository = new AIRepository();

