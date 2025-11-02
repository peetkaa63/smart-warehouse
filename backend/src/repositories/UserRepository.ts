import { BaseRepository } from './BaseRepository';
import { User } from '../types';

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: number): Promise<User | null>;
  findByRole(role: string): Promise<User[]>;
}

/**
 * Репозиторий для работы с пользователями
 * 
 * Наследуется от BaseRepository и предоставляет специфичные методы для поиска пользователей
 */
export class UserRepository extends BaseRepository<User> implements IUserRepository {
  constructor() {
    super('users', 'id');
  }

  /**
   * Поиск пользователя по email
   * @param email - Email адрес пользователя
   * @returns Объект пользователя или null если не найден
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await this.executeQuery(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  /**
   * Поиск всех пользователей с указанной ролью
   * @param role - Роль пользователя (admin, operator, viewer)
   * @returns Массив пользователей с указанной ролью
   */
  async findByRole(role: string): Promise<User[]> {
    const result = await this.executeQuery(
      'SELECT id, email, name, role, created_at FROM users WHERE role = $1',
      [role]
    );
    return result.rows;
  }

  /**
   * Поиск пользователя по ID
   * Возвращает только публичные данные (без password_hash)
   * @param id - ID пользователя
   * @returns Объект пользователя без пароля или null если не найден
   */
  async findById(id: number): Promise<User | null> {
    const result = await this.executeQuery(
      'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }
}

export const userRepository = new UserRepository();

