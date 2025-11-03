import { pool } from '../config/database';

export interface UploadResult {
  success: boolean;
  processed_rows: number;
  errors: string[];
  message: string;
}

export interface ExportData {
  data: any[];
  filename: string;
  format: 'excel' | 'pdf';
}

export class UploadRepository {
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

  // Создание нового продукта
  async createProduct(productData: {
    id: string;
    name: string;
    category?: string;
    min_stock?: number;
    optimal_stock?: number;
  }): Promise<void> {
    await pool.query(`
      INSERT INTO products (id, name, category, min_stock, optimal_stock)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        min_stock = EXCLUDED.min_stock,
        optimal_stock = EXCLUDED.optimal_stock
    `, [
      productData.id,
      productData.name,
      productData.category || 'Unknown',
      productData.min_stock || 10,
      productData.optimal_stock || 50
    ]);
  }

  // Создание нового робота
  async createRobot(robotData: {
    id: string;
    status: string;
    battery_level: number;
    current_zone: string;
    current_row: number;
    current_shelf: number;
  }): Promise<void> {
    await pool.query(`
      INSERT INTO robots (id, status, battery_level, last_update, current_zone, current_row, current_shelf)
      VALUES ($1, $2, $3, NOW(), $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        battery_level = EXCLUDED.battery_level,
        last_update = NOW(),
        current_zone = EXCLUDED.current_zone,
        current_row = EXCLUDED.current_row,
        current_shelf = EXCLUDED.current_shelf
    `, [
      robotData.id,
      robotData.status,
      robotData.battery_level,
      robotData.current_zone,
      robotData.current_row,
      robotData.current_shelf
    ]);
  }

  // Проверка существования дубликата записи сканирования (в пределах 1 минуты)
  async checkDuplicateScan(scanData: {
    robot_id: string;
    product_id: string;
    scanned_at: Date;
  }): Promise<boolean> {
    const query = `
      SELECT 1 FROM inventory_history
      WHERE robot_id = $1 
        AND product_id = $2 
        AND ABS(EXTRACT(EPOCH FROM (scanned_at - $3))) <= 60
      LIMIT 1
    `;
    const result = await pool.query(query, [
      scanData.robot_id,
      scanData.product_id,
      scanData.scanned_at
    ]);
    return result.rows.length > 0;
  }

