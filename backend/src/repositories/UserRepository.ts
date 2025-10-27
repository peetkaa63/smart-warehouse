import { BaseRepository } from './BaseRepository';
import { User } from '../types';

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: number): Promise<User | null>;
  findByRole(role: string): Promise<User[]>;
}

export class UserRepository extends BaseRepository<User> implements IUserRepository {
  constructor() {
    super('users', 'id');
  }

  // Специфичные методы для пользователей
  async findByEmail(email: string): Promise<User | null> {
    const result = await this.executeQuery(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  async findByRole(role: string): Promise<User[]> {
    const result = await this.executeQuery(
      'SELECT id, email, name, role, created_at FROM users WHERE role = $1',
      [role]
    );
    return result.rows;
  }

  // Переопределяем findById для возврата только публичных данных
  async findById(id: number): Promise<User | null> {
    const result = await this.executeQuery(
      'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }
}

export const userRepository = new UserRepository();

