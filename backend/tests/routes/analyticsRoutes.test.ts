import request from 'supertest';
import express from 'express';
import analyticsRoutes from '../../src/routes/analyticsRoutes';

const app = express();
app.use(express.json());
app.use('/api/analytics', analyticsRoutes);

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
  analyticsService: {
    getTrendData: jest.fn(),
    getProducts: jest.fn(),
    getProductStats: jest.fn(),
    getWarehouseStats: jest.fn()
  }
}));

describe('Analytics Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/analytics/trend', () => {
    it('should return trend data with default period', async () => {
      const { analyticsService } = require('../../src/services/HistoryService');
      analyticsService.getTrendData.mockResolvedValue({
        data: [],
        products: []
      });

      const response = await request(app)
        .get('/api/analytics/trend')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(analyticsService.getTrendData).toHaveBeenCalledWith([], 7);
    });

    it('should parse product_ids from query string', async () => {
      const { analyticsService } = require('../../src/services/HistoryService');
      analyticsService.getTrendData.mockResolvedValue({
        data: [],
        products: []
      });

      const response = await request(app)
        .get('/api/analytics/trend')
        .query({
          product_ids: 'PROD-001,PROD-002',
          period_days: 30
        })
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(analyticsService.getTrendData).toHaveBeenCalledWith(
        ['PROD-001', 'PROD-002'],
        30
      );
    });
  });

  describe('GET /api/analytics/products', () => {
    it('should return products list', async () => {
      const { analyticsService } = require('../../src/services/HistoryService');
      analyticsService.getProducts.mockResolvedValue({
        products: [
          { id: 'PROD-001', name: 'Product 1' }
        ]
      });

      const response = await request(app)
        .get('/api/analytics/products')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(analyticsService.getProducts).toHaveBeenCalledWith(undefined, 50);
    });

    it('should accept search and limit parameters', async () => {
      const { analyticsService } = require('../../src/services/HistoryService');
      analyticsService.getProducts.mockResolvedValue({
        products: []
      });

      const response = await request(app)
        .get('/api/analytics/products')
        .query({
          search: 'router',
          limit: 100
        })
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(analyticsService.getProducts).toHaveBeenCalledWith('router', 100);
    });
  });

  describe('GET /api/analytics/product-stats', () => {
    it('should return product statistics', async () => {
      const { analyticsService } = require('../../src/services/HistoryService');
      analyticsService.getProductStats.mockResolvedValue({
        stats: {}
      });

      const response = await request(app)
        .get('/api/analytics/product-stats')
        .query({
          product_ids: 'PROD-001',
          period_days: 30
        })
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(analyticsService.getProductStats).toHaveBeenCalledWith(
        ['PROD-001'],
        30
      );
    });
  });

  describe('GET /api/analytics/warehouse-stats', () => {
    it('should return warehouse statistics', async () => {
      const { analyticsService } = require('../../src/services/HistoryService');
      analyticsService.getWarehouseStats.mockResolvedValue({
        totalProducts: 100,
        totalScans: 500
      });

      const response = await request(app)
        .get('/api/analytics/warehouse-stats')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(analyticsService.getWarehouseStats).toHaveBeenCalledWith(7);
    });
  });
});

