import { HistoryService } from '../../src/services/HistoryService';
import { historyRepository } from '../../src/repositories/HistoryRepository';

jest.mock('../../src/repositories/HistoryRepository');

describe('HistoryService', () => {
  let historyService: HistoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    historyService = new HistoryService();
  });

  describe('getHistory', () => {
    it('should return history data with valid filters', async () => {
      const mockFilters = {
        page: 1,
        limit: 20
      };

      const mockResult = {
        items: [
          {
            id: 1,
            scanned_at: new Date(),
            robot_id: 'RB-001',
            product_id: 'PROD-001',
            quantity: 10,
            status: 'OK'
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1
        }
      };

      (historyRepository.getHistory as jest.Mock).mockResolvedValue(mockResult);

      const result = await historyService.getHistory(mockFilters);

      expect(result).toEqual(mockResult);
      expect(historyRepository.getHistory).toHaveBeenCalledWith(mockFilters);
    });

    it('should throw error for invalid page parameter', async () => {
      const invalidFilters = {
        page: -1,
        limit: 20
      };

      await expect(historyService.getHistory(invalidFilters as any)).rejects.toThrow(
        'Invalid page parameter'
      );
    });

    it('should throw error for invalid limit parameter', async () => {
      const invalidFilters = {
        page: 1,
        limit: 2000 // превышает максимум 1000
      };

      await expect(historyService.getHistory(invalidFilters as any)).rejects.toThrow(
        'Invalid limit parameter'
      );
    });

    it('should handle repository errors', async () => {
      const filters = { page: 1, limit: 20 };
      (historyRepository.getHistory as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(historyService.getHistory(filters)).rejects.toThrow(
        'Failed to fetch history data'
      );
    });
  });

  describe('getStats', () => {
    it('should return statistics', async () => {
      const mockFilters = {
        from: '2024-01-01',
        to: '2024-01-31'
      };

      const mockStats = {
        totalScans: 100,
        uniqueProducts: 50,
        discrepancies: 5,
        avgZoneTime: 30
      };

      (historyRepository.getStats as jest.Mock).mockResolvedValue(mockStats);

      const result = await historyService.getStats(mockFilters);

      expect(result).toEqual(mockStats);
      expect(historyRepository.getStats).toHaveBeenCalledWith(mockFilters);
    });

    it('should return zero stats on error', async () => {
      (historyRepository.getStats as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const result = await historyService.getStats({});

      expect(result).toEqual({
        totalScans: 0,
        uniqueProducts: 0,
        discrepancies: 0,
        avgZoneTime: 0
      });
    });
  });
});

