import request from 'supertest';
import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';

// Импортируем все маршруты
import authRoutes from '../src/routes/authRoutes';
import robotsRoutes from '../src/routes/robotsRoutes';
import dashboardRoutes from '../src/routes/dashboardRoutes';
import aiRoutes from '../src/routes/aiRoutes';
import uploadRoutes from '../src/routes/uploadRoutes';
import { setupWebSocket } from '../src/sockets/websocket';

// Создаем полное тестовое приложение
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/robots', robotsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/upload', uploadRoutes);

// Создаем HTTP сервер для WebSocket тестов
const server = createServer(app);
const io = new Server(server);

// Мокаем все сервисы
jest.mock('../src/services/AllServices', () => ({
  robotsService: {
    processRobotData: jest.fn(),
    getAllRobots: jest.fn(),
    getRobotsStats: jest.fn()
  },
  aiService: {
    getPredictions: jest.fn(),
    getAdvancedPredictions: jest.fn(),
    getPredictionHistory: jest.fn(),
    getAIStatus: jest.fn(),
    refreshPredictions: jest.fn()
  },
  uploadService: {
    processCSVUpload: jest.fn()
  }
}));

jest.mock('../src/sockets/websocket', () => ({
  setupWebSocket: jest.fn(),
  robotService: {
    io: {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis()
    },
    getCurrentRobots: jest.fn(),
    getRecentScans: jest.fn(),
    getDashboardStats: jest.fn(),
    broadcastDashboardUpdate: jest.fn()
  }
}));

jest.mock('../src/repositories/UserRepository', () => ({
  findByEmail: jest.fn(),
  findById: jest.fn()
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn()
}));

