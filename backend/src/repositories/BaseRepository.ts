import { pool } from '../config/database';

/**
 * Базовый интерфейс для всех репозиториев
 * Определяет стандартный набор CRUD операций
 */
export interface IBaseRepository<T> {
  findById(id: number | string): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(entity: Partial<T>): Promise<T>;
  update(id: number | string, entity: Partial<T>): Promise<T | null>;
  delete(id: number | string): Promise<boolean>;
}

/**
 * Базовый класс репозитория с общей логикой CRUD операций
 * 
 * Предоставляет стандартные методы для работы с базой данных:
 * - findById - поиск по первичному ключу
 * - findAll - получение всех записей
 * - create - создание новой записи
 * - update - обновление существующей записи
 * - delete - удаление записи
 * 
 * Дочерние классы должны указать tableName и primaryKey в конструкторе
 * @template T - Тип сущности, с которой работает репозиторий
 */
export abstract class BaseRepository<T> implements IBaseRepository<T> {
  protected tableName: string;
  protected primaryKey: string = 'id';

  constructor(tableName: string, primaryKey: string = 'id') {
    this.tableName = tableName;
    this.primaryKey = primaryKey;
  }

  /**
   * Выполнение SQL запроса к базе данных
   * @param text - SQL запрос
   * @param params - Параметры запроса
   * @returns Результат выполнения запроса
   * @protected
   */
  protected async query(text: string, params?: any[]): Promise<any> {
    try {
      const result = await pool.query(text, params);
      return result;
    } catch (error) {
      console.error(`Database query error in ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Поиск записи по первичному ключу
   * @param id - ID записи
   * @returns Найденная запись или null
   */
  async findById(id: number | string): Promise<T | null> {
    const result = await this.query(
      `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Получение всех записей из таблицы
   * @returns Массив всех записей
   */
  async findAll(): Promise<T[]> {
    const result = await this.query(`SELECT * FROM ${this.tableName}`);
    return result.rows;
  }

  /**
   * Создание новой записи
   * @param entity - Частичные данные для создания (объект с полями записи)
   * @returns Созданная запись
   */
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

  /**
   * Обновление существующей записи
   * @param id - ID записи для обновления
   * @param entity - Частичные данные для обновления (только изменяемые поля)
   * @returns Обновленная запись или null если не найдена
   */
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

  /**
   * Удаление записи по ID
   * @param id - ID записи для удаления
   * @returns true если запись удалена, false если не найдена
   */
  async delete(id: number | string): Promise<boolean> {
    const result = await this.query(
      `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = $1`,
      [id]
    );
    return result.rowCount > 0;
  }

  /**
   * Выполнение сложных SQL запросов
   * Используется в дочерних классах для специфичных запросов
   * @param query - SQL запрос
   * @param params - Параметры запроса
   * @returns Результат выполнения запроса
   * @protected
   */
  protected async executeQuery(query: string, params?: any[]): Promise<any> {
    return await this.query(query, params);
  }
}

