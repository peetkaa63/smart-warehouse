import { pool } from '../config/database';

/**
 * Интерфейс прогноза AI
 */
export interface AIPrediction {
  product_id: string;
  prediction_date: string;
  days_until_stockout: number;
  recommended_order_quantity: number;
  confidence_score: number;
  created_at: string;
}

/**
 * Интерфейс исторических данных для AI
 */
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

/**
 * Репозиторий для работы с данными AI
 * 
 * Предоставляет методы для получения исторических данных и текущих остатков для AI анализа,
 * а также для сохранения и получения прогнозов AI
 */
export class AIRepository {
  /**
   * Получить исторические данные для AI анализа
   * @param periodDays - Период для получения данных в днях (по умолчанию 30)
   * @returns Массив исторических данных, сгруппированных по товарам
   */
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

  /**
   * Получить текущие остатки товаров
   * @returns Массив товаров с текущими остатками, минимальными и оптимальными уровнями, а также информацией о местоположении (зона, ряд, полка)
   */
  // Получение текущих остатков (последние данные для каждого товара из истории)
  async getCurrentStock(): Promise<any[]> {
    const query = `
      SELECT DISTINCT ON (p.id)
        p.id as product_id,
        p.name as product_name,
        COALESCE(latest.quantity, 0) as current_stock,
        COALESCE(p.min_stock, 10) as min_stock,
        COALESCE(p.optimal_stock, 50) as optimal_stock,
        latest.zone,
        latest.row_number,
        latest.shelf_number
      FROM products p
      LEFT JOIN LATERAL (
        SELECT quantity, scanned_at, zone, row_number, shelf_number
        FROM inventory_history ih
        WHERE ih.product_id = p.id
        ORDER BY ih.scanned_at DESC
        LIMIT 1
      ) latest ON true
      ORDER BY p.id
    `;

    const result = await pool.query(query);
    return result.rows.map((row: any) => ({
      product_id: row.product_id,
      product_name: row.product_name,
      current_stock: Number(row.current_stock) || 0,
      min_stock: Number(row.min_stock) || 0,
      optimal_stock: Number(row.optimal_stock) || 0,
      zone: row.zone,
      row_number: row.row_number,
      shelf_number: row.shelf_number
    }));
  }

  /**
   * Сохранить прогнозы AI в БД
   * @param predictions - Массив прогнозов для сохранения
   * @remarks Использует INSERT ... ON CONFLICT для обновления существующих прогнозов
   */
  // Сохранение прогнозов AI в БД
  async savePredictions(predictions: any[]): Promise<void> {
    for (const prediction of predictions) {
      try {
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
      } catch (error: any) {
        // Если нет нужного индекса (42P10) — пропускаем сохранение, чтобы не ломать основной сценарий
        if (error?.code === '42P10') {
          console.warn('⚠️ Skipping AI predictions upsert due to missing unique index. Prediction not persisted.');
          continue;
        }
        // Прочие ошибки не игнорируем
        throw error;
      }
    }
  }

  /**
   * Получить историю прогнозов AI
   * @param limit - Максимальное количество записей для возврата
   * @returns Массив последних прогнозов, отсортированных по дате создания (новые первыми)
   */
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

  /**
   * Очистить старые прогнозы (старше 1 часа)
   * @remarks Удаляет прогнозы, созданные более 1 часа назад, для предотвращения накопления устаревших данных
   */
  // Очистка старых прогнозов
  async cleanupOldPredictions(): Promise<void> {
    await pool.query('DELETE FROM ai_predictions WHERE created_at < NOW() - INTERVAL \'1 hour\'');
  }

  /**
   * Получить последние прогнозы для каждого товара
   * @returns Массив последних прогнозов по каждому товару (только последний прогноз для каждого product_id)
   */
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

  /**
   * Получить статус AI сервиса
   * @returns Объект с количеством прогнозов за последние 24 часа и датой последнего прогноза
   */
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

