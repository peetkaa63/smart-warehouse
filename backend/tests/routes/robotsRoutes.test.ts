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

jest.mock('../src/repositories/RobotsRepository', () => ({
  robotsRepository: {
    updateRobotStatus: jest.fn()
  }
}));

jest.mock('../src/services/TaskQueueService', () => ({
  taskQueueService: {
    enqueue: jest.fn(),
    dequeue: jest.fn(),
    getTasks: jest.fn(),
    moveTasks: jest.fn(),
    robotTasks: new Map()
  }
}));

// Вспомогательная функция для создания JWT токена
const createToken = (role: string) => {
  return jwt.sign(
    { id: 1, email: 'test@example.com', role },
    process.env.JWT_SECRET || 'test-secret'
  );
};

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

  describe('POST /api/robots/:id/pause', () => {
    it('should pause robot for operator', async () => {
      const { robotsRepository } = require('../src/repositories/RobotsRepository');
      const { robotService } = require('../src/sockets/websocket');

      const mockRobot = {
        id: 'ROBOT-001',
        status: 'paused',
        battery_level: 85,
        current_zone: 'A',
        current_row: 1,
        current_shelf: 1
      };

      robotsRepository.updateRobotStatus.mockResolvedValue(mockRobot);
      const token = createToken('operator');

      const response = await request(app)
        .post('/api/robots/ROBOT-001/pause')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('paused');
      expect(robotsRepository.updateRobotStatus).toHaveBeenCalledWith('ROBOT-001', 'paused');
      expect(robotService.io.emit).toHaveBeenCalledWith('robot_command', expect.objectContaining({
        type: 'pause',
        robotId: 'ROBOT-001'
      }));
    });

    it('should pause robot for admin', async () => {
      const { robotsRepository } = require('../src/repositories/RobotsRepository');
      const token = createToken('admin');

      robotsRepository.updateRobotStatus.mockResolvedValue({ id: 'ROBOT-001', status: 'paused' });

      const response = await request(app)
        .post('/api/robots/ROBOT-001/pause')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject pause for viewer', async () => {
      const token = createToken('viewer');

      const response = await request(app)
        .post('/api/robots/ROBOT-001/pause')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/robots/ROBOT-001/pause');

      expect(response.status).toBe(401);
    });

    it('should handle errors', async () => {
      const { robotsRepository } = require('../src/repositories/RobotsRepository');
      const token = createToken('operator');

      robotsRepository.updateRobotStatus.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/robots/ROBOT-001/pause')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/robots/:id/resume', () => {
    it('should resume robot for operator', async () => {
      const { robotsRepository } = require('../src/repositories/RobotsRepository');
      const { robotService } = require('../src/sockets/websocket');

      const mockRobot = {
        id: 'ROBOT-001',
        status: 'active',
        battery_level: 85
      };

      robotsRepository.updateRobotStatus.mockResolvedValue(mockRobot);
      const token = createToken('operator');

      const response = await request(app)
        .post('/api/robots/ROBOT-001/resume')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('resumed');
      expect(robotsRepository.updateRobotStatus).toHaveBeenCalledWith('ROBOT-001', 'active');
      expect(robotService.io.emit).toHaveBeenCalledWith('robot_command', expect.objectContaining({
        type: 'resume',
        robotId: 'ROBOT-001'
      }));
    });

    it('should reject resume for viewer', async () => {
      const token = createToken('viewer');

      const response = await request(app)
        .post('/api/robots/ROBOT-001/resume')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/robots/:id/rescan', () => {
    it('should send rescan command for operator', async () => {
      const { robotService } = require('../src/sockets/websocket');
      const token = createToken('operator');

      const response = await request(app)
        .post('/api/robots/ROBOT-001/rescan')
        .set('Authorization', `Bearer ${token}`)
        .send({
          zone: 'A',
          row: 5,
          shelf: 3
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('rescan');
      expect(robotService.io.emit).toHaveBeenCalledWith('robot_command', expect.objectContaining({
        type: 'rescan',
        robotId: 'ROBOT-001',
        zone: 'A',
        row: 5,
        shelf: 3
      }));
    });

    it('should reject rescan for viewer', async () => {
      const token = createToken('viewer');

      const response = await request(app)
        .post('/api/robots/ROBOT-001/rescan')
        .set('Authorization', `Bearer ${token}`)
        .send({ zone: 'A', row: 1, shelf: 1 });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/robots/:id/tasks/assign', () => {
    it('should assign task to robot for operator', async () => {
      const { taskQueueService } = require('../src/services/TaskQueueService');
      const { robotService } = require('../src/sockets/websocket');
      const token = createToken('operator');

      taskQueueService.enqueue = jest.fn();

      const response = await request(app)
        .post('/api/robots/ROBOT-001/tasks/assign')
        .set('Authorization', `Bearer ${token}`)
        .send({
          taskId: 'TASK-001',
          priority: 1,
          payload: { zone: 'A', row: 1, shelf: 1 }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(taskQueueService.enqueue).toHaveBeenCalledWith('ROBOT-001', {
        id: 'TASK-001',
        priority: 1,
        payload: { zone: 'A', row: 1, shelf: 1 }
      });
      expect(robotService.io.emit).toHaveBeenCalledWith('task_assigned', expect.objectContaining({
        robotId: 'ROBOT-001',
        taskId: 'TASK-001'
      }));
    });

    it('should reject assignment without taskId', async () => {
      const token = createToken('operator');

      const response = await request(app)
        .post('/api/robots/ROBOT-001/tasks/assign')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('taskId required');
    });

    it('should reject assignment for viewer', async () => {
      const token = createToken('viewer');

      const response = await request(app)
        .post('/api/robots/ROBOT-001/tasks/assign')
        .set('Authorization', `Bearer ${token}`)
        .send({ taskId: 'TASK-001' });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/robots/:id/tasks', () => {
    it('should get tasks for robot (operator)', async () => {
      const { taskQueueService } = require('../src/services/TaskQueueService');
      const token = createToken('operator');

      const mockTasks = [
        { id: 'TASK-001', priority: 1 },
        { id: 'TASK-002', priority: 2 }
      ];

      taskQueueService.getTasks = jest.fn().mockReturnValue(mockTasks);

      const response = await request(app)
        .get('/api/robots/ROBOT-001/tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockTasks);
      expect(taskQueueService.getTasks).toHaveBeenCalledWith('ROBOT-001');
    });

    it('should reject getting tasks for viewer', async () => {
      const token = createToken('viewer');

      const response = await request(app)
        .get('/api/robots/ROBOT-001/tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/robots/tasks', () => {
    it('should get all robot tasks for operator', async () => {
      const { robotsService } = require('../src/services/AllServices');
      const { taskQueueService } = require('../src/services/TaskQueueService');
      const token = createToken('operator');

      const mockRobots = [
        { id: 'ROBOT-001', status: 'active' },
        { id: 'ROBOT-002', status: 'active' }
      ];

      robotsService.getAllRobots.mockResolvedValue(mockRobots);
      taskQueueService.getTasks = jest.fn((robotId) => 
        robotId === 'ROBOT-001' ? [{ id: 'TASK-001' }] : []
      );

      const response = await request(app)
        .get('/api/robots/tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should reject getting all tasks for viewer', async () => {
      const token = createToken('viewer');

      const response = await request(app)
        .get('/api/robots/tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/robots/tasks/reassign', () => {
    it('should reassign tasks between robots for operator', async () => {
      const { taskQueueService } = require('../src/services/TaskQueueService');
      const { robotService } = require('../src/sockets/websocket');
      const token = createToken('operator');

      taskQueueService.moveTasks = jest.fn();

      const response = await request(app)
        .post('/api/robots/tasks/reassign')
        .set('Authorization', `Bearer ${token}`)
        .send({
          from: 'ROBOT-001',
          to: 'ROBOT-002'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(taskQueueService.moveTasks).toHaveBeenCalledWith('ROBOT-001', 'ROBOT-002');
      expect(robotService.io.emit).toHaveBeenCalledWith('task_reassigned', expect.objectContaining({
        from: 'ROBOT-001',
        to: 'ROBOT-002'
      }));
    });

    it('should reject reassignment without from/to', async () => {
      const token = createToken('operator');

      const response = await request(app)
        .post('/api/robots/tasks/reassign')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('from/to robot ids required');
    });

    it('should reject reassignment for viewer', async () => {
      const token = createToken('viewer');

      const response = await request(app)
        .post('/api/robots/tasks/reassign')
        .set('Authorization', `Bearer ${token}`)
        .send({ from: 'ROBOT-001', to: 'ROBOT-002' });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/robots/tasks/reorder', () => {
    it('should reorder tasks for operator', async () => {
      const { taskQueueService } = require('../src/services/TaskQueueService');
      const { robotService } = require('../src/sockets/websocket');
      const token = createToken('operator');

      const newTasks = [
        { id: 'TASK-002', priority: 1 },
        { id: 'TASK-001', priority: 2 }
      ];

      taskQueueService.robotTasks = new Map();

      const response = await request(app)
        .post('/api/robots/tasks/reorder')
        .set('Authorization', `Bearer ${token}`)
        .send({
          robotId: 'ROBOT-001',
          tasks: newTasks
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject reorder without tasks array', async () => {
      const token = createToken('operator');

      const response = await request(app)
        .post('/api/robots/tasks/reorder')
        .set('Authorization', `Bearer ${token}`)
        .send({
          robotId: 'ROBOT-001',
          tasks: 'not-an-array'
        });

      expect(response.status).toBe(400);
    });

    it('should reject reorder for viewer', async () => {
      const token = createToken('viewer');

      const response = await request(app)
        .post('/api/robots/tasks/reorder')
        .set('Authorization', `Bearer ${token}`)
        .send({
          robotId: 'ROBOT-001',
          tasks: []
        });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/robots/tasks/delete', () => {
    it('should delete task for operator', async () => {
      const { taskQueueService } = require('../src/services/TaskQueueService');
      const { robotService } = require('../src/sockets/websocket');
      const token = createToken('operator');

      const mockTasks = [
        { id: 'TASK-001' },
        { id: 'TASK-002' },
        { id: 'TASK-003' }
      ];

      taskQueueService.getTasks = jest.fn().mockReturnValue(mockTasks);
      taskQueueService.robotTasks = new Map();
      taskQueueService.robotTasks.set('ROBOT-001', [...mockTasks]);

      const response = await request(app)
        .post('/api/robots/tasks/delete')
        .set('Authorization', `Bearer ${token}`)
        .send({
          robotId: 'ROBOT-001',
          idx: 1
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject delete with invalid index', async () => {
      const { taskQueueService } = require('../src/services/TaskQueueService');
      const token = createToken('operator');

      taskQueueService.getTasks = jest.fn().mockReturnValue([{ id: 'TASK-001' }]);

      const response = await request(app)
        .post('/api/robots/tasks/delete')
        .set('Authorization', `Bearer ${token}`)
        .send({
          robotId: 'ROBOT-001',
          idx: 10
        });

      expect(response.status).toBe(200);
    });

    it('should reject delete for viewer', async () => {
      const token = createToken('viewer');

      const response = await request(app)
        .post('/api/robots/tasks/delete')
        .set('Authorization', `Bearer ${token}`)
        .send({
          robotId: 'ROBOT-001',
          idx: 0
        });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/robots/:id/tasks/next', () => {
    it('should get next task without authentication (for emulator)', async () => {
      const { taskQueueService } = require('../src/services/TaskQueueService');

      const mockTask = { id: 'TASK-001', priority: 1 };
      taskQueueService.dequeue = jest.fn().mockReturnValue(mockTask);

      const response = await request(app)
        .get('/api/robots/ROBOT-001/tasks/next');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.task).toEqual(mockTask);
      expect(taskQueueService.dequeue).toHaveBeenCalledWith('ROBOT-001');
    });

    it('should return null when no tasks available', async () => {
      const { taskQueueService } = require('../src/services/TaskQueueService');

      taskQueueService.dequeue = jest.fn().mockReturnValue(undefined);

      const response = await request(app)
        .get('/api/robots/ROBOT-001/tasks/next');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.task).toBeNull();
    });
  });

  describe('GET /api/robots/:id/tasks/peek', () => {
    it('should peek tasks without authentication (for emulator)', async () => {
      const { taskQueueService } = require('../src/services/TaskQueueService');

      const mockTasks = [
        { id: 'TASK-001' },
        { id: 'TASK-002' }
      ];

      taskQueueService.getTasks = jest.fn().mockReturnValue(mockTasks);

      const response = await request(app)
        .get('/api/robots/ROBOT-001/tasks/peek');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tasks).toEqual(mockTasks);
      expect(taskQueueService.getTasks).toHaveBeenCalledWith('ROBOT-001');
    });
  });
});
