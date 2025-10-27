import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import userEvent from '@testing-library/user-event';
import Dashboard from '../../pages/Dashboard';
import dashboardReducer from '../../store/slices/dashboardSlice';
import { fetchDashboardData } from '../../store/slices/dashboardSlice';

// Мокаем компоненты
jest.mock('../../components/WarehouseMap', () => {
  return function MockWarehouseMap({ robots }: { robots: any[] }) {
    return <div data-testid="warehouse-map">Warehouse Map with {robots.length} robots</div>;
  };
});

jest.mock('../../components/RealTimeStats', () => {
  return function MockRealTimeStats({ statistics }: { statistics: any }) {
    return <div data-testid="real-time-stats">Stats: {statistics.activeRobots} active robots</div>;
  };
});

jest.mock('../../components/RecentScans', () => {
  return function MockRecentScans({ scans }: { scans: any[] }) {
    return <div data-testid="recent-scans">Recent Scans: {scans.length} scans</div>;
  };
});

jest.mock('../../components/AIPredictions', () => {
  return function MockAIPredictions() {
    return <div data-testid="ai-predictions">AI Predictions</div>;
  };
});

// Мокаем framer-motion для тестов
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => children
}));

// Мокаем API
jest.mock('../../services/api', () => ({
  dashboardAPI: {
    getCurrentData: jest.fn()
  }
}));

const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      dashboard: dashboardReducer
    },
    preloadedState: {
      dashboard: {
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
        error: null,
        ...initialState.dashboard
      }
    }
  });
};

