import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
import { keyframes } from '@emotion/react';

// Анимация появления нового элемента сверху вниз
const slideDownAnimation = keyframes`
  from {
    opacity: 0;
    transform: translateY(-40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

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
  const [newScanKeys, setNewScanKeys] = useState<Set<string>>(new Set());
  const dispatch = useDispatch();
  const previousScansRef = useRef<Scan[]>([]);
  const scansStringRef = useRef<string>('');

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

  // Мемоизация валидных сканирований с проверкой на изменение
  const filteredScans = useMemo(() => {
    if (isPaused) {
      return previousScansRef.current;
    }
    
    const validScans = scans.filter(scan => 
      scan && 
      scan.time && 
      scan.robot_id && 
      scan.product_id &&
      scan.quantity !== undefined &&
      scan.quantity !== null &&
      !isNaN(Number(scan.quantity))
    );
    
    // Сравниваем по строковому представлению, чтобы избежать лишних обновлений
    const scansString = JSON.stringify(validScans.map(s => ({
      time: s.time,
      robot_id: s.robot_id,
      product_id: s.product_id
    })));
    
    // Если данные не изменились, возвращаем предыдущее значение
    if (scansString === scansStringRef.current && previousScansRef.current.length === validScans.length) {
      return previousScansRef.current;
    }
    
    scansStringRef.current = scansString;
    previousScansRef.current = validScans;
    return validScans;
  }, [scans, isPaused]);

  // Определяем новые сканирования отдельно, чтобы избежать цикла
  useEffect(() => {
    if (!isPaused && filteredScans.length > 0) {
      const currentKeys = new Set(
        filteredScans.map(scan => `${scan.robot_id}-${scan.product_id}-${scan.time}`)
      );
      
      // Определяем, есть ли новые сканирования
      const previousKeys = new Set(
        (previousScansRef.current || []).map(scan => `${scan.robot_id}-${scan.product_id}-${scan.time}`)
      );
      
      const newKeys = new Set(
        Array.from(currentKeys).filter(key => !previousKeys.has(key))
      );

      if (newKeys.size > 0) {
        setNewScanKeys(newKeys);

        // Убираем анимацию через 2 секунды
        const timeoutId = setTimeout(() => {
          setNewScanKeys(prev => {
            const updated = new Set(prev);
            newKeys.forEach(key => updated.delete(key));
            return updated;
          });
        }, 2000);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [filteredScans, isPaused]);

  // Мемоизация обработчика для предотвращения пересоздания подписки
  const handleInventoryScanRef = useRef<((scanData: any) => void) | null>(null);
  const filteredScansRef = useRef<Scan[]>([]);

  // Обновляем ref при изменении filteredScans
  useEffect(() => {
    filteredScansRef.current = filteredScans;
  }, [filteredScans]);

  // Подписка на WebSocket обновления для новых сканирований
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket || isPaused) {
      return;
    }

    // Создаем обработчик с актуальными данными через ref
    const handleInventoryScan = (scanData: any) => {
      if (!isPaused && scanData) {
        // Проверяем, что это действительно новое сканирование
        const scanKey = `${scanData.robot_id}-${scanData.product_id || scanData.product?.id}-${scanData.scanned_at || scanData.time}`;
        const existingKeys = new Set(
          filteredScansRef.current.map(s => `${s.robot_id}-${s.product_id}-${s.time}`)
        );
        
        // Добавляем только если его еще нет
        if (!existingKeys.has(scanKey)) {
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
      }
    };

    // Сохраняем ссылку на обработчик для очистки
    handleInventoryScanRef.current = handleInventoryScan;

    // Подписываемся на новые сканирования через inventory_alert
    socket.on('inventory_alert', handleInventoryScan);

    return () => {
      if (socket && handleInventoryScanRef.current) {
        socket.off('inventory_alert', handleInventoryScanRef.current);
        handleInventoryScanRef.current = null;
      }
    };
  }, [isPaused, dispatch]);

  const handleTogglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

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
                <TableRow
                  key={scanKey}
                  hover
                  sx={{
                    backgroundColor: isNew ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                    transition: 'background-color 0.6s ease',
                    ...(isNew && {
                      animation: `${slideDownAnimation} 0.5s cubic-bezier(0.4, 0, 0.2, 1)`,
                    }),
                    '&:hover': {
                      backgroundColor: 'action.hover'
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