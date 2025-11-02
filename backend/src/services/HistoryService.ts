import { historyRepository, HistoryFilters, HistoryStats } from '../repositories/HistoryRepository';
import { analyticsRepository, TrendData, ProductStats } from '../repositories/AnalyticsRepository';

/**
 * Сервис для работы с историей сканирований
 * 
 * Предоставляет методы для получения исторических данных с валидацией и обработкой ошибок
 */
export class HistoryService {
  /**
   * Получить исторические данные с фильтрами
   * @param filters - Фильтры для истории (даты, зоны, статусы, пагинация и т.д.)
   * @returns Объект с массивом записей истории и информацией о пагинации
   * @throws {Error} Если параметры невалидны или произошла ошибка при получении данных
   */
  // Получение исторических данных с валидацией
  async getHistory(filters: HistoryFilters) {
    try {
      // Валидация параметров
      this.validateHistoryFilters(filters);
      
      // Получение данных через репозиторий
      const result = await historyRepository.getHistory(filters);
      
      console.log('📊 History service returned:', {
        itemsCount: result.items.length,
        totalPages: result.pagination.totalPages
      });
      
      return result;
    } catch (error: any) {
      console.error('❌ History service error:', error);
      throw new Error('Failed to fetch history data: ' + error.message);
    }
  }

  /**
   * Получить статистику за период
   * @param filters - Фильтры по датам (from, to)
   * @returns Статистика (totalScans, uniqueProducts, discrepancies, avgZoneTime)
   * @throws {Error} Если произошла ошибка (возвращает нулевые данные вместо ошибки)
   */
  // Получение статистики с обработкой ошибок
  async getStats(filters: { from?: string; to?: string }): Promise<HistoryStats> {
    try {
      const stats = await historyRepository.getStats(filters);
      
      console.log('📈 History stats service returned:', stats);
      
      return stats;
    } catch (error: any) {
      console.error('❌ History stats service error:', error);
      
      // Возвращаем нулевые данные вместо ошибки
      return {
        totalScans: 0,
        uniqueProducts: 0,
        discrepancies: 0,
        avgZoneTime: 0
      };
    }
  }

  /**
   * Валидация параметров фильтров истории
   * @param filters - Фильтры для валидации
   * @throws {Error} Если параметры невалидны (page < 1, limit вне диапазона 1-1000)
   * @private
   */
  // Валидация фильтров
  private validateHistoryFilters(filters: HistoryFilters) {
    const { page, limit } = filters;
    
    // Валидация пагинации
    if (page && (isNaN(parseInt(page)) || parseInt(page) < 1)) {
      throw new Error('Invalid page parameter');
    }
    
    // Увеличиваем максимальный limit для загрузки состояний ячеек
    // В одной зоне: 20 рядов * 10 полок = 200 ячеек
    // Нужно получить последний статус для каждой ячейки, поэтому может потребоваться больше записей
    if (limit && (isNaN(parseInt(limit)) || parseInt(limit) < 1 || parseInt(limit) > 1000)) {
      throw new Error('Invalid limit parameter (must be 1-1000)');
    }
  }
}

/**
 * Сервис для аналитики
 * 
 * Предоставляет методы для получения аналитических данных: тренды, статистика товаров, статистика склада
 */
export class AnalyticsService {
  /**
   * Получить данные трендов для графиков
   * @param productIds - Массив ID товаров для анализа
   * @param periodDays - Период анализа в днях (1-365)
   * @returns Данные трендов с массивом точек данных
   * @throws {Error} Если productIds пустой или periodDays вне диапазона
   */
  // Получение данных трендов с валидацией
  async getTrendData(productIds: string[], periodDays: number = 7): Promise<TrendData> {
    try {
      // Валидация
      if (!productIds || productIds.length === 0) {
        throw new Error('No product IDs provided');
      }
      
      if (periodDays < 1 || periodDays > 365) {
        throw new Error('Invalid period (must be 1-365 days)');
      }
      
      const result = await analyticsRepository.getTrendData(productIds, periodDays);
      
      console.log('📈 Analytics trend service returned:', {
        dataPoints: result.data.length,
        productsCount: result.products.length
      });
      
      return result;
    } catch (error: any) {
      console.error('❌ Analytics trend service error:', error);
      throw new Error('Failed to fetch trend data: ' + error.message);
    }
  }

  /**
   * Получить список товаров для аналитики
   * @param search - Поисковый запрос для фильтрации (опционально)
   * @param limit - Максимальное количество товаров (1-100)
   * @returns Объект с массивом товаров
   * @throws {Error} Если limit вне диапазона
   */
  // Получение списка товаров
  async getProducts(search?: string, limit: number = 50) {
    try {
      if (limit < 1 || limit > 100) {
        throw new Error('Invalid limit parameter (must be 1-100)');
      }
      
      const result = await analyticsRepository.getProducts(search, limit);
      
      console.log('🔍 Analytics products service returned:', {
        productsCount: result.products.length,
        searchTerm: search
      });
      
      return result;
    } catch (error: any) {
      console.error('❌ Analytics products service error:', error);
      throw new Error('Failed to fetch products: ' + error.message);
    }
  }

  /**
   * Получить статистику по товарам
   * @param productIds - Массив ID товаров для анализа
   * @param periodDays - Период анализа в днях (1-365)
   * @returns Статистика по товарам
   * @throws {Error} Если productIds пустой
   */
  // Получение статистики по товарам
  async getProductStats(productIds: string[], periodDays: number = 7): Promise<ProductStats> {
    try {
      if (!productIds || productIds.length === 0) {
        throw new Error('No product IDs provided');
      }
      
      const result = await analyticsRepository.getProductStats(productIds, periodDays);
      
      console.log('📊 Analytics product stats service returned:', {
        statsCount: result.stats.length,
        periodDays: result.period_days
      });
      
      return result;
    } catch (error: any) {
      console.error('❌ Analytics product stats service error:', error);
      throw new Error('Failed to fetch product statistics: ' + error.message);
    }
  }

  /**
   * Получить статистику склада
   * @param periodDays - Период анализа в днях (1-365)
   * @returns Статистика склада за период
   * @throws {Error} Если periodDays вне диапазона
   */
  // Получение статистики склада
  async getWarehouseStats(periodDays: number = 7) {
    try {
      if (periodDays < 1 || periodDays > 365) {
        throw new Error('Invalid period (must be 1-365 days)');
      }
      
      const result = await analyticsRepository.getWarehouseStats(periodDays);
      
      console.log('🏭 Analytics warehouse stats service returned:', result);
      
      return result;
    } catch (error: any) {
      console.error('❌ Analytics warehouse stats service error:', error);
      throw new Error('Failed to fetch warehouse statistics: ' + error.message);
    }
  }
}

// Экспортируем экземпляры сервисов
export const historyService = new HistoryService();
export const analyticsService = new AnalyticsService();

