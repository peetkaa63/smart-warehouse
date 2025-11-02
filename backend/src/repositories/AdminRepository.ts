import { pool } from '../config/database';

export interface ProductLimit {
  id: string;
  name: string;
  min_stock: number;
  optimal_stock: number;
  category?: string;
}

export interface Thresholds {
  critical: number;
  low_stock: number;
  warning: number;
}

export interface Robot {
  id: string;
  name?: string;
  status: string;
  battery?: number;
  zone?: string;
  last_maintenance?: string;
  next_maintenance?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  blocked: boolean;
}

export class AdminRepository {
  // Управление товарными лимитами
  async getProductLimits(): Promise<ProductLimit[]> {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.name,
        COALESCE(p.min_stock, 10) as min_stock,
        COALESCE(p.optimal_stock, 50) as optimal_stock,
        p.category
      FROM products p
      ORDER BY p.name
    `);
    return result.rows;
  }

  async updateProductLimits(productId: string, minStock: number, optimalStock: number): Promise<void> {
    await pool.query(`
      UPDATE products 
      SET min_stock = $1, optimal_stock = $2 
      WHERE id = $3
    `, [minStock, optimalStock, productId]);
  }

  async getThresholds(): Promise<Thresholds> {
	  try {
		const result = await pool.query(`
		  SELECT key, value FROM settings WHERE key IN ('threshold_critical', 'threshold_low_stock', 'threshold_warning')
		`);
		
		const thresholds: Thresholds = { critical: 10, low_stock: 30, warning: 50 };
		result.rows.forEach((row: any) => {
		  const key = row.key.replace('threshold_', '') as keyof Thresholds;
		  thresholds[key] = Number(row.value);
		});
		return thresholds;
	  } catch (error) {
		// Если таблицы settings нет, возвращаем значения по умолчанию
		return { critical: 10, low_stock: 30, warning: 50 };
	  }
	}

  async saveThresholds(thresholds: Thresholds): Promise<void> {
    try {
      // Создаем таблицу если её нет
      await pool.query(`
        CREATE TABLE IF NOT EXISTS settings (
          key VARCHAR(255) PRIMARY KEY,
          value TEXT
        )
      `);
      
      await pool.query(`
        INSERT INTO settings (key, value) VALUES 
          ('threshold_critical', $1),
          ('threshold_low_stock', $2),
          ('threshold_warning', $3)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `, [thresholds.critical.toString(), thresholds.low_stock.toString(), thresholds.warning.toString()]);
    } catch (error) {
      console.error('Error saving thresholds:', error);
      throw error;
    }
  }

  // Управление роботами
  async getRobots(): Promise<Robot[]> {
    const result = await pool.query(`
      SELECT 
        r.id,
        r.name,
        r.status,
        r.battery_level as battery,
        r.zone,
        r.last_maintenance,
        r.next_maintenance
      FROM robots r
      ORDER BY r.id
    `);
    return result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      battery: row.battery ? Number(row.battery) : undefined,
      zone: row.zone,
      last_maintenance: row.last_maintenance ? new Date(row.last_maintenance).toISOString() : undefined,
      next_maintenance: row.next_maintenance ? new Date(row.next_maintenance).toISOString() : undefined
    }));
  }

  async createRobot(robotId: string, name?: string, zone?: string): Promise<void> {
    await pool.query(`
      INSERT INTO robots (id, name, zone, status, battery_level)
      VALUES ($1, $2, $3, 'active', 100)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, zone = EXCLUDED.zone
    `, [robotId, name || null, zone || null]);
  }

  async deleteRobot(robotId: string): Promise<void> {
    await pool.query(`DELETE FROM robots WHERE id = $1`, [robotId]);
  }

  async scheduleMaintenance(robotId: string, date: string): Promise<void> {
    await pool.query(`
      UPDATE robots 
      SET next_maintenance = $1 
      WHERE id = $2
    `, [new Date(date), robotId]);
  }

  // Управление пользователями
  async getUsers(): Promise<User[]> {
    const result = await pool.query(`
      SELECT 
        id,
        name,
        email,
        role,
        COALESCE(blocked, false) as blocked
      FROM users
      ORDER BY name
    `);
    return result.rows.map((row: any) => ({
      id: Number(row.id),
      name: row.name,
      email: row.email,
      role: row.role,
      blocked: Boolean(row.blocked)
    }));
  }

  async createUser(userData: { name: string; email: string; password: string; role: string }): Promise<User> {
    const result = await pool.query(`
      INSERT INTO users (name, email, password_hash, role, blocked)
      VALUES ($1, $2, crypt($3, gen_salt('bf')), $4, false)
      RETURNING id, name, email, role, blocked
    `, [userData.name, userData.email, userData.password, userData.role]);
    
    const row = result.rows[0];
    return {
      id: Number(row.id),
      name: row.name,
      email: row.email,
      role: row.role,
      blocked: Boolean(row.blocked)
    };
  }

  async updateUserRole(userId: number, role: string): Promise<void> {
    await pool.query(`
      UPDATE users 
      SET role = $1 
      WHERE id = $2
    `, [role, userId]);
  }

  async toggleUserBlock(userId: number, blocked: boolean): Promise<void> {
    await pool.query(`
      UPDATE users 
      SET blocked = $1 
      WHERE id = $2
    `, [blocked, userId]);
  }
}

export const adminRepository = new AdminRepository();

