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
      SELECT 
        ih.product_id,
        p.name as product_name,
        ih.zone,
        ih.row_number,
        ih.shelf_number,
        ih.quantity as qty,
        ih.status,
        ih.scanned_at,
        MAX(ih.scanned_at) OVER (PARTITION BY ih.product_id, ih.zone) as last_scan
      FROM inventory_history ih
      LEFT JOIN products p ON ih.product_id = p.id
      INNER JOIN (
        SELECT product_id, zone, MAX(scanned_at) as max_scanned_at
        FROM inventory_history
        WHERE status IN ('LOW_STOCK','CRITICAL','WARNING') 
          AND scanned_at > NOW() - INTERVAL '7 days'
        GROUP BY product_id, zone
      ) latest ON ih.product_id = latest.product_id 
        AND ih.zone = latest.zone 
        AND ih.scanned_at = latest.max_scanned_at
      WHERE ih.status IN ('LOW_STOCK','CRITICAL','WARNING')
      ORDER BY 
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
      SELECT 
        ih.product_id,
        p.name as product_name,
        ih.zone,
        ih.row_number,
        ih.shelf_number,
        ih.quantity as qty,
        ih.status,
        ih.scanned_at,
        MAX(ih.scanned_at) OVER (PARTITION BY ih.product_id, ih.zone) as last_scan,
        AVG(prev_avg.avg_qty) as avg_quantity
      FROM inventory_history ih
      LEFT JOIN products p ON ih.product_id = p.id
      INNER JOIN (
        SELECT product_id, zone, MAX(scanned_at) as max_scanned_at
        FROM inventory_history
        WHERE status = 'OK' 
          AND scanned_at > NOW() - INTERVAL '7 days'
          AND quantity > 50
        GROUP BY product_id, zone
      ) latest ON ih.product_id = latest.product_id 
        AND ih.zone = latest.zone 
        AND ih.scanned_at = latest.max_scanned_at
      LEFT JOIN (
        SELECT product_id, zone, AVG(quantity) as avg_qty
        FROM inventory_history
        WHERE scanned_at > NOW() - INTERVAL '30 days'
        GROUP BY product_id, zone
      ) prev_avg ON ih.product_id = prev_avg.product_id AND ih.zone = prev_avg.zone
      WHERE ih.status = 'OK' AND ih.quantity > 50
      ORDER BY ih.quantity DESC, ih.scanned_at DESC
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

