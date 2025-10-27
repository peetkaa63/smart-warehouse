import React from 'react';
import {
  Paper,
  Typography,
  Box,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import { Analytics, Info } from '@mui/icons-material';

interface HistoryStatsData {
  totalScans: number;
  uniqueProducts: number;
  discrepancies: number;
  avgZoneTime: number;
  note?: string;
}

interface HistoryStatsProps {
  stats: HistoryStatsData | null;
  loading: boolean;
  hasStats: boolean;
}

export const HistoryStats: React.FC<HistoryStatsProps> = ({
  stats,
  loading,
  hasStats,
}) => {
  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Analytics fontSize="small" />
        Сводная статистика
        {stats?.note && (
          <Tooltip title={stats.note}>
            <Info fontSize="small" color="action" />
          </Tooltip>
        )}
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : hasStats ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
          <Box sx={{ textAlign: 'center', p: 1 }}>
            <Typography variant="h5" fontWeight="bold" color="primary">
              {stats!.totalScans}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Всего проверок
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center', p: 1 }}>
            <Typography variant="h5" fontWeight="bold" color="secondary">
              {stats!.discrepancies}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Расхождений
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center', p: 1 }}>
            <Typography variant="h5" fontWeight="bold" color="primary">
              {stats!.uniqueProducts}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Уникальных товаров
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center', p: 1 }}>
            <Typography variant="h5" fontWeight="bold" color="secondary">
              {stats!.avgZoneTime.toFixed(1)}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Ср. время (мин)
            </Typography>
          </Box>
        </Box>
      ) : (
        <Box 
          sx={{ 
            textAlign: 'center', 
            py: 3,
            color: 'text.secondary'
          }}
        >
          <Info sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
          <Typography variant="body1" gutterBottom>
            Нет данных для отображения
          </Typography>
          <Typography variant="body2">
            Данные появятся после сканирований
          </Typography>
        </Box>
      )}
    </Paper>
  );
};