import request from 'supertest';
import express from 'express';
import authRoutes from '../src/routes/authRoutes';
import robotsRoutes from '../src/routes/robotsRoutes';
import dashboardRoutes from '../src/routes/dashboardRoutes';
import aiRoutes from '../src/routes/aiRoutes';

// Создаем тестовое приложение
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/robots', robotsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiRoutes);

// Мокаем все сервисы для тестов производительности
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
  }
}));

jest.mock('../src/sockets/websocket', () => ({
  robotService: {
    io: { emit: jest.fn() },
    getCurrentRobots: jest.fn(),
    getRecentScans: jest.fn(),
    getDashboardStats: jest.fn(),
    broadcastDashboardUpdate: jest.fn()
  }
}));

jest.mock('../src/middleware/authMiddleware', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 1, email: 'test@example.com' };
    next();
  }
}));

describe('Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('API Response Time Tests', () => {
    it('should respond to robots list request within 100ms', async () => {
      const { robotsService } = require('../src/services/AllServices');
      
      const mockRobots = Array.from({ length: 100 }, (_, i) => ({
        id: `ROBOT-${i + 1}`,
        status: 'active',
        battery: Math.floor(Math.random() * 100)
      }));

      robotsService.getAllRobots.mockResolvedValue(mockRobots);

      const startTime = Date.now();
      const response = await request(app).get('/api/robots');
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(100);
      expect(response.body.robots).toHaveLength(100);
    });

    it('should respond to dashboard data request within 200ms', async () => {
      const { robotService } = require('../src/sockets/websocket');

      const mockRobots = Array.from({ length: 50 }, (_, i) => ({
        id: `ROBOT-${i + 1}`,
        status: 'active',
        battery: 85
      }));

      const mockScans = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        robot_id: `ROBOT-${(i % 50) + 1}`,
        product_id: `PROD-${i + 1}`,
        quantity: 10,
        scanned_at: new Date().toISOString()
      }));

      const mockStats = {
        activeRobots: 50,
        totalRobots: 50,
        scannedToday: 1000,
        criticalStock: 5,
        avgBattery: 85
      };

      robotService.getCurrentRobots.mockResolvedValue(mockRobots);
      robotService.getRecentScans.mockResolvedValue(mockScans);
      robotService.getDashboardStats.mockResolvedValue(mockStats);

      const startTime = Date.now();
      const response = await request(app).get('/api/dashboard/current');
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(200);
      expect(response.body.robots).toHaveLength(50);
      expect(response.body.recentScans).toHaveLength(100);
    });

    it('should respond to AI predictions request within 500ms', async () => {
      const { aiService } = require('../src/services/AllServices');

      const mockPredictions = {
        predictions: Array.from({ length: 50 }, (_, i) => ({
          product_id: `PROD-${i + 1}`,
          product_name: `Product ${i + 1}`,
          current_stock: Math.floor(Math.random() * 100),
          days_until_stockout: Math.floor(Math.random() * 30),
          recommended_order_quantity: Math.floor(Math.random() * 200),
          confidence_score: Math.random(),
          reasoning: `Analysis for product ${i + 1}`
        })),
        analysis_summary: 'Comprehensive analysis completed'
      };

      aiService.getPredictions.mockResolvedValue(mockPredictions);

      const startTime = Date.now();
      const response = await request(app)
        .post('/api/ai/predict')
        .send({
          period_days: 7,
          categories: ['routers', 'modems', 'switches']
        });
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(500);
      expect(response.body.predictions).toHaveLength(50);
    });
  });

  describe('Concurrent Request Tests', () => {
    it('should handle 100 concurrent robots requests', async () => {
      const { robotsService } = require('../src/services/AllServices');
      
      const mockRobots = Array.from({ length: 10 }, (_, i) => ({
        id: `ROBOT-${i + 1}`,
        status: 'active',
        battery: 85
      }));

      robotsService.getAllRobots.mockResolvedValue(mockRobots);

      const startTime = Date.now();
      const promises = Array.from({ length: 100 }, () => 
        request(app).get('/api/robots')
      );
      
      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Все запросы должны быть успешными
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.robots).toHaveLength(10);
      });

      // Общее время не должно превышать 5 секунд
      expect(totalTime).toBeLessThan(5000);
    });

    it('should handle 50 concurrent dashboard requests', async () => {
      const { robotService } = require('../src/sockets/websocket');

      const mockRobots = Array.from({ length: 20 }, (_, i) => ({
        id: `ROBOT-${i + 1}`,
        status: 'active',
        battery: 85
      }));

      const mockScans = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        robot_id: `ROBOT-${(i % 20) + 1}`,
        product_id: `PROD-${i + 1}`,
        quantity: 10,
        scanned_at: new Date().toISOString()
      }));

      const mockStats = {
        activeRobots: 20,
        totalRobots: 20,
        scannedToday: 500,
        criticalStock: 2,
        avgBattery: 85
      };

      robotService.getCurrentRobots.mockResolvedValue(mockRobots);
      robotService.getRecentScans.mockResolvedValue(mockScans);
      robotService.getDashboardStats.mockResolvedValue(mockStats);

      const startTime = Date.now();
      const promises = Array.from({ length: 50 }, () => 
        request(app).get('/api/dashboard/current')
      );
      
      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Все запросы должны быть успешными
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.robots).toHaveLength(20);
        expect(response.body.recentScans).toHaveLength(50);
      });

      // Общее время не должно превышать 10 секунд
      expect(totalTime).toBeLessThan(10000);
    });

    it('should handle mixed concurrent requests', async () => {
      const { robotsService } = require('../src/services/AllServices');
      const { robotService } = require('../src/sockets/websocket');
      const { aiService } = require('../src/services/AllServices');

      // Мокаем все сервисы
      robotsService.getAllRobots.mockResolvedValue([]);
      robotsService.getRobotsStats.mockResolvedValue({});
      robotService.getCurrentRobots.mockResolvedValue([]);
      robotService.getRecentScans.mockResolvedValue([]);
      robotService.getDashboardStats.mockResolvedValue({});
      aiService.getPredictions.mockResolvedValue({ predictions: [] });

      const startTime = Date.now();
      
      // Смешанные запросы
      const promises = [
        ...Array.from({ length: 20 }, () => request(app).get('/api/robots')),
        ...Array.from({ length: 20 }, () => request(app).get('/api/robots/stats')),
        ...Array.from({ length: 20 }, () => request(app).get('/api/dashboard/current')),
        ...Array.from({ length: 20 }, () => request(app).post('/api/ai/predict').send({})),
        ...Array.from({ length: 20 }, () => request(app).get('/api/ai/status'))
      ];
      
      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Все запросы должны быть успешными
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Общее время не должно превышать 15 секунд
      expect(totalTime).toBeLessThan(15000);
    });
  });

  describe('Memory Usage Tests', () => {
    it('should handle large datasets without memory issues', async () => {
      const { robotsService } = require('../src/services/AllServices');
      
      // Создаем большой набор данных
      const largeRobotsArray = Array.from({ length: 10000 }, (_, i) => ({
        id: `ROBOT-${i + 1}`,
        status: i % 2 === 0 ? 'active' : 'charging',
        battery: Math.floor(Math.random() * 100),
        zone: String.fromCharCode(65 + (i % 26)), // A-Z
        lastSeen: new Date().toISOString(),
        totalScans: Math.floor(Math.random() * 1000)
      }));

      robotsService.getAllRobots.mockResolvedValue(largeRobotsArray);

      const startTime = Date.now();
      const response = await request(app).get('/api/robots');
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(response.body.robots).toHaveLength(10000);
      expect(responseTime).toBeLessThan(1000); // Не более 1 секунды
    });

    it('should handle large CSV processing efficiently', async () => {
      const { uploadService } = require('../src/services/AllServices');
      
      // Мокаем обработку большого CSV
      const largeCsvData = Array.from({ length: 5000 }, (_, i) => ({
        robot_id: `ROBOT-${(i % 100) + 1}`,
        product_id: `PROD-${i + 1}`,
        product_name: `Product ${i + 1}`,
        quantity: Math.floor(Math.random() * 100),
        zone: String.fromCharCode(65 + (i % 26)),
        row_number: Math.floor(Math.random() * 10) + 1,
        shelf_number: Math.floor(Math.random() * 5) + 1,
        status: 'OK',
        scanned_at: new Date().toISOString()
      }));

      uploadService.processCSVUpload.mockResolvedValue({
        success: true,
        processed_rows: 5000,
        errors: [],
        summary: {
          total_products: 5000,
          total_quantity: 250000,
          zones_updated: Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))
        }
      });

      const startTime = Date.now();
      
      // Симулируем обработку большого CSV
      const result = await uploadService.processCSVUpload(largeCsvData);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(result.processed_rows).toBe(5000);
      expect(processingTime).toBeLessThan(2000); // Не более 2 секунд
    });
  });

  describe('Database Query Performance', () => {
    it('should handle complex queries efficiently', async () => {
      const { robotService } = require('../src/sockets/websocket');

      // Мокаем сложные запросы к базе данных
      const complexStats = {
        activeRobots: 150,
        totalRobots: 200,
        scannedToday: 50000,
        criticalStock: 25,
        avgBattery: 78.5,
        zoneStats: Array.from({ length: 26 }, (_, i) => ({
          zone: String.fromCharCode(65 + i),
          robotCount: Math.floor(Math.random() * 10),
          scanCount: Math.floor(Math.random() * 1000),
          avgBattery: Math.floor(Math.random() * 100)
        })),
        hourlyStats: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          scans: Math.floor(Math.random() * 1000),
          robots: Math.floor(Math.random() * 50)
        }))
      };

      robotService.getDashboardStats.mockResolvedValue(complexStats);

      const startTime = Date.now();
      const response = await request(app).get('/api/dashboard/current');
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(response.body.statistics).toEqual(complexStats);
      expect(responseTime).toBeLessThan(300); // Не более 300ms для сложных запросов
    });
  });

  describe('Error Recovery Performance', () => {
    it('should recover from errors quickly', async () => {
      const { robotsService } = require('../src/services/AllServices');

      // Первый запрос - ошибка
      robotsService.getAllRobots.mockRejectedValueOnce(new Error('Database timeout'));
      
      // Второй запрос - успех
      const mockRobots = Array.from({ length: 100 }, (_, i) => ({
        id: `ROBOT-${i + 1}`,
        status: 'active',
        battery: 85
      }));
      robotsService.getAllRobots.mockResolvedValueOnce(mockRobots);

      const startTime = Date.now();
      
      // Первый запрос с ошибкой
      const errorResponse = await request(app).get('/api/robots');
      expect(errorResponse.status).toBe(500);
      
      // Второй запрос - успешный
      const successResponse = await request(app).get('/api/robots');
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(successResponse.status).toBe(200);
      expect(successResponse.body.robots).toHaveLength(100);
      expect(totalTime).toBeLessThan(1000); // Восстановление не более 1 секунды
    });
  });

  describe('Load Testing Simulation', () => {
    it('should maintain performance under sustained load', async () => {
      const { robotsService } = require('../src/services/AllServices');
      
      const mockRobots = Array.from({ length: 50 }, (_, i) => ({
        id: `ROBOT-${i + 1}`,
        status: 'active',
        battery: 85
      }));

      robotsService.getAllRobots.mockResolvedValue(mockRobots);

      const startTime = Date.now();
      const responseTimes: number[] = [];
      
      // Симулируем нагрузку в течение 5 секунд
      const loadTestDuration = 5000;
      const requestInterval = 50; // Запрос каждые 50ms
      
      const promises: Promise<any>[] = [];
      
      for (let i = 0; i < loadTestDuration / requestInterval; i++) {
        const requestStart = Date.now();
        promises.push(
          request(app).get('/api/robots').then(response => {
            const requestEnd = Date.now();
            responseTimes.push(requestEnd - requestStart);
            return response;
          })
        );
        
        // Небольшая задержка между запросами
        if (i < (loadTestDuration / requestInterval) - 1) {
          await new Promise(resolve => setTimeout(resolve, requestInterval));
        }
      }
      
      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Все запросы должны быть успешными
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Среднее время ответа не должно превышать 100ms
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      expect(avgResponseTime).toBeLessThan(100);

      // Максимальное время ответа не должно превышать 500ms
      const maxResponseTime = Math.max(...responseTimes);
      expect(maxResponseTime).toBeLessThan(500);

      // Общее время теста не должно превышать 8 секунд
      expect(totalTime).toBeLessThan(8000);
    });
  });
});