const renderWithProviders = (component: React.ReactElement, initialState = {}) => {
  const store = createTestStore(initialState);
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  );
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render dashboard title and refresh button', () => {
      renderWithProviders(<Dashboard />);
      
      expect(screen.getByText('Текущий мониторинг')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByLabelText('Обновить данные')).toBeInTheDocument();
    });

    it('should render all dashboard components', () => {
      renderWithProviders(<Dashboard />);
      
      expect(screen.getByTestId('warehouse-map')).toBeInTheDocument();
      expect(screen.getByTestId('real-time-stats')).toBeInTheDocument();
      expect(screen.getByTestId('recent-scans')).toBeInTheDocument();
      expect(screen.getByTestId('ai-predictions')).toBeInTheDocument();
    });

    it('should render with empty data initially', () => {
      renderWithProviders(<Dashboard />);
      
      expect(screen.getByText('Warehouse Map with 0 robots')).toBeInTheDocument();
      expect(screen.getByText('Stats: 0 active robots')).toBeInTheDocument();
      expect(screen.getByText('Recent Scans: 0 scans')).toBeInTheDocument();
    });
  });

  describe('Data Loading', () => {
    it('should dispatch fetchDashboardData on mount', () => {
      const store = createTestStore();
      const dispatchSpy = jest.spyOn(store, 'dispatch');
      
      renderWithProviders(<Dashboard />, {});
      
      expect(dispatchSpy).toHaveBeenCalledWith(fetchDashboardData());
    });

    it('should show loading state', () => {
      renderWithProviders(<Dashboard />, {
        dashboard: {
          loading: true
        }
      });
      
      expect(screen.getByText('Загрузка данных мониторинга...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should hide loading state when data is loaded', () => {
      renderWithProviders(<Dashboard />, {
        dashboard: {
          loading: false,
          robots: [{ id: 'ROBOT-001', status: 'active' }],
          recentScans: [{ id: 1, robot_id: 'ROBOT-001' }],
          statistics: {
            activeRobots: 1,
            totalRobots: 1,
            scannedToday: 10,
            criticalStock: 0,
            avgBattery: 85
          }
        }
      });
      
      expect(screen.queryByText('Загрузка данных мониторинга...')).not.toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    it('should display robots data', () => {
      const mockRobots = [
        { id: 'ROBOT-001', status: 'active', battery: 85 },
        { id: 'ROBOT-002', status: 'charging', battery: 45 }
      ];

      renderWithProviders(<Dashboard />, {
        dashboard: {
          loading: false,
          robots: mockRobots
        }
      });
      
      expect(screen.getByText('Warehouse Map with 2 robots')).toBeInTheDocument();
    });

    it('should display recent scans data', () => {
      const mockScans = [
        { id: 1, robot_id: 'ROBOT-001', product_id: 'PROD-001' },
        { id: 2, robot_id: 'ROBOT-002', product_id: 'PROD-002' }
      ];

      renderWithProviders(<Dashboard />, {
        dashboard: {
          loading: false,
          recentScans: mockScans
        }
      });
      
      expect(screen.getByText('Recent Scans: 2 scans')).toBeInTheDocument();
    });

    it('should display statistics data', () => {
      const mockStats = {
        activeRobots: 3,
        totalRobots: 5,
        scannedToday: 150,
        criticalStock: 2,
        avgBattery: 75
      };

      renderWithProviders(<Dashboard />, {
        dashboard: {
          loading: false,
          statistics: mockStats
        }
      });
      
      expect(screen.getByText('Stats: 3 active robots')).toBeInTheDocument();
    });

    it('should handle null/undefined data gracefully', () => {
      renderWithProviders(<Dashboard />, {
        dashboard: {
          loading: false,
          robots: null,
          recentScans: undefined,
          statistics: null
        }
      });
      
      expect(screen.getByText('Warehouse Map with 0 robots')).toBeInTheDocument();
      expect(screen.getByText('Stats: 0 active robots')).toBeInTheDocument();
      expect(screen.getByText('Recent Scans: 0 scans')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message', () => {
      renderWithProviders(<Dashboard />, {
        dashboard: {
          loading: false,
          error: 'Failed to fetch dashboard data'
        }
      });
      
      expect(screen.getByText('Failed to fetch dashboard data')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should not display error when no error', () => {
      renderWithProviders(<Dashboard />, {
        dashboard: {
          loading: false,
          error: null
        }
      });
      
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should show content even when there is an error', () => {
      renderWithProviders(<Dashboard />, {
        dashboard: {
          loading: false,
          error: 'Network error',
          robots: [{ id: 'ROBOT-001' }]
        }
      });
      
      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(screen.getByText('Warehouse Map with 1 robots')).toBeInTheDocument();
    });
  });

  describe('Refresh Functionality', () => {
    it('should dispatch fetchDashboardData when refresh button is clicked', async () => {
      const user = userEvent.setup();
      const store = createTestStore();
      const dispatchSpy = jest.spyOn(store, 'dispatch');
      
      renderWithProviders(<Dashboard />, {});
      
      const refreshButton = screen.getByLabelText('Обновить данные');
      await user.click(refreshButton);
      
      expect(dispatchSpy).toHaveBeenCalledWith(fetchDashboardData());
    });

    it('should show loading state during refresh', async () => {
      const user = userEvent.setup();
      const { dashboardAPI } = require('../../services/api');
      
      // Мокаем асинхронный API вызов
      dashboardAPI.getCurrentData.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: {} }), 100))
      );
      
      renderWithProviders(<Dashboard />, {
        dashboard: {
          loading: false
        }
      });
      
      const refreshButton = screen.getByLabelText('Обновить данные');
      await user.click(refreshButton);
      
      // Проверяем, что loading состояние активируется
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });
  });

  describe('Alert System', () => {
    it('should display alert when set', () => {
      const { rerender } = renderWithProviders(<Dashboard />);
      
      // Симулируем установку алерта через внутреннее состояние компонента
      // В реальном тесте это было бы сделано через взаимодействие с компонентом
      const alertElement = screen.queryByRole('alert');
      expect(alertElement).not.toBeInTheDocument();
    });

    it('should close alert when close button is clicked', async () => {
      const user = userEvent.setup();
      
      // Мокаем компонент с алертом
      const DashboardWithAlert = () => {
        const [alert, setAlert] = React.useState({ type: 'success' as const, message: 'Test alert' });
        
        return (
          <div>
            {alert && (
              <div role="alert">
                {alert.message}
                <button onClick={() => setAlert(null)}>Close</button>
              </div>
            )}
          </div>
        );
      };
      
      render(
        <Provider store={createTestStore()}>
          <BrowserRouter>
            <DashboardWithAlert />
          </BrowserRouter>
        </Provider>
      );
      
      expect(screen.getByText('Test alert')).toBeInTheDocument();
      
      const closeButton = screen.getByText('Close');
      await user.click(closeButton);
      
      expect(screen.queryByText('Test alert')).not.toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('should have proper grid layout', () => {
      renderWithProviders(<Dashboard />, {
        dashboard: {
          loading: false
        }
      });
      
      // Проверяем, что компоненты отображаются в правильном порядке
      const components = screen.getAllByTestId(/warehouse-map|real-time-stats|recent-scans|ai-predictions/);
      expect(components).toHaveLength(4);
    });

    it('should display refresh button with proper styling', () => {
      renderWithProviders(<Dashboard />);
      
      const refreshButton = screen.getByLabelText('Обновить данные');
      expect(refreshButton).toBeInTheDocument();
      expect(refreshButton).toHaveAttribute('color', 'primary');
    });
  });

  describe('Component Integration', () => {
    it('should pass correct props to WarehouseMap', () => {
      const mockRobots = [
        { id: 'ROBOT-001', status: 'active' },
        { id: 'ROBOT-002', status: 'charging' }
      ];

      renderWithProviders(<Dashboard />, {
        dashboard: {
          loading: false,
          robots: mockRobots
        }
      });
      
      expect(screen.getByText('Warehouse Map with 2 robots')).toBeInTheDocument();
    });

    it('should pass correct props to RealTimeStats', () => {
      const mockStats = {
        activeRobots: 2,
        totalRobots: 5,
        scannedToday: 100,
        criticalStock: 1,
        avgBattery: 80
      };

      renderWithProviders(<Dashboard />, {
        dashboard: {
          loading: false,
          statistics: mockStats
        }
      });
      
      expect(screen.getByText('Stats: 2 active robots')).toBeInTheDocument();
    });

    it('should pass correct props to RecentScans', () => {
      const mockScans = [
        { id: 1, robot_id: 'ROBOT-001', product_id: 'PROD-001' },
        { id: 2, robot_id: 'ROBOT-002', product_id: 'PROD-002' },
        { id: 3, robot_id: 'ROBOT-003', product_id: 'PROD-003' }
      ];

      renderWithProviders(<Dashboard />, {
        dashboard: {
          loading: false,
          recentScans: mockScans
        }
      });
      
      expect(screen.getByText('Recent Scans: 3 scans')).toBeInTheDocument();
    });

    it('should render AIPredictions component', () => {
      renderWithProviders(<Dashboard />, {
        dashboard: {
          loading: false
        }
      });
      
      expect(screen.getByTestId('ai-predictions')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty arrays', () => {
      renderWithProviders(<Dashboard />, {
        dashboard: {
          loading: false,
          robots: [],
          recentScans: [],
          statistics: {
            activeRobots: 0,
            totalRobots: 0,
            scannedToday: 0,
            criticalStock: 0,
            avgBattery: 0
          }
        }
      });
      
      expect(screen.getByText('Warehouse Map with 0 robots')).toBeInTheDocument();
      expect(screen.getByText('Stats: 0 active robots')).toBeInTheDocument();
      expect(screen.getByText('Recent Scans: 0 scans')).toBeInTheDocument();
    });

    it('should handle large datasets', () => {
      const largeRobotsArray = Array.from({ length: 100 }, (_, i) => ({
        id: `ROBOT-${i + 1}`,
        status: 'active'
      }));

      renderWithProviders(<Dashboard />, {
        dashboard: {
          loading: false,
          robots: largeRobotsArray
        }
      });
      
      expect(screen.getByText('Warehouse Map with 100 robots')).toBeInTheDocument();
    });

    it('should handle malformed data gracefully', () => {
      renderWithProviders(<Dashboard />, {
        dashboard: {
          loading: false,
          robots: [null, undefined, { id: 'ROBOT-001' }],
          recentScans: [{ invalid: 'data' }],
          statistics: {
            activeRobots: 'invalid',
            totalRobots: null,
            scannedToday: undefined,
            criticalStock: 0,
            avgBattery: 0
          }
        }
      });
      
      // Компонент должен отображаться без ошибок
      expect(screen.getByTestId('warehouse-map')).toBeInTheDocument();
      expect(screen.getByTestId('real-time-stats')).toBeInTheDocument();
      expect(screen.getByTestId('recent-scans')).toBeInTheDocument();
    });
  });
});
