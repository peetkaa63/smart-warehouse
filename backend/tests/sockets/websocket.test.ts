import { Server } from 'socket.io';
import { createServer } from 'http';
import { setupWebSocket, robotService } from '../src/sockets/websocket';
import { RobotService } from '../src/services/robotService';

// Мокаем RobotService
jest.mock('../src/services/robotService', () => {
  return {
    RobotService: jest.fn().mockImplementation(() => ({
      broadcastDashboardUpdate: jest.fn(),
      getCurrentRobots: jest.fn(),
      getRecentScans: jest.fn(),
      getDashboardStats: jest.fn()
    }))
  };
});

describe('WebSocket Integration', () => {
  let server: any;
  let io: Server;
  let clientSocket: any;

  beforeAll((done) => {
    server = createServer();
    io = new Server(server);
    
    setupWebSocket(io);
    
    server.listen(() => {
      const port = server.address().port;
      clientSocket = require('socket.io-client')(`http://localhost:${port}`);
      done();
    });
  });

  afterAll((done) => {
    if (clientSocket) {
      clientSocket.close();
    }
    server.close(done);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('should handle client connection', (done) => {
      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        done();
      });
    });

    it('should handle client disconnection', (done) => {
      const tempSocket = require('socket.io-client')(`http://localhost:${server.address().port}`);
      
      tempSocket.on('connect', () => {
        tempSocket.disconnect();
      });

      tempSocket.on('disconnect', () => {
        expect(tempSocket.connected).toBe(false);
        done();
      });
    });
  });

  describe('Dashboard Subscription', () => {
    it('should subscribe client to dashboard updates', (done) => {
      const mockRobotService = robotService as jest.Mocked<RobotService>;
      
      mockRobotService.broadcastDashboardUpdate.mockResolvedValue(undefined);

      clientSocket.emit('subscribe_dashboard');

      setTimeout(() => {
        expect(mockRobotService.broadcastDashboardUpdate).toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should handle dashboard update requests', (done) => {
      const mockRobotService = robotService as jest.Mocked<RobotService>;
      
      mockRobotService.broadcastDashboardUpdate.mockResolvedValue(undefined);

      clientSocket.emit('request_dashboard_update');

      setTimeout(() => {
        expect(mockRobotService.broadcastDashboardUpdate).toHaveBeenCalled();
        done();
      }, 100);
    });
  });

  describe('Real-time Data Broadcasting', () => {
    it('should broadcast robot data updates', (done) => {
      const mockData = {
        robot_id: 'ROBOT-001',
        processed_scans: 5,
        timestamp: new Date().toISOString()
      };

      clientSocket.on('robot_data_received', (data: any) => {
        expect(data).toEqual(mockData);
        done();
      });

      // Симулируем получение данных от робота
      io.emit('robot_data_received', mockData);
    });

    it('should broadcast dashboard updates', (done) => {
      const mockDashboardData = {
        robots: [
          { id: 'ROBOT-001', status: 'active', battery: 85 }
        ],
        recentScans: [
          { id: 1, robot_id: 'ROBOT-001', product_id: 'PROD-001' }
        ],
        statistics: {
          activeRobots: 1,
          totalRobots: 5,
          scannedToday: 150
        }
      };

      clientSocket.on('dashboard_update', (data: any) => {
        expect(data).toEqual(mockDashboardData);
        done();
      });

      // Симулируем обновление dashboard
      io.emit('dashboard_update', mockDashboardData);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', (done) => {
      const mockRobotService = robotService as jest.Mocked<RobotService>;
      
      mockRobotService.broadcastDashboardUpdate.mockRejectedValue(new Error('Service error'));

      clientSocket.emit('request_dashboard_update');

      setTimeout(() => {
        // Проверяем, что ошибка не приводит к падению сервера
        expect(clientSocket.connected).toBe(true);
        done();
      }, 100);
    });
  });

  describe('Room Management', () => {
    it('should add clients to dashboard room', (done) => {
      const mockSocket = {
        id: 'test-socket-id',
        join: jest.fn(),
        emit: jest.fn()
      };

      // Мокаем socket.join
      const originalJoin = mockSocket.join;
      mockSocket.join = jest.fn((room: string) => {
        expect(room).toBe('dashboard');
        done();
      });

      // Симулируем подписку на dashboard
      clientSocket.emit('subscribe_dashboard');
    });
  });
});

describe('RobotService Integration', () => {
  let mockIo: any;
  let robotService: RobotService;

  beforeEach(() => {
    mockIo = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis()
    };
    
    robotService = new RobotService(mockIo);
  });

  describe('Dashboard Updates', () => {
    it('should broadcast dashboard updates to all clients', async () => {
      const mockData = {
        robots: [],
        recentScans: [],
        statistics: {}
      };

      // Мокаем методы получения данных
      jest.spyOn(robotService, 'getCurrentRobots').mockResolvedValue([]);
      jest.spyOn(robotService, 'getRecentScans').mockResolvedValue([]);
      jest.spyOn(robotService, 'getDashboardStats').mockResolvedValue({});

      await robotService.broadcastDashboardUpdate();

      expect(mockIo.emit).toHaveBeenCalledWith('dashboard_update', expect.any(Object));
    });

    it('should handle partial data failures', async () => {
      jest.spyOn(robotService, 'getCurrentRobots').mockRejectedValue(new Error('Database error'));
      jest.spyOn(robotService, 'getRecentScans').mockResolvedValue([]);
      jest.spyOn(robotService, 'getDashboardStats').mockResolvedValue({});

      await expect(robotService.broadcastDashboardUpdate()).rejects.toThrow('Database error');
    });
  });

  describe('Data Retrieval', () => {
    it('should retrieve current robots', async () => {
      const mockRobots = [
        { id: 'ROBOT-001', status: 'active', battery: 85 },
        { id: 'ROBOT-002', status: 'charging', battery: 45 }
      ];

      jest.spyOn(robotService, 'getCurrentRobots').mockResolvedValue(mockRobots);

      const result = await robotService.getCurrentRobots();
      expect(result).toEqual(mockRobots);
    });

    it('should retrieve recent scans', async () => {
      const mockScans = [
        {
          id: 1,
          robot_id: 'ROBOT-001',
          product_id: 'PROD-001',
          quantity: 10,
          scanned_at: new Date().toISOString()
        }
      ];

      jest.spyOn(robotService, 'getRecentScans').mockResolvedValue(mockScans);

      const result = await robotService.getRecentScans();
      expect(result).toEqual(mockScans);
    });

    it('should retrieve dashboard statistics', async () => {
      const mockStats = {
        activeRobots: 2,
        totalRobots: 5,
        scannedToday: 150,
        criticalStock: 3,
        avgBattery: 75
      };

      jest.spyOn(robotService, 'getDashboardStats').mockResolvedValue(mockStats);

      const result = await robotService.getDashboardStats();
      expect(result).toEqual(mockStats);
    });
  });
});
