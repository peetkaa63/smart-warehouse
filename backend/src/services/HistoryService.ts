import { historyRepository, HistoryFilters, HistoryStats } from '../repositories/HistoryRepository';
import { analyticsRepository, TrendData, ProductStats } from '../repositories/AnalyticsRepository';

export class HistoryService {
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

export class AnalyticsService {
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

