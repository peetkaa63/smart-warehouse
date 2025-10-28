import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { dashboardAPI } from '../../services/api'; // Теперь этот импорт будет работать

/**
 * Async thunk: получение агрегированных данных дашборда.
 *
 * Почему так:
 * - Один вызов API вместо множества — меньше чатов и гонок обновлений.
 * - Централизуем нормализацию ответа, чтобы компоненты не знали форму бэкенда.
 */
export const fetchDashboardData = createAsyncThunk(
  'dashboard/fetchData',
  async () => {
    const response = await dashboardAPI.getCurrentData();
    return response.data;
  }
);

interface DashboardState {
  robots: any[];
  recentScans: any[];
  statistics: {
    activeRobots: number;
    totalRobots: number;
    scannedToday: number;
    criticalStock: number;
    avgBattery: number;
  };
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  robots: [],
  recentScans: [],
  statistics: {
    activeRobots: 0,
    totalRobots: 0,
    scannedToday: 0,
    criticalStock: 0,
    avgBattery: 0
  },
  loading: false,
  error: null
};

/**
 * Redux slice дашборда.
 *
 * Почему так:
 * - Разделяем потоковые обновления (socket) и периодические через thunk, чтобы не блокировать UI и иметь fallback.
 */
const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    updateRobotData: (state, action) => {
      state.robots = action.payload.robots;
      state.statistics = action.payload.statistics;
    },
    addScan: (state, action) => {
      // Добавляем новый скан в начало, ограничиваем 20 записями
      state.recentScans = [action.payload, ...state.recentScans.slice(0, 19)];
    },
    updateDashboard: (state, action) => {
      state.robots = action.payload.robots;
      state.recentScans = action.payload.recentScans;
      state.statistics = action.payload.statistics;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.robots = action.payload.robots || [];
        state.recentScans = action.payload.recentScans || [];
        state.statistics = action.payload.statistics || initialState.statistics;
        state.error = null;
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch dashboard data';
      });
  }
});

export const { updateRobotData, addScan, updateDashboard, clearError } = dashboardSlice.actions;
export default dashboardSlice.reducer;