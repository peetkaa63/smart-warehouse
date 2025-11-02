import React, { useState, useEffect, useRef } from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Box
} from '@mui/material';
import { Pause, PlayArrow } from '@mui/icons-material';
import { useDispatch } from 'react-redux';
import { addScan } from '../store/slices/dashboardSlice';
import { socketService } from '../services/socketService';

interface Scan {
  time: string;
  robot_id: string;
  zone: string;
  product_name: string;
  product_id: string;
  quantity: number;
  status: 'OK' | 'LOW_STOCK' | 'CRITICAL';
}

interface RecentScansProps {
  scans: Scan[];
}

const RecentScans: React.FC<RecentScansProps> = ({ scans = [] }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [filteredScans, setFilteredScans] = useState<Scan[]>([]);
  const [newScanKeys, setNewScanKeys] = useState<Set<string>>(new Set());
  const dispatch = useDispatch();
  const previousScansRef = useRef<Scan[]>([]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OK': return 'success';
      case 'LOW_STOCK': return 'warning';
      case 'CRITICAL': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'OK': return 'OK';
      case 'LOW_STOCK': return 'Низкий';
      case 'CRITICAL': return 'Критично';
      default: return status;
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '-';
    try {
      const date = new Date(timeString);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', timeString);
        return '-';
      }
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (error) {
      console.error('Error formatting time:', timeString, error);
      return '-';
    }
  };

  // Подписка на WebSocket обновления для новых сканирований
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket || isPaused) return;

    const handleInventoryScan = (scanData: any) => {
      if (!isPaused && scanData) {
        // Добавляем новое сканирование в Redux
        dispatch(addScan({
          time: scanData.scanned_at || scanData.time || new Date().toISOString(),
          robot_id: scanData.robot_id,
          zone: scanData.zone,
          product_name: scanData.product_name || scanData.product?.name || '',
          product_id: scanData.product_id || scanData.product?.id || '',
          quantity: scanData.quantity || 0,
          status: scanData.status || 'OK'
        }));
      }
    };

    // Подписываемся на новые сканирования через inventory_alert
    socket.on('inventory_alert', handleInventoryScan);

    return () => {
      if (socket) {
        socket.off('inventory_alert', handleInventoryScan);
      }
    };
  }, [isPaused, dispatch]);

  // Фильтруем валидные данные и определяем новые сканирования
  useEffect(() => {
    if (!isPaused) {
      const validScans = scans.filter(scan => 
        scan && 
        scan.time && 
        scan.robot_id && 
        scan.product_id &&
        scan.quantity !== undefined &&
        scan.quantity !== null &&
        !isNaN(Number(scan.quantity))
      );
      
      // Определяем новые сканирования (которые появились сверху)
      const previousScans = previousScansRef.current;
      const newScans = validScans.filter(scan => {
        const scanKey = `${scan.robot_id}-${scan.product_id}-${scan.time}`;
        return !previousScans.some(prev => 
          prev.robot_id === scan.robot_id &&
          prev.product_id === scan.product_id &&
          prev.time === scan.time
        );
      });

      // Помечаем новые сканирования для анимации
      if (newScans.length > 0) {
        const newKeys = new Set(
          newScans.map(scan => `${scan.robot_id}-${scan.product_id}-${scan.time}`)
        );
        setNewScanKeys(newKeys);

        // Убираем анимацию через 2 секунды
        setTimeout(() => {
          setNewScanKeys(prev => {
            const updated = new Set(prev);
            newKeys.forEach(key => updated.delete(key));
            return updated;
          });
        }, 2000);
      }

      setFilteredScans(validScans);
      previousScansRef.current = validScans;
    }
  }, [scans, isPaused]);

  const handleTogglePause = () => {
    setIsPaused(!isPaused);
    if (isPaused) {
      // При возобновлении обновляем данные
      const validScans = scans.filter(scan => 
        scan && 
        scan.time && 
        scan.robot_id && 
        scan.product_id &&
        scan.quantity !== undefined &&
        scan.quantity !== null &&
        !isNaN(Number(scan.quantity))
      );
      setFilteredScans(validScans);
    }
  };

  console.log('📦 RecentScans received:', scans.length, 'scans, paused:', isPaused);

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Последние сканирования</Typography>
        <IconButton 
          onClick={handleTogglePause}
          color={isPaused ? "default" : "primary"}
          title={isPaused ? "Возобновить обновление" : "Приостановить обновление"}
        >
          {isPaused ? <PlayArrow /> : <Pause />}
        </IconButton>
      </Box>
      
      <TableContainer sx={{ maxHeight: 300 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>Время</TableCell>
              <TableCell>Робот</TableCell>
              <TableCell>Зона</TableCell>
              <TableCell>Товар</TableCell>
              <TableCell align="right">Кол-во</TableCell>
              <TableCell>Статус</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredScans.map((scan, index) => {
              const scanKey = `${scan.robot_id}-${scan.product_id}-${scan.time}`;
              const isNew = newScanKeys.has(scanKey);
              
              return (
                <Slide
                  key={scanKey}
                  direction="down"
                  in={true}
                  timeout={300}
                  mountOnEnter
                  unmountOnExit
                >
                  <TableRow 
                    hover
                    sx={{
                      backgroundColor: isNew ? 'action.hover' : 'transparent',
                      transition: 'background-color 0.3s ease',
                      animation: isNew ? 'slideDown 0.3s ease' : 'none',
                      '@keyframes slideDown': {
                        from: {
                          transform: 'translateY(-20px)',
                          opacity: 0
                        },
                        to: {
                          transform: 'translateY(0)',
                          opacity: 1
                        }
                      }
                    }}
                  >
                    <TableCell>
                      {scan.time ? formatTime(scan.time) : '-'}
                    </TableCell>
                    <TableCell>{scan.robot_id || '-'}</TableCell>
                    <TableCell>{scan.zone || '-'}</TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {scan.product_name || scan.product_id || 'N/A'}
                        </Typography>
                        {scan.product_id && (
                          <Typography variant="caption" color="textSecondary">
                            {scan.product_id}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right">{scan.quantity !== undefined && scan.quantity !== null ? scan.quantity : 0}</TableCell>
                    <TableCell>
                      <Chip 
                        label={getStatusText(scan.status)} 
                        color={getStatusColor(scan.status) as any}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
              );
            })}
            {filteredScans.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="textSecondary" sx={{ py: 2 }}>
                    {isPaused ? 'Обновление приостановлено' : 'Нет данных о сканированиях'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default RecentScans;