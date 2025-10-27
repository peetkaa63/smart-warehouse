import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import History from '../../pages/History';
import { historyAPI } from '../../services/api';
import { exportAPI } from '../../services/api';

// Мокаем компоненты
jest.mock('../../components/TrendChart', () => {
  return function MockTrendChart() {
    return <div data-testid="trend-chart">Trend Chart</div>;
  };
});

jest.mock('../../components/EnhancedAnalyticsModal', () => {
  return function MockEnhancedAnalyticsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    return open ? (
      <div data-testid="analytics-modal">
        <button onClick={onClose}>Close Modal</button>
        Analytics Modal
      </div>
    ) : null;
  };
});

jest.mock('../../components/HistoryFilters', () => {
  return function MockHistoryFilters({ filters, onFilterChange, onApplyFilters, onResetFilters }: any) {
    return (
      <div data-testid="history-filters">
        <input
          data-testid="from-date"
          value={filters.from}
          onChange={(e) => onFilterChange('from', e.target.value)}
          placeholder="From date"
        />
        <input
          data-testid="to-date"
          value={filters.to}
          onChange={(e) => onFilterChange('to', e.target.value)}
          placeholder="To date"
        />
        <input
          data-testid="product-id"
          value={filters.productId}
          onChange={(e) => onFilterChange('productId', e.target.value)}
          placeholder="Product ID"
        />
        <input
          data-testid="robot-id"
          value={filters.robotId}
          onChange={(e) => onFilterChange('robotId', e.target.value)}
          placeholder="Robot ID"
        />
        <button onClick={onApplyFilters} data-testid="apply-filters">Apply Filters</button>
        <button onClick={onResetFilters} data-testid="reset-filters">Reset Filters</button>
      </div>
    );
  };
});

jest.mock('../../components/HistoryStats', () => {
  return function MockHistoryStats({ stats, loading, hasStats }: any) {
    if (loading) return <div data-testid="history-stats">Loading stats...</div>;
    if (!hasStats) return <div data-testid="history-stats">No stats available</div>;
    return (
      <div data-testid="history-stats">
        Total Scans: {stats?.totalScans || 0}
        Unique Products: {stats?.uniqueProducts || 0}
        Discrepancies: {stats?.discrepancies || 0}
      </div>
    );
  };
});

jest.mock('../../components/HistoryTable', () => {
  return function MockHistoryTable({ 
    data, 
    loading, 
    page, 
    rowsPerPage, 
    totalCount, 
    onPageChange, 
    onRowsPerPageChange,
    hasActiveFilters 
  }: any) {
    if (loading) return <div data-testid="history-table">Loading table...</div>;
    return (
      <div data-testid="history-table">
        <div>Table with {data.length} items</div>
        <div>Page: {page}, Rows per page: {rowsPerPage}, Total: {totalCount}</div>
        <div>Active filters: {hasActiveFilters ? 'Yes' : 'No'}</div>
        <button onClick={() => onPageChange(null, page + 1)} data-testid="next-page">Next Page</button>
        <select 
          onChange={(e) => onRowsPerPageChange({ target: { value: e.target.value } })}
          data-testid="rows-per-page"
        >
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
        </select>
      </div>
    );
  };
});

jest.mock('../../components/HistoryActions', () => {
  return function MockHistoryActions({ onExportExcel, onExportPDF, onOpenAnalytics }: any) {
    return (
      <div data-testid="history-actions">
        <button onClick={onExportExcel} data-testid="export-excel">Export Excel</button>
        <button onClick={onExportPDF} data-testid="export-pdf">Export PDF</button>
        <button onClick={onOpenAnalytics} data-testid="open-analytics">Open Analytics</button>
      </div>
    );
  };
});

// Мокаем API
jest.mock('../../services/api', () => ({
  historyAPI: {
    getHistory: jest.fn(),
    getStats: jest.fn()
  },
  exportAPI: {
    exportToExcel: jest.fn(),
    exportToPDF: jest.fn()
  }
}));

// Мокаем window.URL для экспорта
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL
  }
});

