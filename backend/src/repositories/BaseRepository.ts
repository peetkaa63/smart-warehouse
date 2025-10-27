import { pool } from '../config/database';

// Базовый интерфейс для всех репозиториев
export interface IBaseRepository<T> {
  findById(id: number | string): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(entity: Partial<T>): Promise<T>;
  update(id: number | string, entity: Partial<T>): Promise<T | null>;
  delete(id: number | string): Promise<boolean>;
}

// Базовый класс репозитория с общей логикой
export abstract class BaseRepository<T> implements IBaseRepository<T> {
  protected tableName: string;
  protected primaryKey: string = 'id';

  constructor(tableName: string, primaryKey: string = 'id') {
    this.tableName = tableName;
    this.primaryKey = primaryKey;
  }

  // Общие методы для работы с БД
  protected async query(text: string, params?: any[]): Promise<any> {
    try {
      const result = await pool.query(text, params);
      return result;
    } catch (error) {
      console.error(`Database query error in ${this.tableName}:`, error);
      throw error;
    }
  }

  // Базовые CRUD операции
  async findById(id: number | string): Promise<T | null> {
    const result = await this.query(
      `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async findAll(): Promise<T[]> {
    const result = await this.query(`SELECT * FROM ${this.tableName}`);
    return result.rows;
  }

  async create(entity: Partial<T>): Promise<T> {
    const columns = Object.keys(entity).join(', ');
    const values = Object.values(entity);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    
    const result = await this.query(
      `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async update(id: number | string, entity: Partial<T>): Promise<T | null> {
    const columns = Object.keys(entity);
    const values = Object.values(entity);
    const setClause = columns.map((col, index) => `${col} = $${index + 2}`).join(', ');
    
    const result = await this.query(
      `UPDATE ${this.tableName} SET ${setClause} WHERE ${this.primaryKey} = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] || null;
  }

  async delete(id: number | string): Promise<boolean> {
    const result = await this.query(
      `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = $1`,
      [id]
    );
    return result.rowCount > 0;
  }

  // Метод для выполнения сложных запросов
  protected async executeQuery(query: string, params?: any[]): Promise<any> {
    return await this.query(query, params);
  }
}

