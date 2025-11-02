import { profileRepository } from '../repositories/ProfileRepository';

/**
 * Сервис для работы с профилем пользователя
 * 
 * Предоставляет методы для получения и сохранения персональных настроек пользователя
 */
export class ProfileService {
  /**
   * Получить настройки пользователя
   * @param userId - ID пользователя
   * @returns Объект с настройками пользователя
   * @throws {Error} Если произошла ошибка при получении настроек
   */
  // Получение настроек пользователя
  async getSettings(userId: number): Promise<any> {
    try {
      const settings = await profileRepository.getSettings(userId);
      return settings;
    } catch (error: any) {
      console.error('❌ Profile service getSettings error:', error);
      throw new Error('Failed to get user settings: ' + error.message);
    }
  }

  /**
   * Сохранить настройки пользователя
   * @param userId - ID пользователя
   * @param settings - Объект с настройками для сохранения
   * @throws {Error} Если произошла ошибка при сохранении настроек
   */
  // Сохранение настроек пользователя
  async saveSettings(userId: number, settings: any): Promise<void> {
    try {
      await profileRepository.saveSettings(userId, settings);
    } catch (error: any) {
      console.error('❌ Profile service saveSettings error:', error);
      throw new Error('Failed to save user settings: ' + error.message);
    }
  }
}

export const profileService = new ProfileService();

