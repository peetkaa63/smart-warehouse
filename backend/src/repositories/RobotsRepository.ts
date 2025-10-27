import { pool } from '../config/database';

export interface RobotData {
  id: string;
  status: string;
  battery_level: number;
  last_update: Date;
  current_zone: string;
  current_row: number;
  current_shelf: number;
}

export interface ScanResult {
  robot_id: string;
  product_id: string;
  quantity: number;
  zone: string;
  row_number: number;
  shelf_number: number;
  status: string;
  scanned_at: Date;
}

export class RobotsRepository {
  // Обновление данных робота
  async updateRobot(robotData: {
    id: string;
    status: string;
    battery_level: number;
    last_update: Date;
    current_zone: string;
    current_row: number;
    current_shelf: number;
  }): Promise<void> {
    await pool.query(`
      INSERT INTO robots (id, status, battery_level, last_update, current_zone, current_row, current_shelf)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        battery_level = EXCLUDED.battery_level,
        last_update = EXCLUDED.last_update,
        current_zone = EXCLUDED.current_zone,
        current_row = EXCLUDED.current_row,
        current_shelf = EXCLUDED.current_shelf
    `, [
      robotData.id,
      robotData.status,
      robotData.battery_level,
      robotData.last_update,
      robotData.current_zone,
      robotData.current_row,
      robotData.current_shelf
    ]);
  }

  // Сохранение результатов сканирования
  async saveScanResults(scanResults: ScanResult[]): Promise<void> {
    for (const scan of scanResults) {
      await pool.query(`
        INSERT INTO inventory_history 
        (robot_id, product_id, quantity, zone, row_number, shelf_number, status, scanned_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        scan.robot_id,
        scan.product_id,
        scan.quantity,
        scan.zone,
        scan.row_number,
        scan.shelf_number,
        scan.status,
        scan.scanned_at
      ]);
    }
  }

  // Получение всех роботов
  async getAllRobots(): Promise<RobotData[]> {
    const query = `
      SELECT 
        id,
        status,
        battery_level,
        last_update,
        current_zone,
        current_row,
        current_shelf
      FROM robots
      ORDER BY id
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  // Получение активных роботов
  async getActiveRobots(): Promise<RobotData[]> {
    const query = `
      SELECT 
        id,
        status,
        battery_level,
        last_update,
        current_zone,
        current_row,
        current_shelf
      FROM robots
      WHERE status = 'active'
      ORDER BY id
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  // Получение статистики роботов
  async getRobotsStats(): Promise<{
    total_robots: number;
    active_robots: number;
    charging_robots: number;
    avg_battery_level: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total_robots,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_robots,
        COUNT(CASE WHEN status = 'charging' THEN 1 END) as charging_robots,
        AVG(battery_level) as avg_battery_level
      FROM robots
    `;

    const result = await pool.query(query);
    return {
      total_robots: parseInt(result.rows[0].total_robots),
      active_robots: parseInt(result.rows[0].active_robots),
      charging_robots: parseInt(result.rows[0].charging_robots),
      avg_battery_level: Math.round(parseFloat(result.rows[0].avg_battery_level) * 10) / 10 || 0
    };
  }

  // Получение последних сканирований робота
  async getRobotRecentScans(robotId: string, limit: number = 10): Promise<any[]> {
    const query = `
      SELECT 
        ih.id,
        ih.scanned_at,
        ih.zone,
        p.id as product_id,
        p.name as product_name,
        ih.quantity,
        ih.status,
        ih.row_number,
        ih.shelf_number
      FROM inventory_history ih
      LEFT JOIN products p ON ih.product_id = p.id
      WHERE ih.robot_id = $1
      ORDER BY ih.scanned_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [robotId, limit]);
    return result.rows;
  }

  // Проверка существования робота
  async checkRobotExists(robotId: string): Promise<boolean> {
    const query = `SELECT 1 FROM robots WHERE id = $1 LIMIT 1`;
    const result = await pool.query(query, [robotId]);
    return result.rows.length > 0;
  }

  // Проверка существования продукта
  async checkProductExists(productId: string): Promise<boolean> {
    const query = `SELECT 1 FROM products WHERE id = $1 LIMIT 1`;
    const result = await pool.query(query, [productId]);
    return result.rows.length > 0;
  }
}

export const robotsRepository = new RobotsRepository();