  // Сохранение данных сканирования
  async saveScanData(scanData: {
    robot_id: string;
    product_id: string;
    quantity: number;
    zone: string;
    row_number: number;
    shelf_number: number;
    status: string;
    scanned_at: Date;
  }): Promise<void> {
    await pool.query(`
      INSERT INTO inventory_history 
      (robot_id, product_id, quantity, zone, row_number, shelf_number, status, scanned_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      scanData.robot_id,
      scanData.product_id,
      scanData.quantity,
      scanData.zone,
      scanData.row_number,
      scanData.shelf_number,
      scanData.status,
      scanData.scanned_at
    ]);
  }

  // Получение всех продуктов для валидации
  async getAllProducts(): Promise<Array<{ id: string; name: string }>> {
    const query = `SELECT id, name FROM products ORDER BY name`;
    const result = await pool.query(query);
    return result.rows;
  }

  // Получение всех роботов для валидации
  async getAllRobots(): Promise<Array<{ id: string; status: string }>> {
    const query = `SELECT id, status FROM robots ORDER BY id`;
    const result = await pool.query(query);
    return result.rows;
  }
}

export class ExportRepository {
  // Получение данных для экспорта в Excel
  async getExportData(filters: {
    from?: string;
    to?: string;
    zone?: string;
    status?: string;
    product_id?: string;
    robot_id?: string;
  }): Promise<any[]> {
    let query = `
      SELECT 
        ih.id,
        ih.scanned_at as "scannedAt",
        r.id as "robotId",
        ih.zone,
        p.id as "productId",
        p.name as "productName",
        ih.quantity,
        ih.status,
        ih.row_number as "rowNumber",
        ih.shelf_number as "shelfNumber"
      FROM inventory_history ih
      LEFT JOIN robots r ON ih.robot_id = r.id
      LEFT JOIN products p ON ih.product_id = p.id
      WHERE 1=1
    `;
    
    const params: any[] = [];

    // Добавляем фильтры
    if (filters.from && typeof filters.from === 'string' && filters.from.trim() !== '') {
      params.push(new Date(filters.from));
      query += ` AND ih.scanned_at >= $${params.length}`;
    }

    if (filters.to && typeof filters.to === 'string' && filters.to.trim() !== '') {
      params.push(new Date(filters.to));
      query += ` AND ih.scanned_at <= $${params.length}`;
    }

    if (filters.zone && typeof filters.zone === 'string' && filters.zone.trim() !== '') {
      params.push(filters.zone);
      query += ` AND ih.zone = $${params.length}`;
    }

    if (filters.status && typeof filters.status === 'string' && filters.status.trim() !== '') {
      params.push(filters.status);
      query += ` AND ih.status = $${params.length}`;
    }

    if (filters.product_id && typeof filters.product_id === 'string' && filters.product_id.trim() !== '') {
      params.push(filters.product_id);
      query += ` AND ih.product_id = $${params.length}`;
    }

    if (filters.robot_id && typeof filters.robot_id === 'string' && filters.robot_id.trim() !== '') {
      params.push(filters.robot_id);
      query += ` AND ih.robot_id = $${params.length}`;
    }

    query += ` ORDER BY ih.scanned_at DESC LIMIT 5000`; // Лимит для Excel

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Получение данных для экспорта в PDF (по умолчанию ограниченное количество)
  async getExportDataForPDF(filters: {
    from?: string;
    to?: string;
    zone?: string;
    status?: string;
    product_id?: string;
    robot_id?: string;
  }, unlimited: boolean = false): Promise<any[]> {
    let query = `
      SELECT 
        ih.id,
        ih.scanned_at as "scannedAt",
        r.id as "robotId",
        ih.zone,
        p.id as "productId",
        p.name as "productName",
        ih.quantity,
        ih.status,
        ih.row_number as "rowNumber",
        ih.shelf_number as "shelfNumber"
      FROM inventory_history ih
      LEFT JOIN robots r ON ih.robot_id = r.id
      LEFT JOIN products p ON ih.product_id = p.id
      WHERE 1=1
    `;
    
    const params: any[] = [];

    // Добавляем фильтры
    if (filters.from && typeof filters.from === 'string' && filters.from.trim() !== '') {
      params.push(new Date(filters.from));
      query += ` AND ih.scanned_at >= $${params.length}`;
    }

    if (filters.to && typeof filters.to === 'string' && filters.to.trim() !== '') {
      params.push(new Date(filters.to));
      query += ` AND ih.scanned_at <= $${params.length}`;
    }

    if (filters.zone && typeof filters.zone === 'string' && filters.zone.trim() !== '') {
      params.push(filters.zone);
      query += ` AND ih.zone = $${params.length}`;
    }

    if (filters.status && typeof filters.status === 'string' && filters.status.trim() !== '') {
      params.push(filters.status);
      query += ` AND ih.status = $${params.length}`;
    }

    if (filters.product_id && typeof filters.product_id === 'string' && filters.product_id.trim() !== '') {
      params.push(filters.product_id);
      query += ` AND ih.product_id = $${params.length}`;
    }

    if (filters.robot_id && typeof filters.robot_id === 'string' && filters.robot_id.trim() !== '') {
      params.push(filters.robot_id);
      query += ` AND ih.robot_id = $${params.length}`;
    }

    query += ` ORDER BY ih.scanned_at DESC`;
    if (!unlimited) {
      query += ` LIMIT 1000`;
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Пакетная выборка для CSV/Excel экспорта
  async getExportDataBatch(
    filters: {
      from?: string;
      to?: string;
      zone?: string;
      status?: string;
      product_id?: string;
      robot_id?: string;
    },
    limit: number,
    offset: number,
    unlimited: boolean = false
  ): Promise<any[]> {
    let query = `
      SELECT 
        ih.id,
        ih.scanned_at as "scannedAt",
        r.id as "robotId",
        ih.zone,
        p.id as "productId",
        p.name as "productName",
        ih.quantity,
        ih.status,
        ih.row_number as "rowNumber",
        ih.shelf_number as "shelfNumber"
      FROM inventory_history ih
      LEFT JOIN robots r ON ih.robot_id = r.id
      LEFT JOIN products p ON ih.product_id = p.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (filters.from && typeof filters.from === 'string' && filters.from.trim() !== '') {
      params.push(new Date(filters.from));
      query += ` AND ih.scanned_at >= $${params.length}`;
    }
    if (filters.to && typeof filters.to === 'string' && filters.to.trim() !== '') {
      params.push(new Date(filters.to));
      query += ` AND ih.scanned_at <= $${params.length}`;
    }
    if (filters.zone && typeof filters.zone === 'string' && filters.zone.trim() !== '') {
      params.push(filters.zone);
      query += ` AND ih.zone = $${params.length}`;
    }
    if (filters.status && typeof filters.status === 'string' && filters.status.trim() !== '') {
      params.push(filters.status);
      query += ` AND ih.status = $${params.length}`;
    }
    if (filters.product_id && typeof filters.product_id === 'string' && filters.product_id.trim() !== '') {
      params.push(filters.product_id);
      query += ` AND ih.product_id = $${params.length}`;
    }
    if (filters.robot_id && typeof filters.robot_id === 'string' && filters.robot_id.trim() !== '') {
      params.push(filters.robot_id);
      query += ` AND ih.robot_id = $${params.length}`;
    }

    query += ` ORDER BY ih.scanned_at DESC`;

    // If not unlimited, hard cap at 5000 overall
    if (!unlimited) {
      // Stop serving beyond cap
      if (offset >= 5000) {
        return [];
      }
      const remaining = Math.max(0, 5000 - offset);
      const effectiveLimit = Math.min(limit, remaining);
      query += ` LIMIT ${effectiveLimit} OFFSET ${offset}`;
    } else {
      query += ` LIMIT ${limit} OFFSET ${offset}`;
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Получение статистики для экспорта
  async getExportStats(filters: {
    from?: string;
    to?: string;
  }): Promise<{
    total_scans: number;
    unique_products: number;
    discrepancies: number;
    avg_zone_time: number;
    limited_data?: boolean;
    total_records_count?: number;
  }> {
    let statsQuery = `
      SELECT 
        COUNT(*) as total_scans,
        COUNT(DISTINCT product_id) as unique_products,
        COUNT(CASE WHEN status IN ('LOW_STOCK', 'CRITICAL') THEN 1 END) as discrepancies
      FROM inventory_history
      WHERE 1=1
    `;

    const params: any[] = [];

    if (filters.from && typeof filters.from === 'string' && filters.from.trim() !== '') {
      params.push(new Date(filters.from));
      statsQuery += ` AND scanned_at >= $${params.length}`;
    }

    if (filters.to && typeof filters.to === 'string' && filters.to.trim() !== '') {
      params.push(new Date(filters.to));
      statsQuery += ` AND scanned_at <= $${params.length}`;
    }

    const statsResult = await pool.query(statsQuery, params);

    // Расчет среднего времени инвентаризации зоны
    let timeQuery = `
      SELECT 
        COALESCE(AVG(time_diff), 0) as avg_zone_time
      FROM (
        SELECT 
          EXTRACT(EPOCH FROM (next_scan - scanned_at)) / 60 as time_diff
        FROM (
          SELECT 
            robot_id,
            zone,
            scanned_at,
            LEAD(scanned_at) OVER (PARTITION BY robot_id, zone ORDER BY scanned_at) as next_scan
          FROM inventory_history
          WHERE scanned_at IS NOT NULL
        ) time_data
        WHERE next_scan IS NOT NULL
        AND EXTRACT(EPOCH FROM (next_scan - scanned_at)) BETWEEN 60 AND 3600
    `;

    const timeParams: any[] = [];

    if (filters.from && typeof filters.from === 'string' && filters.from.trim() !== '') {
      timeParams.push(new Date(filters.from));
      timeQuery += ` AND scanned_at >= $${timeParams.length}`;
    }

    if (filters.to && typeof filters.to === 'string' && filters.to.trim() !== '') {
      timeParams.push(new Date(filters.to));
      timeQuery += ` AND scanned_at <= $${timeParams.length}`;
    }

    timeQuery += ` ) valid_times`;

    const timeResult = await pool.query(timeQuery, timeParams);

    // Получаем общее количество записей для информации
    let countQuery = `SELECT COUNT(*) as total_count FROM inventory_history WHERE 1=1`;
    const countParams: any[] = [];

    if (filters.from && typeof filters.from === 'string' && filters.from.trim() !== '') {
      countParams.push(new Date(filters.from));
      countQuery += ` AND scanned_at >= $${countParams.length}`;
    }

    if (filters.to && typeof filters.to === 'string' && filters.to.trim() !== '') {
      countParams.push(new Date(filters.to));
      countQuery += ` AND scanned_at <= $${countParams.length}`;
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalRecords = parseInt(countResult.rows[0].total_count) || 0;
    const limitedData = totalRecords > 1000;

    return {
      total_scans: parseInt(statsResult.rows[0].total_scans) || 0,
      unique_products: parseInt(statsResult.rows[0].unique_products) || 0,
      discrepancies: parseInt(statsResult.rows[0].discrepancies) || 0,
      avg_zone_time: Math.round(parseFloat(timeResult.rows[0]?.avg_zone_time) * 10) / 10 || 0,
      limited_data: limitedData,
      total_records_count: totalRecords
    };
  }
}

export const uploadRepository = new UploadRepository();
export const exportRepository = new ExportRepository();