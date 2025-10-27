import { configureStore } from '@reduxjs/toolkit';
import dashboardReducer, { 
  fetchDashboardData, 
  updateRobotData, 
  addScan, 
  updateDashboard, 
  clearError 
} from '../slices/dashboardSlice';
import { dashboardAPI } from '../../services/api';

// Мокаем API
jest.mock('../../services/api', () => ({
  dashboardAPI: {
    getCurrentData: jest.fn()
  }
}));

describe('Dashboard Slice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    store = configureStore({
      reducer: {
        dashboard: dashboardReducer
      }
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = store.getState().dashboard;
      
      expect(state.robots).toEqual([]);
      expect(state.recentScans).toEqual([]);
      expect(state.statistics).toEqual({
        activeRobots: 0,
        totalRobots: 0,
        scannedToday: 0,
        criticalStock: 0,
        avgBattery: 0
      });
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('Fetch Dashboard Data Async Thunk', () => {
    it('should handle fetch pending state', () => {
      store.dispatch(fetchDashboardData());
      
      const state = store.getState().dashboard;
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle successful data fetch', async () => {
      const mockData = {
        robots: [
          { id: 'ROBOT-001', status: 'active', battery: 85 },
          { id: 'ROBOT-002', status: 'charging', battery: 45 }
        ],
        recentScans: [
          {
            id: 1,
            robot_id: 'ROBOT-001',
            product_id: 'PROD-001',
            quantity: 10,
            scanned_at: '2024-01-01T10:00:00Z'
          }
        ],
        statistics: {
          activeRobots: 2,
          totalRobots: 5,
          scannedToday: 150,
          criticalStock: 3,
          avgBattery: 75
        }
      };

      dashboardAPI.getCurrentData.mockResolvedValue({ data: mockData });
      
      await store.dispatch(fetchDashboardData());
      
      const state = store.getState().dashboard;
      expect(state.loading).toBe(false);
      expect(state.robots).toEqual(mockData.robots);
      expect(state.recentScans).toEqual(mockData.recentScans);
      expect(state.statistics).toEqual(mockData.statistics);
      expect(state.error).toBeNull();
    });

    it('should handle fetch failure', async () => {
      const errorMessage = 'Failed to fetch dashboard data';
      
      dashboardAPI.getCurrentData.mockRejectedValue(new Error(errorMessage));
      
      await store.dispatch(fetchDashboardData());
      
      const state = store.getState().dashboard;
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });

    it('should handle partial data', async () => {
      const mockData = {
        robots: [],
        recentScans: [],
        statistics: null
      };

      dashboardAPI.getCurrentData.mockResolvedValue({ data: mockData });
      
      await store.dispatch(fetchDashboardData());
      
      const state = store.getState().dashboard;
      expect(state.robots).toEqual([]);
      expect(state.recentScans).toEqual([]);
      expect(state.statistics).toEqual({
        activeRobots: 0,
        totalRobots: 0,
        scannedToday: 0,
        criticalStock: 0,
        avgBattery: 0
      });
    });

    it('should call dashboardAPI.getCurrentData', async () => {
      dashboardAPI.getCurrentData.mockResolvedValue({ data: {} });
      
      await store.dispatch(fetchDashboardData());
      
      expect(dashboardAPI.getCurrentData).toHaveBeenCalled();
    });
  });

  describe('Update Robot Data Action', () => {
    it('should update robots and statistics', () => {
      const payload = {
        robots: [
          { id: 'ROBOT-001', status: 'active', battery: 90 },
          { id: 'ROBOT-002', status: 'charging', battery: 30 }
        ],
        statistics: {
          activeRobots: 1,
          totalRobots: 2,
          scannedToday: 200,
          criticalStock: 1,
          avgBattery: 60
        }
      };

      store.dispatch(updateRobotData(payload));
      
      const state = store.getState().dashboard;
      expect(state.robots).toEqual(payload.robots);
      expect(state.statistics).toEqual(payload.statistics);
    });

    it('should not affect recentScans when updating robot data', () => {
      // Сначала устанавливаем данные
      store.dispatch({
        type: 'dashboard/fetchDashboardData/fulfilled',
        payload: {
          robots: [],
          recentScans: [{ id: 1, robot_id: 'ROBOT-001' }],
          statistics: {}
        }
      });

      const payload = {
        robots: [{ id: 'ROBOT-001', status: 'active' }],
        statistics: { activeRobots: 1, totalRobots: 1, scannedToday: 0, criticalStock: 0, avgBattery: 0 }
      };

      store.dispatch(updateRobotData(payload));
      
      const state = store.getState().dashboard;
      expect(state.recentScans).toEqual([{ id: 1, robot_id: 'ROBOT-001' }]);
    });
  });

  describe('Add Scan Action', () => {
    it('should add new scan to beginning of list', () => {
      // Сначала устанавливаем существующие сканы
      store.dispatch({
        type: 'dashboard/fetchDashboardData/fulfilled',
        payload: {
          robots: [],
          recentScans: [
            { id: 1, robot_id: 'ROBOT-001' },
            { id: 2, robot_id: 'ROBOT-002' }
          ],
          statistics: {}
        }
      });

      const newScan = { id: 3, robot_id: 'ROBOT-003', product_id: 'PROD-003' };
      store.dispatch(addScan(newScan));
      
      const state = store.getState().dashboard;
      expect(state.recentScans).toHaveLength(3);
      expect(state.recentScans[0]).toEqual(newScan);
      expect(state.recentScans[1]).toEqual({ id: 1, robot_id: 'ROBOT-001' });
    });

    it('should limit scans to 20 items', () => {
      // Создаем 20 существующих сканов
      const existingScans = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        robot_id: `ROBOT-${i + 1}`
      }));

      store.dispatch({
        type: 'dashboard/fetchDashboardData/fulfilled',
        payload: {
          robots: [],
          recentScans: existingScans,
          statistics: {}
        }
      });

      const newScan = { id: 21, robot_id: 'ROBOT-21' };
      store.dispatch(addScan(newScan));
      
      const state = store.getState().dashboard;
      expect(state.recentScans).toHaveLength(20);
      expect(state.recentScans[0]).toEqual(newScan);
      expect(state.recentScans[19]).toEqual({ id: 2, robot_id: 'ROBOT-2' });
    });

    it('should handle empty recentScans array', () => {
      const newScan = { id: 1, robot_id: 'ROBOT-001' };
      store.dispatch(addScan(newScan));
      
      const state = store.getState().dashboard;
      expect(state.recentScans).toEqual([newScan]);
    });
  });

  describe('Update Dashboard Action', () => {
    it('should update all dashboard data', () => {
      const payload = {
        robots: [
          { id: 'ROBOT-001', status: 'active', battery: 85 }
        ],
        recentScans: [
          { id: 1, robot_id: 'ROBOT-001', product_id: 'PROD-001' }
        ],
        statistics: {
          activeRobots: 1,
          totalRobots: 1,
          scannedToday: 50,
          criticalStock: 0,
          avgBattery: 85
        }
      };

      store.dispatch(updateDashboard(payload));
      
      const state = store.getState().dashboard;
      expect(state.robots).toEqual(payload.robots);
      expect(state.recentScans).toEqual(payload.recentScans);
      expect(state.statistics).toEqual(payload.statistics);
    });

    it('should completely replace existing data', () => {
      // Сначала устанавливаем данные
      store.dispatch({
        type: 'dashboard/fetchDashboardData/fulfilled',
        payload: {
          robots: [{ id: 'OLD-ROBOT' }],
          recentScans: [{ id: 1, robot_id: 'OLD-ROBOT' }],
          statistics: { activeRobots: 1, totalRobots: 1, scannedToday: 0, criticalStock: 0, avgBattery: 0 }
        }
      });

      const newPayload = {
        robots: [{ id: 'NEW-ROBOT' }],
        recentScans: [{ id: 2, robot_id: 'NEW-ROBOT' }],
        statistics: { activeRobots: 1, totalRobots: 1, scannedToday: 100, criticalStock: 0, avgBattery: 0 }
      };

      store.dispatch(updateDashboard(newPayload));
      
      const state = store.getState().dashboard;
      expect(state.robots).toEqual(newPayload.robots);
      expect(state.recentScans).toEqual(newPayload.recentScans);
      expect(state.statistics).toEqual(newPayload.statistics);
    });
  });

  describe('Clear Error Action', () => {
    it('should clear error state', () => {
      // Устанавливаем ошибку
      store.dispatch({
        type: 'dashboard/fetchDashboardData/rejected',
        error: { message: 'Test error' }
      });
      
      let state = store.getState().dashboard;
      expect(state.error).toBe('Test error');
      
      // Очищаем ошибку
      store.dispatch(clearError());
      
      state = store.getState().dashboard;
      expect(state.error).toBeNull();
    });

    it('should not affect other state when clearing error', () => {
      // Устанавливаем полное состояние
      store.dispatch({
        type: 'dashboard/fetchDashboardData/fulfilled',
        payload: {
          robots: [{ id: 'ROBOT-001' }],
          recentScans: [{ id: 1 }],
          statistics: { activeRobots: 1, totalRobots: 1, scannedToday: 0, criticalStock: 0, avgBattery: 0 }
        }
      });

      store.dispatch({
        type: 'dashboard/fetchDashboardData/rejected',
        error: { message: 'Test error' }
      });
      
      // Очищаем ошибку
      store.dispatch(clearError());
      
      const state = store.getState().dashboard;
      expect(state.error).toBeNull();
      expect(state.robots).toEqual([{ id: 'ROBOT-001' }]);
      expect(state.recentScans).toEqual([{ id: 1 }]);
      expect(state.loading).toBe(false);
    });
  });

  describe('State Transitions', () => {
    it('should handle complete data flow', async () => {
      const mockData = {
        robots: [{ id: 'ROBOT-001', status: 'active' }],
        recentScans: [{ id: 1, robot_id: 'ROBOT-001' }],
        statistics: { activeRobots: 1, totalRobots: 1, scannedToday: 0, criticalStock: 0, avgBattery: 0 }
      };

      dashboardAPI.getCurrentData.mockResolvedValue({ data: mockData });
      
      // Начальное состояние
      let state = store.getState().dashboard;
      expect(state.loading).toBe(false);
      expect(state.robots).toEqual([]);
      
      // Загружаем данные
      await store.dispatch(fetchDashboardData());
      
      // Проверяем загруженные данные
      state = store.getState().dashboard;
      expect(state.robots).toEqual(mockData.robots);
      expect(state.recentScans).toEqual(mockData.recentScans);
      
      // Добавляем новый скан
      const newScan = { id: 2, robot_id: 'ROBOT-002' };
      store.dispatch(addScan(newScan));
      
      // Проверяем обновленные данные
      state = store.getState().dashboard;
      expect(state.recentScans[0]).toEqual(newScan);
      expect(state.recentScans).toHaveLength(2);
      
      // Обновляем данные роботов
      const robotUpdate = {
        robots: [{ id: 'ROBOT-001', status: 'charging' }],
        statistics: { activeRobots: 0, totalRobots: 1, scannedToday: 0, criticalStock: 0, avgBattery: 0 }
      };
      store.dispatch(updateRobotData(robotUpdate));
      
      // Проверяем обновление роботов
      state = store.getState().dashboard;
      expect(state.robots[0].status).toBe('charging');
      expect(state.recentScans).toHaveLength(2); // recentScans не должны измениться
    });

    it('should handle error recovery', async () => {
      // Первая попытка - ошибка
      dashboardAPI.getCurrentData.mockRejectedValueOnce(new Error('Network error'));
      await store.dispatch(fetchDashboardData());
      
      let state = store.getState().dashboard;
      expect(state.error).toBe('Network error');
      
      // Очищаем ошибку
      store.dispatch(clearError());
      
      state = store.getState().dashboard;
      expect(state.error).toBeNull();
      
      // Вторая попытка - успех
      const mockData = {
        robots: [{ id: 'ROBOT-001' }],
        recentScans: [],
        statistics: { activeRobots: 1, totalRobots: 1, scannedToday: 0, criticalStock: 0, avgBattery: 0 }
      };
      
      dashboardAPI.getCurrentData.mockResolvedValueOnce({ data: mockData });
      await store.dispatch(fetchDashboardData());
      
      state = store.getState().dashboard;
      expect(state.error).toBeNull();
      expect(state.robots).toEqual(mockData.robots);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined data gracefully', async () => {
      dashboardAPI.getCurrentData.mockResolvedValue({ data: null });
      
      await store.dispatch(fetchDashboardData());
      
      const state = store.getState().dashboard;
      expect(state.robots).toEqual([]);
      expect(state.recentScans).toEqual([]);
      expect(state.statistics).toEqual({
        activeRobots: 0,
        totalRobots: 0,
        scannedToday: 0,
        criticalStock: 0,
        avgBattery: 0
      });
    });

    it('should handle empty arrays', async () => {
      const mockData = {
        robots: [],
        recentScans: [],
        statistics: {}
      };

      dashboardAPI.getCurrentData.mockResolvedValue({ data: mockData });
      
      await store.dispatch(fetchDashboardData());
      
      const state = store.getState().dashboard;
      expect(state.robots).toEqual([]);
      expect(state.recentScans).toEqual([]);
    });

    it('should handle very large scan arrays', () => {
      // Создаем много сканов
      const manyScans = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        robot_id: `ROBOT-${i + 1}`
      }));

      store.dispatch({
        type: 'dashboard/fetchDashboardData/fulfilled',
        payload: {
          robots: [],
          recentScans: manyScans,
          statistics: {}
        }
      });

      // Добавляем еще один скан
      const newScan = { id: 101, robot_id: 'ROBOT-101' };
      store.dispatch(addScan(newScan));
      
      const state = store.getState().dashboard;
      expect(state.recentScans).toHaveLength(20); // Должно быть ограничено 20
      expect(state.recentScans[0]).toEqual(newScan);
    });
  });
});
