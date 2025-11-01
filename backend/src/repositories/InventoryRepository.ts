import { pool } from '../config/database';

export interface ReplenishmentSuggestion {
  product_id: string;
  product_name: string;
  zone: string;
  qty: number;
  status: string;
  row_number?: number;
  shelf_number?: number;
  scanned_at?: string;
  last_scan?: string;
  avg_quantity?: number | null;
}

export class InventoryRepository {
  // Получение предложений по пополнению (низкий запас)
  async getLowStockSuggestions(limit: number = 10): Promise<ReplenishmentSuggestion[]> {
    const result = await pool.query(`
      SELECT DISTINCT ON (ih.product_id, ih.zone)
        ih.product_id,
        p.name as product_name,
        ih.zone,
        ih.row_number,
        ih.shelf_number,
        ih.quantity as qty,
        ih.status,
        ih.scanned_at,
        (
          SELECT MAX(scanned_at) 
          FROM inventory_history ih2 
          WHERE ih2.product_id = ih.product_id 
            AND ih2.zone = ih.zone
            AND ih2.status IN ('LOW_STOCK','CRITICAL','WARNING')
            AND ih2.scanned_at > NOW() - INTERVAL '7 days'
        ) as last_scan
      FROM inventory_history ih
      LEFT JOIN products p ON ih.product_id = p.id
      WHERE ih.status IN ('LOW_STOCK','CRITICAL','WARNING')
        AND ih.scanned_at > NOW() - INTERVAL '7 days'
      ORDER BY 
        ih.product_id,
        ih.zone,
        CASE ih.status 
          WHEN 'CRITICAL' THEN 1 
          WHEN 'LOW_STOCK' THEN 2 
          WHEN 'WARNING' THEN 3 
          ELSE 4 
        END,
        ih.quantity ASC,
        ih.scanned_at DESC
      LIMIT $1
    `, [limit]);
    return result.rows.map((row: any) => ({
      product_id: row.product_id,
      product_name: row.product_name || `Product ${row.product_id}`,
      zone: row.zone,
      qty: Number(row.qty) || 0,
      status: row.status,
      row_number: row.row_number,
      shelf_number: row.shelf_number,
      scanned_at: row.scanned_at ? new Date(row.scanned_at).toISOString() : undefined,
      last_scan: row.last_scan ? new Date(row.last_scan).toISOString() : undefined
    }));
  }

  // Получение предложений по избыточным запасам (surplus)
  async getSurplusSuggestions(limit: number = 10): Promise<ReplenishmentSuggestion[]> {
    const result = await pool.query(`
      SELECT DISTINCT ON (ih.product_id, ih.zone)
        ih.product_id,
        p.name as product_name,
        ih.zone,
        ih.row_number,
        ih.shelf_number,
        ih.quantity as qty,
        ih.status,
        ih.scanned_at,
        (
          SELECT MAX(scanned_at) 
          FROM inventory_history ih2 
          WHERE ih2.product_id = ih.product_id 
            AND ih2.zone = ih.zone
            AND ih2.status = 'OK'
            AND ih2.scanned_at > NOW() - INTERVAL '7 days'
        ) as last_scan,
        (
          SELECT AVG(quantity) 
          FROM inventory_history ih3 
          WHERE ih3.product_id = ih.product_id 
            AND ih3.zone = ih.zone
            AND ih3.scanned_at > NOW() - INTERVAL '30 days'
        ) as avg_quantity
      FROM inventory_history ih
      LEFT JOIN products p ON ih.product_id = p.id
      WHERE ih.status = 'OK' 
        AND ih.quantity > 50
        AND ih.scanned_at > NOW() - INTERVAL '7 days'
      ORDER BY 
        ih.product_id,
        ih.zone,
        ih.quantity DESC,
        ih.scanned_at DESC
      LIMIT $1
    `, [limit]);
    return result.rows.map((row: any) => ({
      product_id: row.product_id,
      product_name: row.product_name || `Product ${row.product_id}`,
      zone: row.zone,
      qty: Number(row.qty) || 0,
      status: row.status,
      row_number: row.row_number,
      shelf_number: row.shelf_number,
      scanned_at: row.scanned_at ? new Date(row.scanned_at).toISOString() : undefined,
      last_scan: row.last_scan ? new Date(row.last_scan).toISOString() : undefined,
      avg_quantity: row.avg_quantity ? Number(row.avg_quantity) : null
    }));
  }
}

export const inventoryRepository = new InventoryRepository();

