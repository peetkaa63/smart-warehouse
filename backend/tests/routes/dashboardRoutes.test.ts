import request from 'supertest';
import express from 'express';
import dashboardRoutes from '../src/routes/dashboardRoutes';
import jwt from 'jsonwebtoken';

// Создаем тестовое приложение
const app = express();
app.use(express.json());
app.use('/api/dashboard', dashboardRoutes);

// Мокаем сервисы
jest.mock('../src/sockets/websocket', () => ({
  robotService: {
    getCurrentRobots: jest.fn(),
    getRecentScans: jest.fn(),
    getDashboardStats: jest.fn(),
    broadcastDashboardUpdate: jest.fn()
  }
}));

// Мокаем middleware аутентификации
jest.mock('../src/middleware/authMiddleware', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 1, email: 'test@example.com' };
    next();
  }
}));

describe('Dashboard Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/dashboard/current', () => {
    it('should return dashboard data successfully', async () => {
      const { robotService } = require('../src/sockets/websocket');

      const mockRobots = [
        { id: 'ROBOT-001', status: 'active', battery: 85 },
        { id: 'ROBOT-002', status: 'charging', battery: 45 }
      ];

      const mockRecentScans = [
        {
          id: 1,
          robot_id: 'ROBOT-001',
          product_id: 'PROD-001',
          quantity: 10,
          scanned_at: new Date().toISOString()
        }
      ];

      const mockStats = {
        activeRobots: 2,
        totalRobots: 5,
        scannedToday: 150,
        criticalStock: 3,
        avgBattery: 75
      };

      robotService.getCurrentRobots.mockResolvedValue(mockRobots);
      robotService.getRecentScans.mockResolvedValue(mockRecentScans);
      robotService.getDashboardStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/dashboard/current');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        robots: mockRobots,
        recentScans: mockRecentScans,
        statistics: mockStats,
        timestamp: expect.any(String)
      });
    });

    it('should handle dashboard data errors', async () => {
      const { robotService } = require('../src/sockets/websocket');

      robotService.getCurrentRobots.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/dashboard/current');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch dashboard data' });
    });

    it('should handle partial data errors', async () => {
      const { robotService } = require('../src/sockets/websocket');

      robotService.getCurrentRobots.mockResolvedValue([]);
      robotService.getRecentScans.mockResolvedValue([]);
      robotService.getDashboardStats.mockRejectedValue(new Error('Stats error'));

      const response = await request(app)
        .get('/api/dashboard/current');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch dashboard data' });
    });
  });

  describe('POST /api/dashboard/refresh', () => {
    it('should refresh dashboard successfully', async () => {
      const { robotService } = require('../src/sockets/websocket');

      robotService.broadcastDashboardUpdate.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/dashboard/refresh');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Dashboard refresh initiated' });
      expect(robotService.broadcastDashboardUpdate).toHaveBeenCalled();
    });

    it('should handle refresh errors', async () => {
      const { robotService } = require('../src/sockets/websocket');

      robotService.broadcastDashboardUpdate.mockRejectedValue(new Error('Broadcast failed'));

      const response = await request(app)
        .post('/api/dashboard/refresh');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to refresh dashboard' });
    });
  });
});
