import request from 'supertest';
import express from 'express';
import advancedAnalyticsRoutes from '../../src/routes/advancedAnalyticsRoutes';

const app = express();
app.use(express.json());
app.use('/api/advancedAnalytics', advancedAnalyticsRoutes);

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

jest.mock('../../src/services/AllServices', () => ({
  advancedAnalyticsServiceNew: {
    getEnhancedTrends: jest.fn(),
    getEfficiencyData: jest.fn(),
    getAIInsights: jest.fn(),
    getNotifications: jest.fn()
  }
}));

describe('Advanced Analytics Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/advancedAnalytics/trends', () => {
    it('should return trends data with default period', async () => {
      const { advancedAnalyticsServiceNew } = require('../../src/services/AllServices');
      advancedAnalyticsServiceNew.getEnhancedTrends.mockResolvedValue({
        success: true,
        data: []
      });

      const response = await request(app)
        .get('/api/advancedAnalytics/trends')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(advancedAnalyticsServiceNew.getEnhancedTrends).toHaveBeenCalledWith(
        [],
        30
      );
    });

    it('should return trends with custom period and product IDs', async () => {
      const { advancedAnalyticsServiceNew } = require('../../src/services/AllServices');
      advancedAnalyticsServiceNew.getEnhancedTrends.mockResolvedValue({
        success: true,
        data: []
      });

      const response = await request(app)
        .get('/api/advancedAnalytics/trends')
        .query({
          period_days: 60,
          product_ids: 'PROD-001,PROD-002'
        })
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(advancedAnalyticsServiceNew.getEnhancedTrends).toHaveBeenCalledWith(
        ['PROD-001', 'PROD-002'],
        60
      );
    });

    it('should handle errors', async () => {
      const { advancedAnalyticsServiceNew } = require('../../src/services/AllServices');
      advancedAnalyticsServiceNew.getEnhancedTrends.mockRejectedValue(
        new Error('Service error')
      );

      const response = await request(app)
        .get('/api/advancedAnalytics/trends')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/advancedAnalytics/efficiency', () => {
    it('should return efficiency data', async () => {
      const { advancedAnalyticsServiceNew } = require('../../src/services/AllServices');
      advancedAnalyticsServiceNew.getEfficiencyData.mockResolvedValue({
        success: true,
        data: {}
      });

      const response = await request(app)
        .get('/api/advancedAnalytics/efficiency')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(advancedAnalyticsServiceNew.getEfficiencyData).toHaveBeenCalledWith(7);
    });

    it('should accept custom period_days', async () => {
      const { advancedAnalyticsServiceNew } = require('../../src/services/AllServices');
      advancedAnalyticsServiceNew.getEfficiencyData.mockResolvedValue({
        success: true,
        data: {}
      });

      const response = await request(app)
        .get('/api/advancedAnalytics/efficiency')
        .query({ period_days: 14 })
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(advancedAnalyticsServiceNew.getEfficiencyData).toHaveBeenCalledWith(14);
    });
  });

  describe('GET /api/advancedAnalytics/ai-insights', () => {
    it('should return AI insights', async () => {
      const { advancedAnalyticsServiceNew } = require('../../src/services/AllServices');
      advancedAnalyticsServiceNew.getAIInsights.mockResolvedValue({
        recommendations: [],
        risks: [],
        summary: 'Analysis complete'
      });

      const response = await request(app)
        .get('/api/advancedAnalytics/ai-insights')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.summary).toBe('Analysis complete');
    });
  });

  describe('GET /api/advancedAnalytics/notifications', () => {
    it('should return notifications with default limit', async () => {
      const { advancedAnalyticsServiceNew } = require('../../src/services/AllServices');
      advancedAnalyticsServiceNew.getNotifications.mockResolvedValue({
        notifications: []
      });

      const response = await request(app)
        .get('/api/advancedAnalytics/notifications')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(advancedAnalyticsServiceNew.getNotifications).toHaveBeenCalledWith(20);
    });

    it('should accept custom limit', async () => {
      const { advancedAnalyticsServiceNew } = require('../../src/services/AllServices');
      advancedAnalyticsServiceNew.getNotifications.mockResolvedValue({
        notifications: []
      });

      const response = await request(app)
        .get('/api/advancedAnalytics/notifications')
        .query({ limit: 50 })
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(advancedAnalyticsServiceNew.getNotifications).toHaveBeenCalledWith(50);
    });
  });
});

