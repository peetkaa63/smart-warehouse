import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Alert,
} from '@mui/material';
import { historyAPI } from '../services/api';
import { exportAPI } from '../services/api';
import TrendChart from '../components/TrendChart';
import EnhancedAnalyticsModal from '../components/EnhancedAnalyticsModal';
import { HistoryFilters } from '../components/HistoryFilters';
import { HistoryStats } from '../components/HistoryStats';
import { HistoryTable } from '../components/HistoryTable';
import { HistoryActions } from '../components/HistoryActions';

interface HistoryItem {
  id: number;
  scannedAt: string;
  robotId: string;
  zone: string;
  productId: string;
  productName: string;
  quantity: number;
  status: 'OK' | 'LOW_STOCK' | 'CRITICAL';
  rowNumber: number;
  shelfNumber: number;
}

interface HistoryStatsData {
  totalScans: number;
  uniqueProducts: number;
  discrepancies: number;
  avgZoneTime: number;
  note?: string;
}

const History: React.FC = () => {
  const [data, setData] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState<HistoryStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [chartModalOpen, setChartModalOpen] = useState(false);
  
  // Фильтры
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    zones: [] as string[],
    statuses: [] as string[],
    productId: '',
    robotId: ''
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page: page + 1,
        limit: rowsPerPage
      };

      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.zones.length) params.zone = filters.zones;
      if (filters.statuses.length) params.status = filters.statuses;
      if (filters.productId) params.product_id = filters.productId;
      if (filters.robotId) params.robot_id = filters.robotId;

      const response = await historyAPI.getHistory(params);
      setData(response.data.items);
      setTotalCount(response.data.pagination.total);

    } catch (error) {
      console.error('Error loading history:', error);
      setError('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const statsResponse = await historyAPI.getStats({
        from: filters.from,
        to: filters.to
      });
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadStats();
  }, [page, rowsPerPage]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    setPage(0);
    loadData();
    loadStats();
  };

  const handleResetFilters = () => {
    setFilters({
      from: '',
      to: '',
      zones: [],
      statuses: [],
      productId: '',
      robotId: ''
    });
    setPage(0);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleExportExcel = async () => {
    try {
      const params: any = {};

      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.zones.length) params.zone = filters.zones;
      if (filters.statuses.length) params.status = filters.statuses;
      if (filters.productId) params.product_id = filters.productId;
      if (filters.robotId) params.robot_id = filters.robotId;

      const response = await exportAPI.exportToExcel(params);
      
      // Добавляем BOM для корректной кодировки в Excel/Windows
      const blob = new Blob(['\uFEFF', response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `warehouse_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      console.log('✅ Excel export completed');
    } catch (error) {
      console.error('❌ Excel export error:', error);
      alert('Ошибка при экспорте в Excel');
    }
  };

  const handleExportPDF = async () => {
    try {
      const params: any = {};

      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.zones.length) params.zone = filters.zones;
      if (filters.statuses.length) params.status = filters.statuses;

      const response = await exportAPI.exportToPDF(params);
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `warehouse_report_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      console.log('✅ PDF export completed');
    } catch (error) {
      console.error('❌ PDF export error:', error);
      alert('Ошибка при генерации PDF');
    }
  };

  // Проверяем, есть ли статистика
  const hasStats = stats && (
    stats.totalScans > 0 || 
    stats.uniqueProducts > 0 || 
    stats.discrepancies > 0
  );

  const hasActiveFilters = Boolean(
    filters.from || filters.to || filters.zones.length > 0 || 
    filters.statuses.length > 0 || filters.productId || filters.robotId
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Исторические данные
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 3 }}>
        {/* Левая колонка: Фильтры и статистика */}
        <Box sx={{ width: { xs: '100%', lg: '400px' }, flexShrink: 0 }}>
          <HistoryFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onApplyFilters={handleApplyFilters}
            onResetFilters={handleResetFilters}
          />

          <HistoryStats
            stats={stats}
            loading={statsLoading}
            hasStats={!!hasStats}
          />
        </Box>

        {/* Правая колонка: Таблица и графики */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <HistoryTable
            data={data}
            loading={loading}
            page={page}
            rowsPerPage={rowsPerPage}
            totalCount={totalCount}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            hasActiveFilters={hasActiveFilters}
          />

          <TrendChart />

          <HistoryActions
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
            onOpenAnalytics={() => setChartModalOpen(true)}
          />
        </Box>
      </Box>

      <EnhancedAnalyticsModal
        open={chartModalOpen}
        onClose={() => setChartModalOpen(false)}
      />
    </Box>
  );
};

export default History;