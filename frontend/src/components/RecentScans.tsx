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
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

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
  const prefersReducedMotion = useReducedMotion();

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

  // Ограничиваем количество отображаемых сканирований
  const MAX_VISIBLE_SCANS = 20;

  // Мемоизация валидных сканирований с правильной обработкой новых элементов
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
    
    // Берем только первые MAX_VISIBLE_SCANS для отображения
    const visibleScans = validScans.slice(0, MAX_VISIBLE_SCANS);
    
    // Определяем новые сканирования
    const previousKeys = new Set(
      previousScansRef.current.map(scan => `${scan.robot_id}-${scan.product_id}-${scan.time}`)
    );
    
    const newKeys = new Set(
      visibleScans
        .filter(scan => {
          const key = `${scan.robot_id}-${scan.product_id}-${scan.time}`;
          return !previousKeys.has(key);
        })
        .map(scan => `${scan.robot_id}-${scan.product_id}-${scan.time}`)
    );

    if (newKeys.size > 0) {
      setNewScanKeys(newKeys);
      // Убираем метку новых через 2 секунды
      setTimeout(() => {
        setNewScanKeys(prev => {
          const updated = new Set(prev);
          newKeys.forEach(key => updated.delete(key));
          return updated;
        });
      }, 2000);
    }
    
    previousScansRef.current = visibleScans;
    return visibleScans;
  }, [scans, isPaused]);

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
          sx={{
            position: 'relative',
            width: 48,
            height: 48
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={isPaused ? 'play' : 'pause'}
              initial={{ scale: 0, rotate: -180, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0, rotate: 180, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              style={{ 
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isPaused ? <PlayArrow /> : <Pause />}
            </motion.div>
          </AnimatePresence>
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
            <AnimatePresence initial={false}>
              {filteredScans.map((scan, index) => {
                const scanKey = `${scan.robot_id}-${scan.product_id}-${scan.time}`;
                const isNew = newScanKeys.has(scanKey);
                
                return (
                  <TableRow
                    key={scanKey}
                    component={motion.tr}
                    layout={isNew && !prefersReducedMotion ? "position" : false}
                    initial={isNew && !prefersReducedMotion ? { 
                      opacity: 0, 
                      y: -40,
                      height: 0
                    } : false}
                    animate={{ 
                      opacity: 1, 
                      y: 0,
                      height: 'auto'
                    }}
                    exit={prefersReducedMotion ? {} : { 
                      opacity: 0, 
                      y: 15,
                      height: 0,
                      transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
                    }}
                    transition={prefersReducedMotion ? { duration: 0 } : {
                      layout: { 
                        duration: 0.25, 
                        ease: [0.4, 0, 0.2, 1],
                        type: "tween"
                      },
                      opacity: { 
                        duration: 0.2,
                        ease: "easeOut"
                      },
                      y: { 
                        duration: 0.25, 
                        ease: [0.4, 0, 0.2, 1],
                        type: "tween"
                      },
                      height: { 
                        duration: 0.25,
                        ease: "easeOut"
                      }
                    }}
                    hover
                    sx={{
                      backgroundColor: isNew ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                      transition: 'background-color 0.6s ease',
                      display: 'table-row',
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
            </AnimatePresence>
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