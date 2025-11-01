import { pool } from '../config/database';

export interface ReplenishmentSuggestion {
  product_id: string;
  zone: string;
  qty: number;
}

export class InventoryRepository {
  // Получение предложений по пополнению (низкий запас)
  async getLowStockSuggestions(limit: number = 5): Promise<ReplenishmentSuggestion[]> {
    const result = await pool.query(`
      SELECT product_id, zone, SUM(quantity) as qty
      FROM inventory_history
      WHERE status IN ('LOW_STOCK','CRITICAL') AND scanned_at > NOW() - INTERVAL '1 day'
      GROUP BY product_id, zone
      ORDER BY qty ASC
      LIMIT $1
    `, [limit]);
    return result.rows;
  }

  // Получение предложений по избыточным запасам (surplus)
  async getSurplusSuggestions(limit: number = 5): Promise<ReplenishmentSuggestion[]> {
    const result = await pool.query(`
      SELECT product_id, zone, SUM(quantity) as qty
      FROM inventory_history
      WHERE status = 'OK' AND scanned_at > NOW() - INTERVAL '1 day'
      GROUP BY product_id, zone
      ORDER BY qty DESC
      LIMIT $1
    `, [limit]);
    return result.rows;
  }
}

export const inventoryRepository = new InventoryRepository();

