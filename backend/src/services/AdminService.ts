import { adminRepository, ProductLimit, Thresholds, Robot, User } from '../repositories/AdminRepository';

export class AdminService {
  // Управление товарными лимитами
  async getProductLimits(): Promise<{ products: ProductLimit[]; thresholds: Thresholds }> {
    const products = await adminRepository.getProductLimits();
    const thresholds = await adminRepository.getThresholds();
    return { products, thresholds };
  }

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

  // Управление роботами
  async getRobots(): Promise<Robot[]> {
    return await adminRepository.getRobots();
  }

  async createRobot(robotId: string, name?: string, zone?: string): Promise<void> {
    // Валидация
    if (!robotId || robotId.trim().length === 0) {
      throw new Error('Robot ID is required');
    }
    await adminRepository.createRobot(robotId, name, zone);
  }

  async deleteRobot(robotId: string): Promise<void> {
    if (!robotId) {
      throw new Error('Robot ID is required');
    }
    await adminRepository.deleteRobot(robotId);
  }

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

  // Управление пользователями
  async getUsers(): Promise<User[]> {
    return await adminRepository.getUsers();
  }

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

  async updateUserRole(userId: number, role: string): Promise<void> {
    if (!['operator', 'manager', 'admin'].includes(role)) {
      throw new Error('Invalid role');
    }
    await adminRepository.updateUserRole(userId, role);
  }

  async toggleUserBlock(userId: number, blocked: boolean): Promise<void> {
    await adminRepository.toggleUserBlock(userId, blocked);
  }
}

export const adminService = new AdminService();

