import { profileRepository } from '../repositories/ProfileRepository';

export class ProfileService {
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

