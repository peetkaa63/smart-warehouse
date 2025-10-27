import request from 'supertest';
import express from 'express';
import robotsRoutes from '../src/routes/robotsRoutes';
import jwt from 'jsonwebtoken';

// Создаем тестовое приложение
const app = express();
app.use(express.json());
app.use('/api/robots', robotsRoutes);

// Мокаем сервисы
jest.mock('../src/services/AllServices', () => ({
  robotsService: {
    processRobotData: jest.fn(),
    getAllRobots: jest.fn(),
    getRobotsStats: jest.fn()
  }
}));

jest.mock('../src/sockets/websocket', () => ({
  robotService: {
    io: {
      emit: jest.fn()
    }
  }
}));

describe('Robots Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/robots/data', () => {
    it('should process robot data successfully', async () => {
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

    it('should handle processing errors', async () => {
      const { robotsService } = require('../src/services/AllServices');

      robotsService.processRobotData.mockRejectedValue(new Error('Processing failed'));

      const response = await request(app)
        .post('/api/robots/data')
        .send({
          robot_id: 'ROBOT-001',
          scans: []
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Processing failed'
      });
    });

    it('should validate robot data structure', async () => {
      const response = await request(app)
        .post('/api/robots/data')
        .send({});

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/robots', () => {
    it('should return all robots', async () => {
      const { robotsService } = require('../src/services/AllServices');

      const mockRobots = [
        { id: 'ROBOT-001', status: 'active', battery: 85 },
        { id: 'ROBOT-002', status: 'charging', battery: 45 }
      ];

      robotsService.getAllRobots.mockResolvedValue(mockRobots);

      const response = await request(app)
        .get('/api/robots');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ robots: mockRobots });
      expect(robotsService.getAllRobots).toHaveBeenCalled();
    });

    it('should handle get robots errors', async () => {
      const { robotsService } = require('../src/services/AllServices');

      robotsService.getAllRobots.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/robots');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/robots/stats', () => {
    it('should return robots statistics', async () => {
      const { robotsService } = require('../src/services/AllServices');

      const mockStats = {
        total_robots: 5,
        active_robots: 3,
        charging_robots: 2,
        avg_battery: 75,
        total_scans_today: 150
      };

      robotsService.getRobotsStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/robots/stats');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStats);
      expect(robotsService.getRobotsStats).toHaveBeenCalled();
    });

    it('should handle stats errors', async () => {
      const { robotsService } = require('../src/services/AllServices');

      robotsService.getRobotsStats.mockRejectedValue(new Error('Stats calculation failed'));

      const response = await request(app)
        .get('/api/robots/stats');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });
});
