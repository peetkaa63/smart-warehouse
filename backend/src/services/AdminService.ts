import { adminRepository, ProductLimit, Thresholds, Robot, User } from '../repositories/AdminRepository';

/**
 * Сервис для административных операций
 * 
 * Предоставляет методы для управления:
 * - Лимитами товаров (минимальный и оптимальный запас)
 * - Пороговыми значениями статусов
 * - Роботами
 * - Пользователями
 */
export class AdminService {
  /**
   * Получить лимиты товаров и пороговые значения
   * @returns Объект с массивом товаров с их лимитами и пороговыми значениями
   */
  async getProductLimits(): Promise<{ products: ProductLimit[]; thresholds: Thresholds }> {
    const products = await adminRepository.getProductLimits();
    const thresholds = await adminRepository.getThresholds();
    return { products, thresholds };
  }

  /**
   * Обновить лимиты товара
   * @param productId - ID товара
   * @param minStock - Минимальный уровень запаса
   * @param optimalStock - Оптимальный уровень запаса (должен быть >= minStock)
   * @throws {Error} Если minStock < 0 или optimalStock < minStock
   */
  async updateProductLimits(productId: string, minStock: number, optimalStock: number): Promise<void> {
    // Валидация
    if (minStock < 0) {
      throw new Error('Min stock cannot be negative');
    }
    if (optimalStock < minStock) {
      throw new Error('Optimal stock must be greater than or equal to min stock');
    }
    await adminRepository.updateProductLimits(productId, minStock, optimalStock);
  }

  /**
   * Обновить пороговые значения статусов
   * @param thresholds - Объект с пороговыми значениями (critical, low_stock, warning)
   * @throws {Error} Если пороги отрицательные или не в правильном порядке
   */
  async updateThresholds(thresholds: Thresholds): Promise<void> {
    // Валидация порогов
    if (thresholds.critical < 0 || thresholds.low_stock < 0 || thresholds.warning < 0) {
      throw new Error('Thresholds cannot be negative');
    }
    if (thresholds.critical >= thresholds.low_stock || thresholds.low_stock >= thresholds.warning) {
      throw new Error('Thresholds must be in order: critical < low_stock < warning');
    }
    await adminRepository.saveThresholds(thresholds);
  }

  /**
   * Получить список всех роботов
   * @returns Массив роботов с их статусами
   */
  // Управление роботами
  async getRobots(): Promise<Robot[]> {
    return await adminRepository.getRobots();
  }

  /**
   * Создать нового робота
   * @param robotId - Уникальный ID робота (обязательно)
   * @param name - Имя робота (опционально)
   * @param zone - Начальная зона робота (опционально)
   * @throws {Error} Если robotId пустой
   */
  async createRobot(robotId: string, name?: string, zone?: string): Promise<void> {
    // Валидация
    if (!robotId || robotId.trim().length === 0) {
      throw new Error('Robot ID is required');
    }
    await adminRepository.createRobot(robotId, name, zone);
  }

  /**
   * Удалить робота из системы
   * @param robotId - ID робота для удаления
   * @throws {Error} Если robotId пустой
   */
  async deleteRobot(robotId: string): Promise<void> {
    if (!robotId) {
      throw new Error('Robot ID is required');
    }
    await adminRepository.deleteRobot(robotId);
  }

  /**
   * Запланировать техническое обслуживание робота
   * @param robotId - ID робота
   * @param date - Дата и время обслуживания в формате ISO string
   * @throws {Error} Если robotId пустой или дата невалидна
   */
  async scheduleMaintenance(robotId: string, date: string): Promise<void> {
    if (!robotId) {
      throw new Error('Robot ID is required');
    }
    const maintenanceDate = new Date(date);
    if (isNaN(maintenanceDate.getTime())) {
      throw new Error('Invalid date format');
    }
    await adminRepository.scheduleMaintenance(robotId, date);
  }

  /**
   * Получить список всех пользователей
   * @returns Массив пользователей с их ролями и статусами
   */
  // Управление пользователями
  async getUsers(): Promise<User[]> {
    return await adminRepository.getUsers();
  }

  /**
   * Создать нового пользователя
   * @param userData - Данные пользователя (name, email, password, role)
   * @returns Созданный пользователь
   * @throws {Error} Если данные невалидны (пароль < 8 символов, неверная роль и т.д.)
   */
  async createUser(userData: { name: string; email: string; password: string; role: string }): Promise<User> {
    // Валидация
    if (!userData.name || !userData.email || !userData.password) {
      throw new Error('Name, email and password are required');
    }
    if (userData.password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    if (!['operator', 'manager', 'admin'].includes(userData.role)) {
      throw new Error('Invalid role');
    }
    return await adminRepository.createUser(userData);
  }

  /**
   * Обновить роль пользователя
   * @param userId - ID пользователя
   * @param role - Новая роль (operator, manager, admin)
   * @throws {Error} Если роль невалидна
   */
  async updateUserRole(userId: number, role: string): Promise<void> {
    if (!['operator', 'manager', 'admin'].includes(role)) {
      throw new Error('Invalid role');
    }
    await adminRepository.updateUserRole(userId, role);
  }

  /**
   * Заблокировать или разблокировать пользователя
   * @param userId - ID пользователя
   * @param blocked - true для блокировки, false для разблокировки
   */
  async toggleUserBlock(userId: number, blocked: boolean): Promise<void> {
    await adminRepository.toggleUserBlock(userId, blocked);
  }
}

export const adminService = new AdminService();

