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

// Вспомогательная функция для создания JWT токена
const createToken = (role: string) => {
  return jwt.sign(
    { id: 1, email: 'test@example.com', role },
    process.env.JWT_SECRET || 'test-secret'
  );
};

// Мокаем middleware аутентификации с проверкой ролей
jest.mock('../src/middleware/authMiddleware', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret') as any;
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
  },
  requireRole: (roles: string[]) => {
    return (req: any, res: any, next: any) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      next();
    };
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
    it('should refresh dashboard successfully for operator', async () => {
      const { robotService } = require('../src/sockets/websocket');

      robotService.broadcastDashboardUpdate.mockResolvedValue(undefined);
      const token = createToken('operator');

      const response = await request(app)
        .post('/api/dashboard/refresh')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Dashboard refresh initiated' });
      expect(robotService.broadcastDashboardUpdate).toHaveBeenCalled();
    });

    it('should refresh dashboard successfully for admin', async () => {
      const { robotService } = require('../src/sockets/websocket');

      robotService.broadcastDashboardUpdate.mockResolvedValue(undefined);
      const token = createToken('admin');

      const response = await request(app)
        .post('/api/dashboard/refresh')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Dashboard refresh initiated' });
    });

    it('should reject refresh for viewer', async () => {
      const token = createToken('viewer');

      const response = await request(app)
        .post('/api/dashboard/refresh')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/dashboard/refresh');

      expect(response.status).toBe(401);
    });

    it('should handle refresh errors', async () => {
      const { robotService } = require('../src/sockets/websocket');

      robotService.broadcastDashboardUpdate.mockRejectedValue(new Error('Broadcast failed'));
      const token = createToken('operator');

      const response = await request(app)
        .post('/api/dashboard/refresh')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to refresh dashboard' });
    });
  });
});
