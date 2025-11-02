import request from 'supertest';
import express from 'express';
import historyRoutes from '../../src/routes/historyRoutes';

const app = express();
app.use(express.json());
app.use('/api/history', historyRoutes);

const mockUser = {
  id: 1,
  email: 'test@example.com',
  role: 'admin'
};

jest.mock('../../src/middleware/authMiddleware', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = mockUser;
    next();
  }
}));

jest.mock('../../src/services/HistoryService', () => ({
  historyService: {
    getHistory: jest.fn(),
    getStats: jest.fn()
  }
}));

describe('History Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/history', () => {
    it('should return history data with default pagination', async () => {
      const { historyService } = require('../../src/services/HistoryService');
      const mockHistoryData = {
        items: [
          {
            id: 1,
            scanned_at: '2024-01-15T10:30:00.000Z',
            robot_id: 'RB-001',
            product_id: 'PROD-001',
            quantity: 25,
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

      historyService.getHistory.mockResolvedValue(mockHistoryData);

      const response = await request(app)
        .get('/api/history')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.items).toBeDefined();
      expect(response.body.pagination).toBeDefined();
    });

    it('should return history with filters', async () => {
      const { historyService } = require('../../src/services/HistoryService');
      historyService.getHistory.mockResolvedValue({
        items: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      });

      const response = await request(app)
        .get('/api/history')
        .query({
          zone: 'A',
          product_id: 'PROD-001',
          page: 1,
          limit: 10
        })
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(historyService.getHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          zone: 'A',
          product_id: 'PROD-001',
          page: 1,
          limit: 10
        })
      );
    });

    it('should handle errors when fetching history', async () => {
      const { historyService } = require('../../src/services/HistoryService');
      historyService.getHistory.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/history')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/history/stats', () => {
    it('should return statistics successfully', async () => {
      const { historyService } = require('../../src/services/HistoryService');
      const mockStats = {
        totalScans: 100,
        uniqueProducts: 50,
        discrepancies: 5,
        avgZoneTime: 30
      };

      historyService.getStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/history/stats')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStats);
    });

    it('should return stats with date filters', async () => {
      const { historyService } = require('../../src/services/HistoryService');
      historyService.getStats.mockResolvedValue({
        totalScans: 50,
        uniqueProducts: 25,
        discrepancies: 2,
        avgZoneTime: 25
      });

      const response = await request(app)
        .get('/api/history/stats')
        .query({
          from: '2024-01-01T00:00:00.000Z',
          to: '2024-01-15T23:59:59.999Z'
        })
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(historyService.getStats).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '2024-01-01T00:00:00.000Z',
          to: '2024-01-15T23:59:59.999Z'
        })
      );
    });
  });
});

