import { BaseRepository } from './BaseRepository';
import { pool } from '../config/database';

export interface UserSettings {
  user_id: number;
  settings: any; // JSONB объект
  updated_at: Date;
}

export interface IProfileRepository {
  getSettings(userId: number): Promise<any>;
  saveSettings(userId: number, settings: any): Promise<void>;
}

export class ProfileRepository extends BaseRepository<UserSettings> implements IProfileRepository {
  constructor() {
    super('user_settings', 'user_id');
  }

  // Получение настроек пользователя
  async getSettings(userId: number): Promise<any> {
    const result = await this.query(
      'SELECT settings FROM user_settings WHERE user_id = $1',
      [userId]
    );
    return result.rows?.[0]?.settings || {};
  }

  // Сохранение настроек пользователя
  async saveSettings(userId: number, settings: any): Promise<void> {
    // Убеждаемся что settings это объект для JSONB
    let settingsJson = settings;
    if (typeof settings === 'string') {
      try {
        settingsJson = JSON.parse(settings);
      } catch (e) {
        settingsJson = {};
      }
    }
    // Преобразуем в JSON строку для PostgreSQL JSONB
    const settingsStr = JSON.stringify(settingsJson);
    
    await this.query(
      `INSERT INTO user_settings(user_id, settings, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (user_id) DO UPDATE SET settings = EXCLUDED.settings::jsonb, updated_at = NOW()`,
      [userId, settingsStr]
    );
  }
}

export const profileRepository = new ProfileRepository();

