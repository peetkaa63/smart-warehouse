import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Paper,
  Typography,
  Box,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchDashboardData } from '../store/slices/dashboardSlice';
import WarehouseMap from '../components/WarehouseMap';
import RealTimeStats from '../components/RealTimeStats';
import RecentScans from '../components/RecentScans';
import AIPredictions from '../components/AIPredictions';
import { RootState, AppDispatch } from '../store';

const Dashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { robots, recentScans, statistics, loading, error } = useSelector((state: RootState) => state.dashboard);
  
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'warning' | 'info', message: string} | null>(null);

  useEffect(() => {
    dispatch(fetchDashboardData());
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchDashboardData());
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Текущий мониторинг
        </Typography>
        <Tooltip title="Обновить данные">
          <IconButton 
            onClick={handleRefresh} 
            color="primary" 
            size="large"
            sx={{ 
              backgroundColor: 'white',
              boxShadow: 1,
              '&:hover': { backgroundColor: '#f5f5f5' }
            }}
          >
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {alert && (
        <Alert 
          severity={alert.type}
          sx={{ mb: 2 }}
          onClose={() => setAlert(null)}
        >
          {alert.message}
        </Alert>
      )}

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
              <Box textAlign="center">
                <CircularProgress size={60} />
                <Typography variant="h6" sx={{ mt: 2 }}>
                  Загрузка данных мониторинга...
                </Typography>
              </Box>
            </Box>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
              <Box>
                <WarehouseMap robots={robots || []} />
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <RealTimeStats statistics={statistics || {
                  activeRobots: 0,
                  totalRobots: 0,
                  scannedToday: 0,
                  criticalStock: 0,
                  avgBattery: 0
                }} />
                <RecentScans scans={recentScans || []} />
                <AIPredictions />
              </Box>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default Dashboard;