// Мокаем document.createElement для экспорта
const mockLink = {
  href: '',
  setAttribute: jest.fn(),
  click: jest.fn()
};
const mockCreateElement = jest.fn(() => mockLink);
Object.defineProperty(document, 'createElement', {
  value: mockCreateElement
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('History Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateObjectURL.mockReturnValue('blob:mock-url');
    mockRevokeObjectURL.mockImplementation(() => {});
    mockCreateElement.mockReturnValue(mockLink);
  });

  describe('Rendering', () => {
    it('should render history page title', () => {
      renderWithRouter(<History />);
      
      expect(screen.getByText('Исторические данные')).toBeInTheDocument();
    });

    it('should render all history components', () => {
      renderWithRouter(<History />);
      
      expect(screen.getByTestId('history-filters')).toBeInTheDocument();
      expect(screen.getByTestId('history-stats')).toBeInTheDocument();
      expect(screen.getByTestId('history-table')).toBeInTheDocument();
      expect(screen.getByTestId('trend-chart')).toBeInTheDocument();
      expect(screen.getByTestId('history-actions')).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      renderWithRouter(<History />);
      
      expect(screen.getByText('Loading table...')).toBeInTheDocument();
      expect(screen.getByText('Loading stats...')).toBeInTheDocument();
    });
  });

  describe('Data Loading', () => {
    it('should load data and stats on mount', async () => {
      const mockHistoryData = {
        data: {
          items: [
            {
              id: 1,
              scannedAt: '2024-01-01T10:00:00Z',
              robotId: 'ROBOT-001',
              zone: 'A',
              productId: 'PROD-001',
              productName: 'Router',
              quantity: 10,
              status: 'OK',
              rowNumber: 1,
              shelfNumber: 1
            }
          ],
          pagination: { total: 1 }
        }
      };

      const mockStatsData = {
        data: {
          totalScans: 100,
          uniqueProducts: 50,
          discrepancies: 5,
          avgZoneTime: 2.5
        }
      };

      historyAPI.getHistory.mockResolvedValue(mockHistoryData);
      historyAPI.getStats.mockResolvedValue(mockStatsData);

      renderWithRouter(<History />);

      await waitFor(() => {
        expect(historyAPI.getHistory).toHaveBeenCalledWith({
          page: 1,
          limit: 20
        });
        expect(historyAPI.getStats).toHaveBeenCalledWith({
          from: '',
          to: ''
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Table with 1 items')).toBeInTheDocument();
        expect(screen.getByText('Total Scans: 100')).toBeInTheDocument();
      });
    });

    it('should handle loading errors', async () => {
      historyAPI.getHistory.mockRejectedValue(new Error('Network error'));
      historyAPI.getStats.mockRejectedValue(new Error('Stats error'));

      renderWithRouter(<History />);

      await waitFor(() => {
        expect(screen.getByText('Ошибка при загрузке данных')).toBeInTheDocument();
      });
    });

    it('should reload data when page changes', async () => {
      const mockData = {
        data: { items: [], pagination: { total: 0 } }
      };

      historyAPI.getHistory.mockResolvedValue(mockData);
      historyAPI.getStats.mockResolvedValue({ data: {} });

      renderWithRouter(<History />);

      await waitFor(() => {
        expect(screen.getByText('Loading table...')).not.toBeInTheDocument();
      });

      const nextPageButton = screen.getByTestId('next-page');
      fireEvent.click(nextPageButton);

      await waitFor(() => {
        expect(historyAPI.getHistory).toHaveBeenCalledWith({
          page: 2,
          limit: 20
        });
      });
    });

    it('should reload data when rows per page changes', async () => {
      const mockData = {
        data: { items: [], pagination: { total: 0 } }
      };

      historyAPI.getHistory.mockResolvedValue(mockData);
      historyAPI.getStats.mockResolvedValue({ data: {} });

      renderWithRouter(<History />);

      await waitFor(() => {
        expect(screen.getByText('Loading table...')).not.toBeInTheDocument();
      });

      const rowsPerPageSelect = screen.getByTestId('rows-per-page');
      fireEvent.change(rowsPerPageSelect, { target: { value: '50' } });

      await waitFor(() => {
        expect(historyAPI.getHistory).toHaveBeenCalledWith({
          page: 1,
          limit: 50
        });
      });
    });
  });

  describe('Filtering', () => {
    it('should apply filters when Apply Filters button is clicked', async () => {
      const mockData = {
        data: { items: [], pagination: { total: 0 } }
      };

      historyAPI.getHistory.mockResolvedValue(mockData);
      historyAPI.getStats.mockResolvedValue({ data: {} });

      renderWithRouter(<History />);

      await waitFor(() => {
        expect(screen.getByText('Loading table...')).not.toBeInTheDocument();
      });

      const fromDateInput = screen.getByTestId('from-date');
      const toDateInput = screen.getByTestId('to-date');
      const productIdInput = screen.getByTestId('product-id');
      const applyButton = screen.getByTestId('apply-filters');

      fireEvent.change(fromDateInput, { target: { value: '2024-01-01' } });
      fireEvent.change(toDateInput, { target: { value: '2024-01-31' } });
      fireEvent.change(productIdInput, { target: { value: 'PROD-001' } });
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(historyAPI.getHistory).toHaveBeenCalledWith({
          page: 1,
          limit: 20,
          from: '2024-01-01',
          to: '2024-01-31',
          product_id: 'PROD-001'
        });
        expect(historyAPI.getStats).toHaveBeenCalledWith({
          from: '2024-01-01',
          to: '2024-01-31'
        });
      });
    });

    it('should reset filters when Reset Filters button is clicked', async () => {
      const mockData = {
        data: { items: [], pagination: { total: 0 } }
      };

      historyAPI.getHistory.mockResolvedValue(mockData);
      historyAPI.getStats.mockResolvedValue({ data: {} });

      renderWithRouter(<History />);

      await waitFor(() => {
        expect(screen.getByText('Loading table...')).not.toBeInTheDocument();
      });

      const fromDateInput = screen.getByTestId('from-date');
      const productIdInput = screen.getByTestId('product-id');
      const resetButton = screen.getByTestId('reset-filters');

      fireEvent.change(fromDateInput, { target: { value: '2024-01-01' } });
      fireEvent.change(productIdInput, { target: { value: 'PROD-001' } });
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(fromDateInput).toHaveValue('');
        expect(productIdInput).toHaveValue('');
      });
    });

    it('should detect active filters correctly', async () => {
      const mockData = {
        data: { items: [], pagination: { total: 0 } }
      };

      historyAPI.getHistory.mockResolvedValue(mockData);
      historyAPI.getStats.mockResolvedValue({ data: {} });

      renderWithRouter(<History />);

      await waitFor(() => {
        expect(screen.getByText('Active filters: No')).toBeInTheDocument();
      });

      const fromDateInput = screen.getByTestId('from-date');
      fireEvent.change(fromDateInput, { target: { value: '2024-01-01' } });

      const applyButton = screen.getByTestId('apply-filters');
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(screen.getByText('Active filters: Yes')).toBeInTheDocument();
      });
    });
  });

  describe('Export Functionality', () => {
    it('should export to Excel', async () => {
      const mockBlob = new Blob(['mock data'], { type: 'application/vnd.ms-excel' });
      exportAPI.exportToExcel.mockResolvedValue({ data: mockBlob });

      renderWithRouter(<History />);

      const exportExcelButton = screen.getByTestId('export-excel');
      fireEvent.click(exportExcelButton);

      await waitFor(() => {
        expect(exportAPI.exportToExcel).toHaveBeenCalledWith({});
        expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
        expect(mockLink.setAttribute).toHaveBeenCalledWith('download', expect.stringContaining('warehouse_export_'));
        expect(mockLink.click).toHaveBeenCalled();
        expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
      });
    });

    it('should export to PDF', async () => {
      const mockBlob = new Blob(['mock data'], { type: 'application/pdf' });
      exportAPI.exportToPDF.mockResolvedValue({ data: mockBlob });

      renderWithRouter(<History />);

      const exportPdfButton = screen.getByTestId('export-pdf');
      fireEvent.click(exportPdfButton);

      await waitFor(() => {
        expect(exportAPI.exportToPDF).toHaveBeenCalledWith({});
        expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
        expect(mockLink.setAttribute).toHaveBeenCalledWith('download', expect.stringContaining('warehouse_report_'));
        expect(mockLink.click).toHaveBeenCalled();
        expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
      });
    });

    it('should handle export errors', async () => {
      exportAPI.exportToExcel.mockRejectedValue(new Error('Export failed'));
      
      // Мокаем alert
      const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});

      renderWithRouter(<History />);

      const exportExcelButton = screen.getByTestId('export-excel');
      fireEvent.click(exportExcelButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Ошибка при экспорте в Excel');
      });

      mockAlert.mockRestore();
    });

    it('should export with filters applied', async () => {
      const mockBlob = new Blob(['mock data'], { type: 'application/vnd.ms-excel' });
      exportAPI.exportToExcel.mockResolvedValue({ data: mockBlob });

      renderWithRouter(<History />);

      // Применяем фильтры
      const fromDateInput = screen.getByTestId('from-date');
      const productIdInput = screen.getByTestId('product-id');
      const applyButton = screen.getByTestId('apply-filters');

      fireEvent.change(fromDateInput, { target: { value: '2024-01-01' } });
      fireEvent.change(productIdInput, { target: { value: 'PROD-001' } });
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(screen.getByText('Active filters: Yes')).toBeInTheDocument();
      });

      // Экспортируем
      const exportExcelButton = screen.getByTestId('export-excel');
      fireEvent.click(exportExcelButton);

      await waitFor(() => {
        expect(exportAPI.exportToExcel).toHaveBeenCalledWith({
          from: '2024-01-01',
          product_id: 'PROD-001'
        });
      });
    });
  });

  describe('Analytics Modal', () => {
    it('should open analytics modal', async () => {
      renderWithRouter(<History />);

      const openAnalyticsButton = screen.getByTestId('open-analytics');
      fireEvent.click(openAnalyticsButton);

      await waitFor(() => {
        expect(screen.getByTestId('analytics-modal')).toBeInTheDocument();
      });
    });

    it('should close analytics modal', async () => {
      renderWithRouter(<History />);

      const openAnalyticsButton = screen.getByTestId('open-analytics');
      fireEvent.click(openAnalyticsButton);

      await waitFor(() => {
        expect(screen.getByTestId('analytics-modal')).toBeInTheDocument();
      });

      const closeButton = screen.getByText('Close Modal');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('analytics-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Statistics Display', () => {
    it('should show statistics when available', async () => {
      const mockStatsData = {
        data: {
          totalScans: 150,
          uniqueProducts: 75,
          discrepancies: 3,
          avgZoneTime: 2.1
        }
      };

      historyAPI.getHistory.mockResolvedValue({ data: { items: [], pagination: { total: 0 } } });
      historyAPI.getStats.mockResolvedValue(mockStatsData);

      renderWithRouter(<History />);

      await waitFor(() => {
        expect(screen.getByText('Total Scans: 150')).toBeInTheDocument();
        expect(screen.getByText('Unique Products: 75')).toBeInTheDocument();
        expect(screen.getByText('Discrepancies: 3')).toBeInTheDocument();
      });
    });

    it('should show no stats message when no data', async () => {
      const mockStatsData = {
        data: {
          totalScans: 0,
          uniqueProducts: 0,
          discrepancies: 0,
          avgZoneTime: 0
        }
      };

      historyAPI.getHistory.mockResolvedValue({ data: { items: [], pagination: { total: 0 } } });
      historyAPI.getStats.mockResolvedValue(mockStatsData);

      renderWithRouter(<History />);

      await waitFor(() => {
        expect(screen.getByText('No stats available')).toBeInTheDocument();
      });
    });

    it('should show loading state for stats', async () => {
      historyAPI.getHistory.mockResolvedValue({ data: { items: [], pagination: { total: 0 } } });
      historyAPI.getStats.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithRouter(<History />);

      expect(screen.getByText('Loading stats...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when data loading fails', async () => {
      historyAPI.getHistory.mockRejectedValue(new Error('Network error'));
      historyAPI.getStats.mockRejectedValue(new Error('Stats error'));

      renderWithRouter(<History />);

      await waitFor(() => {
        expect(screen.getByText('Ошибка при загрузке данных')).toBeInTheDocument();
      });
    });

    it('should clear error when data loads successfully', async () => {
      // Сначала вызываем ошибку
      historyAPI.getHistory.mockRejectedValueOnce(new Error('Network error'));
      historyAPI.getStats.mockRejectedValueOnce(new Error('Stats error'));

      const { rerender } = renderWithRouter(<History />);

      await waitFor(() => {
        expect(screen.getByText('Ошибка при загрузке данных')).toBeInTheDocument();
      });

      // Затем успешную загрузку
      historyAPI.getHistory.mockResolvedValue({ data: { items: [], pagination: { total: 0 } } });
      historyAPI.getStats.mockResolvedValue({ data: {} });

      rerender(
        <BrowserRouter>
          <History />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText('Ошибка при загрузке данных')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data arrays', async () => {
      const mockData = {
        data: { items: [], pagination: { total: 0 } }
      };

      historyAPI.getHistory.mockResolvedValue(mockData);
      historyAPI.getStats.mockResolvedValue({ data: {} });

      renderWithRouter(<History />);

      await waitFor(() => {
        expect(screen.getByText('Table with 0 items')).toBeInTheDocument();
        expect(screen.getByText('No stats available')).toBeInTheDocument();
      });
    });

    it('should handle malformed API responses', async () => {
      historyAPI.getHistory.mockResolvedValue({ data: null });
      historyAPI.getStats.mockResolvedValue({ data: null });

      renderWithRouter(<History />);

      await waitFor(() => {
        expect(screen.getByText('Ошибка при загрузке данных')).toBeInTheDocument();
      });
    });

    it('should handle very large datasets', async () => {
      const largeItemsArray = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        scannedAt: '2024-01-01T10:00:00Z',
        robotId: `ROBOT-${i + 1}`,
        zone: 'A',
        productId: `PROD-${i + 1}`,
        productName: `Product ${i + 1}`,
        quantity: 10,
        status: 'OK',
        rowNumber: 1,
        shelfNumber: 1
      }));

      const mockData = {
        data: { items: largeItemsArray, pagination: { total: 1000 } }
      };

      historyAPI.getHistory.mockResolvedValue(mockData);
      historyAPI.getStats.mockResolvedValue({ data: {} });

      renderWithRouter(<History />);

      await waitFor(() => {
        expect(screen.getByText('Table with 1000 items')).toBeInTheDocument();
        expect(screen.getByText('Total: 1000')).toBeInTheDocument();
      });
    });
  });
});