describe('Full System Integration Tests', () => {
  let authToken: string;
  let mockUser: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUser = {
      id: 1,
      email: 'test@example.com',
      password: '$2a$10$hashedpassword',
      role: 'admin'
    };

    authToken = jwt.sign(
      { userId: mockUser.id, email: mockUser.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  describe('Authentication Flow', () => {
    it('should complete full authentication flow', async () => {
      const { findByEmail } = require('../src/repositories/UserRepository');
      const { compare } = require('bcryptjs');

      // Мокаем успешный login
      findByEmail.mockResolvedValue(mockUser);
      compare.mockResolvedValue(true);

      // 1. Логинимся
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty('token');
      expect(loginResponse.body).toHaveProperty('user');

      const token = loginResponse.body.token;

      // 2. Получаем текущего пользователя
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meResponse.status).toBe(200);
      expect(meResponse.body.user.email).toBe('test@example.com');
    });

    it('should handle authentication errors', async () => {
      const { findByEmail } = require('../src/repositories/UserRepository');
      const { compare } = require('bcryptjs');

      // Мокаем неуспешный login
      findByEmail.mockResolvedValue(mockUser);
      compare.mockResolvedValue(false);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(loginResponse.status).toBe(401);
      expect(loginResponse.body).toHaveProperty('error');
    });
  });

  describe('Robot Data Processing Flow', () => {
    it('should process robot data and update dashboard', async () => {
      const { robotsService } = require('../src/services/AllServices');
      const { robotService } = require('../src/sockets/websocket');

      const mockRobotData = {
        robot_id: 'ROBOT-001',
        scans: [
          {
            product_id: 'PROD-001',
            quantity: 10,
            zone: 'A',
            row_number: 1,
            shelf_number: 1
          }
        ]
      };

      const mockResult = {
        success: true,
        processed_scans: 1,
        robot_id: 'ROBOT-001'
      };

      robotsService.processRobotData.mockResolvedValue(mockResult);

      // Отправляем данные от робота
      const response = await request(app)
        .post('/api/robots/data')
        .send(mockRobotData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(robotsService.processRobotData).toHaveBeenCalledWith(mockRobotData);
      expect(robotService.io.emit).toHaveBeenCalledWith('robot_data_received', {
        robot_id: 'ROBOT-001',
        processed_scans: 1,
        timestamp: expect.any(String)
      });
    });

    it('should get robots list and statistics', async () => {
      const { robotsService } = require('../src/services/AllServices');

      const mockRobots = [
        { id: 'ROBOT-001', status: 'active', battery: 85 },
        { id: 'ROBOT-002', status: 'charging', battery: 45 }
      ];

      const mockStats = {
        total_robots: 2,
        active_robots: 1,
        charging_robots: 1,
        avg_battery: 65,
        total_scans_today: 150
      };

      robotsService.getAllRobots.mockResolvedValue(mockRobots);
      robotsService.getRobotsStats.mockResolvedValue(mockStats);

      // Получаем список роботов
      const robotsResponse = await request(app)
        .get('/api/robots');

      expect(robotsResponse.status).toBe(200);
      expect(robotsResponse.body.robots).toEqual(mockRobots);

      // Получаем статистику
      const statsResponse = await request(app)
        .get('/api/robots/stats');

      expect(statsResponse.status).toBe(200);
      expect(statsResponse.body).toEqual(mockStats);
    });
  });

  describe('Dashboard Integration', () => {
    it('should fetch dashboard data with authentication', async () => {
      const { robotService } = require('../src/sockets/websocket');

      const mockRobots = [
        { id: 'ROBOT-001', status: 'active', battery: 85 }
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
        activeRobots: 1,
        totalRobots: 2,
        scannedToday: 150,
        criticalStock: 3,
        avgBattery: 75
      };

      robotService.getCurrentRobots.mockResolvedValue(mockRobots);
      robotService.getRecentScans.mockResolvedValue(mockRecentScans);
      robotService.getDashboardStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/dashboard/current')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        robots: mockRobots,
        recentScans: mockRecentScans,
        statistics: mockStats,
        timestamp: expect.any(String)
      });
    });

    it('should refresh dashboard data', async () => {
      const { robotService } = require('../src/sockets/websocket');

      robotService.broadcastDashboardUpdate.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/dashboard/refresh')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Dashboard refresh initiated' });
      expect(robotService.broadcastDashboardUpdate).toHaveBeenCalled();
    });
  });

  describe('AI Integration', () => {
    it('should get AI predictions with authentication', async () => {
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
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          period_days: 7,
          categories: ['routers', 'modems']
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockPredictions);
      expect(aiService.getPredictions).toHaveBeenCalledWith(7, ['routers', 'modems']);
    });

    it('should get AI status', async () => {
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
        .get('/api/ai/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStatus);
    });
  });

  describe('CSV Upload Integration', () => {
    it('should upload and process CSV file', async () => {
      const { uploadService } = require('../src/services/AllServices');
      
      const csvContent = 'robot_id,product_id,product_name,quantity,zone,row_number,shelf_number,status,scanned_at\nROBOT-001,PROD-001,Router RT-AC68U,10,A,1,1,OK,2024-01-01T10:00:00Z';
      
      const mockResult = {
        success: true,
        processed_rows: 1,
        errors: [],
        summary: {
          total_products: 1,
          total_quantity: 10,
          zones_updated: ['A']
        }
      };

      uploadService.processCSVUpload.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/upload/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), 'test.csv');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(uploadService.processCSVUpload).toHaveBeenCalledWith(expect.any(Array));
    });

    it('should download CSV template', async () => {
      const response = await request(app)
        .get('/api/upload/template')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('text/csv');
      expect(response.headers['content-disposition']).toBe('attachment; filename=inventory_template.csv');
      expect(response.text).toContain('robot_id,product_id,product_name,quantity,zone,row_number,shelf_number,status,scanned_at');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle service failures gracefully', async () => {
      const { robotsService } = require('../src/services/AllServices');

      robotsService.processRobotData.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/robots/data')
        .send({
          robot_id: 'ROBOT-001',
          scans: []
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Database connection failed'
      });
    });

    it('should handle authentication failures', async () => {
      const response = await request(app)
        .get('/api/dashboard/current')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle missing authentication', async () => {
      const response = await request(app)
        .get('/api/dashboard/current');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Performance Integration', () => {
    it('should handle concurrent requests', async () => {
      const { robotsService } = require('../src/services/AllServices');

      robotsService.getAllRobots.mockResolvedValue([]);
      robotsService.getRobotsStats.mockResolvedValue({});

      // Отправляем несколько запросов одновременно
      const promises = Array.from({ length: 10 }, () => 
        request(app).get('/api/robots')
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should handle large data sets', async () => {
      const { robotsService } = require('../src/services/AllServices');

      const largeRobotsArray = Array.from({ length: 1000 }, (_, i) => ({
        id: `ROBOT-${i + 1}`,
        status: 'active',
        battery: Math.floor(Math.random() * 100)
      }));

      robotsService.getAllRobots.mockResolvedValue(largeRobotsArray);

      const response = await request(app)
        .get('/api/robots');

      expect(response.status).toBe(200);
      expect(response.body.robots).toHaveLength(1000);
    });
  });

  describe('Security Integration', () => {
    it('should prevent unauthorized access to protected routes', async () => {
      const protectedRoutes = [
        { method: 'get', path: '/api/dashboard/current' },
        { method: 'post', path: '/api/dashboard/refresh' },
        { method: 'post', path: '/api/ai/predict' },
        { method: 'get', path: '/api/ai/status' },
        { method: 'post', path: '/api/upload/csv' },
        { method: 'get', path: '/api/upload/template' }
      ];

      for (const route of protectedRoutes) {
        const response = await request(app)[route.method](route.path);
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should validate file uploads', async () => {
      const response = await request(app)
        .post('/api/upload/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('not a csv file'), 'test.txt');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/robots/data')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });
  });

  describe('Data Consistency Integration', () => {
    it('should maintain data consistency across operations', async () => {
      const { robotsService } = require('../src/services/AllServices');
      const { robotService } = require('../src/sockets/websocket');

      // Мокаем данные
      const mockRobots = [
        { id: 'ROBOT-001', status: 'active', battery: 85 }
      ];

      const mockStats = {
        total_robots: 1,
        active_robots: 1,
        avg_battery: 85
      };

      robotsService.getAllRobots.mockResolvedValue(mockRobots);
      robotsService.getRobotsStats.mockResolvedValue(mockStats);
      robotService.getCurrentRobots.mockResolvedValue(mockRobots);
      robotService.getDashboardStats.mockResolvedValue({
        activeRobots: 1,
        totalRobots: 1,
        scannedToday: 0,
        criticalStock: 0,
        avgBattery: 85
      });

      // Получаем данные из разных endpoints
      const robotsResponse = await request(app).get('/api/robots');
      const statsResponse = await request(app).get('/api/robots/stats');
      const dashboardResponse = await request(app)
        .get('/api/dashboard/current')
        .set('Authorization', `Bearer ${authToken}`);

      // Проверяем консистентность данных
      expect(robotsResponse.body.robots).toHaveLength(1);
      expect(statsResponse.body.total_robots).toBe(1);
      expect(dashboardResponse.body.statistics.totalRobots).toBe(1);
      expect(dashboardResponse.body.statistics.activeRobots).toBe(1);
    });
  });
});
