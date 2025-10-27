import request from 'supertest';
import express from 'express';
import aiRoutes from '../src/routes/aiRoutes';
import jwt from 'jsonwebtoken';

// Создаем тестовое приложение
const app = express();
app.use(express.json());
app.use('/api/ai', aiRoutes);

// Мокаем сервисы
jest.mock('../src/services/AllServices', () => ({
  aiService: {
    getPredictions: jest.fn(),
    getAdvancedPredictions: jest.fn(),
    getPredictionHistory: jest.fn(),
    getAIStatus: jest.fn(),
    refreshPredictions: jest.fn()
  }
}));

// Мокаем middleware аутентификации
jest.mock('../src/middleware/authMiddleware', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 1, email: 'test@example.com' };
    next();
  }
}));

describe('AI Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/ai/predict', () => {
    it('should return AI predictions successfully', async () => {
      const { aiService } = require('../src/services/AllServices');

      const mockPredictions = {
        predictions: [
          {
            product_id: 'PROD-001',
            product_name: 'Router RT-AC68U',
            current_stock: 15,
            days_until_stockout: 3,
            recommended_order_quantity: 50,
            confidence_score: 0.85,
            reasoning: 'High consumption rate detected'
          }
        ],
        analysis_summary: 'Critical stock levels detected for 2 products'
      };

      aiService.getPredictions.mockResolvedValue(mockPredictions);

      const response = await request(app)
        .post('/api/ai/predict')
        .send({
          period_days: 7,
          categories: ['routers', 'modems']
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockPredictions);
      expect(aiService.getPredictions).toHaveBeenCalledWith(7, ['routers', 'modems']);
    });

    it('should use default parameters', async () => {
      const { aiService } = require('../src/services/AllServices');

      const mockPredictions = { predictions: [] };
      aiService.getPredictions.mockResolvedValue(mockPredictions);

      const response = await request(app)
        .post('/api/ai/predict')
        .send({});

      expect(response.status).toBe(200);
      expect(aiService.getPredictions).toHaveBeenCalledWith(7, []);
    });

    it('should handle AI service errors', async () => {
      const { aiService } = require('../src/services/AllServices');

      aiService.getPredictions.mockRejectedValue(new Error('AI service unavailable'));

      const response = await request(app)
        .post('/api/ai/predict')
        .send({
          period_days: 7
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'AI service unavailable' });
    });
  });

  describe('POST /api/ai/predict/advanced', () => {
    it('should return advanced predictions with filters', async () => {
      const { aiService } = require('../src/services/AllServices');

      const mockAdvancedPredictions = {
        predictions: [
          {
            product_id: 'PROD-001',
            risk_level: 'HIGH',
            confidence_score: 0.9,
            detailed_analysis: 'Critical stock situation'
          }
        ],
        filters_applied: {
          zones: ['A', 'B'],
          categories: ['routers'],
          risk_threshold: 0.8
        }
      };

      const filters = {
        zones: ['A', 'B'],
        categories: ['routers'],
        risk_threshold: 0.8,
        date_range: {
          start: '2024-01-01',
          end: '2024-01-31'
        }
      };

      aiService.getAdvancedPredictions.mockResolvedValue(mockAdvancedPredictions);

      const response = await request(app)
        .post('/api/ai/predict/advanced')
        .send(filters);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockAdvancedPredictions);
      expect(aiService.getAdvancedPredictions).toHaveBeenCalledWith(filters);
    });

    it('should handle advanced prediction errors', async () => {
      const { aiService } = require('../src/services/AllServices');

      aiService.getAdvancedPredictions.mockRejectedValue(new Error('Advanced analysis failed'));

      const response = await request(app)
        .post('/api/ai/predict/advanced')
        .send({
          zones: ['A']
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Advanced analysis failed' });
    });
  });

  describe('GET /api/ai/predictions/history', () => {
    it('should return prediction history', async () => {
      const { aiService } = require('../src/services/AllServices');

      const mockHistory = {
        predictions: [
          {
            id: 1,
            created_at: '2024-01-01T10:00:00Z',
            accuracy: 0.85,
            products_analyzed: 10
          }
        ],
        total_count: 1
      };

      aiService.getPredictionHistory.mockResolvedValue(mockHistory);

      const response = await request(app)
        .get('/api/ai/predictions/history?limit=10');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockHistory);
      expect(aiService.getPredictionHistory).toHaveBeenCalledWith(10);
    });

    it('should use default limit', async () => {
      const { aiService } = require('../src/services/AllServices');

      const mockHistory = { predictions: [] };
      aiService.getPredictionHistory.mockResolvedValue(mockHistory);

      const response = await request(app)
        .get('/api/ai/predictions/history');

      expect(response.status).toBe(200);
      expect(aiService.getPredictionHistory).toHaveBeenCalledWith(10);
    });

    it('should handle history errors', async () => {
      const { aiService } = require('../src/services/AllServices');

      aiService.getPredictionHistory.mockRejectedValue(new Error('History retrieval failed'));

      const response = await request(app)
        .get('/api/ai/predictions/history');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'History retrieval failed' });
    });
  });

  describe('GET /api/ai/status', () => {
    it('should return AI service status', async () => {
      const { aiService } = require('../src/services/AllServices');

      const mockStatus = {
        initialized: true,
        hasApiKey: true,
        available_models: ['gemini-2.0-flash', 'gemini-1.5-flash'],
        last_prediction: '2024-01-01T10:00:00Z',
        total_predictions: 150
      };

      aiService.getAIStatus.mockResolvedValue(mockStatus);

      const response = await request(app)
        .get('/api/ai/status');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStatus);
      expect(aiService.getAIStatus).toHaveBeenCalled();
    });

    it('should handle status errors', async () => {
      const { aiService } = require('../src/services/AllServices');

      aiService.getAIStatus.mockRejectedValue(new Error('Status check failed'));

      const response = await request(app)
        .get('/api/ai/status');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Status check failed' });
    });
  });

  describe('POST /api/ai/predict/refresh', () => {
    it('should refresh predictions successfully', async () => {
      const { aiService } = require('../src/services/AllServices');

      const mockRefreshResult = {
        success: true,
        predictions_updated: 25,
        timestamp: '2024-01-01T10:00:00Z'
      };

      aiService.refreshPredictions.mockResolvedValue(mockRefreshResult);

      const response = await request(app)
        .post('/api/ai/predict/refresh')
        .send({
          period_days: 14
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockRefreshResult);
      expect(aiService.refreshPredictions).toHaveBeenCalledWith(14);
    });

    it('should use default period', async () => {
      const { aiService } = require('../src/services/AllServices');

      const mockRefreshResult = { success: true };
      aiService.refreshPredictions.mockResolvedValue(mockRefreshResult);

      const response = await request(app)
        .post('/api/ai/predict/refresh')
        .send({});

      expect(response.status).toBe(200);
      expect(aiService.refreshPredictions).toHaveBeenCalledWith(7);
    });

    it('should handle refresh errors', async () => {
      const { aiService } = require('../src/services/AllServices');

      aiService.refreshPredictions.mockRejectedValue(new Error('Refresh failed'));

      const response = await request(app)
        .post('/api/ai/predict/refresh')
        .send({
          period_days: 7
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Refresh failed' });
    });
  });
});
