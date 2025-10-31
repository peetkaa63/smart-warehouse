import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Paper, Typography, Box, IconButton, Chip, Popover, FormGroup, FormControlLabel, Switch } from '@mui/material';
import MiniSparkline from './MiniSparkline';
import { robotsAPI, pauseRobotUniversal, resumeRobotUniversal } from '../services/api';
import { useDispatch } from 'react-redux';
import { showNotification } from '../store/slices/notificationsSlice';
import { Add, Remove, MyLocation, Battery20, Battery50, Battery80, BatteryFull, Groups, PlayArrow, Pause, ArrowBack } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { historyAPI } from '../services/api';

interface Robot {
  id: string;
  status: 'active' | 'charging' | 'offline' | 'paused';
  battery_level: number;
  current_zone: string;
  current_row: number;
  current_shelf: number;
  last_update: string;
}

interface WarehouseMapProps {
  robots: Robot[];
}

declare global {
  interface Window {
    socket?: any;
  }
}

const WarehouseMap: React.FC<WarehouseMapProps> = ({ robots = [] }) => {
  const [scale, setScale] = useState(1);
  const [selectedRobot, setSelectedRobot] = useState<Robot | null>(null);
  const [popoverRobot, setPopoverRobot] = useState<Robot | null>(null);
  const [cardAnimatingOut, setCardAnimatingOut] = useState(false);
  const [currentRobots, setCurrentRobots] = useState<Robot[]>(robots);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [groupAnchorEl, setGroupAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCellRobots, setSelectedCellRobots] = useState<Robot[]>([]);
  const [selectedCellPosition, setSelectedCellPosition] = useState<{zone: string, row: number, shelf: number} | null>(null);
  const [selectedCellInfo, setSelectedCellInfo] = useState<{productId: string; productName?: string; quantity: number; status: string; scannedAt: string} | null>(null);
  const [selectedCellHistory, setSelectedCellHistory] = useState<Array<{productId: string; productName?: string; quantity: number; status: string; scannedAt: string}>>([]);
  const [loadingCellInfo, setLoadingCellInfo] = useState(false);
  const [cellHistoryValues, setCellHistoryValues] = useState<number[]>([]);
  const dispatch = useDispatch();
  const mapFocus = useSelector((state: RootState) => state.mapFocus.target);
  const recentScans = useSelector((state: RootState) => state.dashboard.recentScans as any[]);
  const lowBatteryThreshold = useSelector((state: RootState) => state.notificationSettings.thresholds.lowBattery);
  const [showOnlyCriticalCells, setShowOnlyCriticalCells] = useState(false);
  const [showOnlyLowBattery, setShowOnlyLowBattery] = useState(false);
  const [showCellStates, setShowCellStates] = useState(false);
  const [cellStatusMapState, setCellStatusMapState] = useState<Map<string, string>>(new Map());

  const criticalCells = React.useMemo(() => {
    const set = new Set<string>();
    (recentScans || []).forEach((s: any) => {
      if (s.status === 'CRITICAL') {
        const key = `${s.zone}-${Number(s.row_number || s.rowNumber || s.row)}-${Number(s.shelf_number || s.shelfNumber || s.shelf)}`;
        set.add(key);
      }
    });
    return set;
  }, [recentScans]);

  // Карта состояний ячеек по последнему скану
  // Текущая карта состояний из снапшота + дополняем последними сканами
  const cellStatusMap = React.useMemo(() => {
    const map = new Map<string, string>(cellStatusMapState);
    (recentScans || []).forEach((s: any) => {
      const key = `${s.zone}-${Number(s.row_number || s.rowNumber || s.row)}-${Number(s.shelf_number || s.shelfNumber || s.shelf)}`;
      map.set(key, s.status);
    });
    return map;
  }, [cellStatusMapState, recentScans]);

  // Загружаем снапшот всех ячеек при включении свитча
  useEffect(() => {
    const loadSnapshot = async () => {
      try {
        // большой лимит, чтобы покрыть недавние состояния по всем ячейкам
        const resp = await historyAPI.getHistory({ limit: 5000 });
        const items = resp.data?.items || [];
        const map = new Map<string, string>();
        for (const it of items) {
          const key = `${it.zone}-${Number(it.rowNumber || it.row)}-${Number(it.shelfNumber || it.shelf)}`;
          if (!map.has(key)) map.set(key, it.status);
        }
        setCellStatusMapState(map);
      } catch (e) {
        // тихо игнорируем, fallback останется recentScans
      }
    };
    if (showCellStates) {
      void loadSnapshot();
    }
  }, [showCellStates]);

  const getCellColorByStatus = (status?: string) => {
    if (!status) return 'white';
    switch (String(status).toUpperCase()) {
      case 'OK':
      case 'NORMAL':
        return '#e8f5e9'; // зелёный фон
      case 'WARNING':
      case 'LOW':
        return '#fff8e1'; // жёлтый фон
      case 'CRITICAL':
      case 'ERROR':
        return '#ffebee'; // красный фон
      default:
        return 'white';
    }
  };

  const containerRef = useRef<HTMLDivElement | null>(null);

  const zones = ['A', 'B', 'C', 'D', 'E'];
  const rows = 20;
  const shelves = 10;

  // Синхронизация robots с currentRobots
  useEffect(() => {
    console.log('🔄 WarehouseMap received robots:', robots);
    if (robots.length > 0) {
      setCurrentRobots(robots);
      setLastUpdateTime(new Date().toLocaleTimeString());
    }
  }, [robots]);
  // Реакция на внешний фокус: прокрутка и подсветка ячейки
  useEffect(() => {
    if (!mapFocus || !containerRef.current) return;
    const { zone, row, shelf } = mapFocus;
    const cellEl = document.getElementById(`cell-${zone}-${row}-${shelf}`);
    if (cellEl) {
      cellEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      setSelectedCellPosition({ zone, row, shelf });
      // краткая подсветка
      cellEl.classList.add('highlight-cell');
      setTimeout(() => cellEl.classList.remove('highlight-cell'), 1500);
    }
  }, [mapFocus]);

  // WebSocket обработчики для реального обновления
  useEffect(() => {
    const handleMapUpdate = (newRobots: Robot[]) => {
      console.log('🗺️ Map update received via WebSocket:', newRobots);
      setCurrentRobots(newRobots);
      setLastUpdateTime(new Date().toLocaleTimeString());
    };

    const handleRobotUpdate = (updatedRobot: Robot) => {
      console.log('🤖 Single robot update via WebSocket:', updatedRobot);
      
      setCurrentRobots(prev => {
        const robotExists = prev.some(robot => robot.id === updatedRobot.id);
        
        if (robotExists) {
          return prev.map(robot => 
            robot.id === updatedRobot.id ? updatedRobot : robot
          );
        } else {
          console.log(`➕ Adding new robot ${updatedRobot.id} to map`);
          return [...prev, updatedRobot];
        }
      });
      
      setLastUpdateTime(new Date().toLocaleTimeString());
      
      if (selectedRobot && selectedRobot.id === updatedRobot.id) {
        setSelectedRobot(updatedRobot);
      }
    };

    if (window.socket) {
      console.log('📡 Subscribing to WebSocket events for map updates');
      window.socket.on('map_update', handleMapUpdate);
      window.socket.on('robot_update', handleRobotUpdate);
      
      window.socket.emit('request_dashboard_update');
    } else {
      console.log('⚠️ WebSocket not available, using polling data only');
    }

    return () => {
      if (window.socket) {
        window.socket.off('map_update', handleMapUpdate);
        window.socket.off('robot_update', handleRobotUpdate);
      }
    };
  }, [selectedRobot]);

  const getBatteryIcon = (level: number) => {
    if (level <= 20) return <Battery20 color="error" />;
    if (level <= 50) return <Battery50 color="warning" />;
    if (level <= 80) return <Battery80 color="info" />;
    return <BatteryFull color="success" />;
  };

  const getRobotColor = (status: string, battery: number) => {
    if (status === 'offline') return '#f44336';
    if (battery < 20) return '#ff9800';
    if (status === 'charging') return '#2196f3';
    return '#4caf50';
  };

  const getRobotStatusText = (status: string, battery: number) => {
    if (status === 'offline') return 'Оффлайн';
    if (battery < 20) return 'Низкий заряд';
    if (status === 'charging') return 'Заряжается';
    return 'Активный';
  };

  const getWearFromId = (id: string) => {
    let acc = 0; for (let i = 0; i < id.length; i++) acc = (acc * 31 + id.charCodeAt(i)) % 1000;
    const tire = (acc % 60) + 20; // 20..79
    const leg = ((acc / 3) % 60) + 20; // 20..79
    return { tireWear: Math.min(99, Math.floor(tire)), legWear: Math.min(99, Math.floor(leg)) };
  }

  const getChargingElapsedMinutes = (robot: Robot) => {
    if (robot.status !== 'charging') return 0;
    const last = new Date(robot.last_update).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((now - last) / 60000));
  }

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));
  const handleCenter = () => setScale(1);

  const handleRobotClick = (robot: Robot) => {
    setSelectedRobot(robot);
  };

  // Функция для получения всех роботов в ячейке
  const getRobotsInCell = (zone: string, row: number, shelf: number) => {
    const robotsIn = currentRobots.filter(robot => 
      robot.current_zone === zone && 
      robot.current_row === row && 
      robot.current_shelf === shelf
    );
    if (showOnlyLowBattery) {
      return robotsIn.filter(r => r.battery_level < lowBatteryThreshold);
    }
    return robotsIn;
  };

  // Обработчик клика по ячейке с группой роботов
  const handleCellWithMultipleRobotsClick = (event: React.MouseEvent<HTMLElement>, zone: string, row: number, shelf: number) => {
    const robotsInCell = getRobotsInCell(zone, row, shelf);
    if (robotsInCell.length > 1) {
      setSelectedCellRobots(robotsInCell);
      setSelectedCellPosition({ zone, row, shelf });
      setGroupAnchorEl(event.currentTarget);
    } else if (robotsInCell.length === 1) {
      handleRobotClick(robotsInCell[0]);
    }
    void loadLastScanForCell(zone, row, shelf);
  };

  const handleCellClick = (event: React.MouseEvent<HTMLElement>, zone: string, row: number, shelf: number) => {
    const robotsInCell = getRobotsInCell(zone, row, shelf);
    setSelectedCellPosition({ zone, row, shelf });
    setSelectedCellRobots(robotsInCell);
    setGroupAnchorEl(event.currentTarget);
    setPopoverRobot(null);
    void loadLastScanForCell(zone, row, shelf);
  };

  const loadLastScanForCell = async (zone: string, row: number, shelf: number) => {
    try {
      setLoadingCellInfo(true);
      const resp = await historyAPI.getHistory({ zone, row, shelf, page: 1, limit: 50 });
      const items = resp.data?.items || [];
      const cellItems = items.filter((it: any) => (it.zone === zone) && (Number(it.rowNumber) === row) && (Number(it.shelfNumber) === shelf));
      const match = cellItems[0];
      if (match) {
        setSelectedCellInfo({
          productId: match.productId,
          productName: match.productName,
          quantity: match.quantity,
          status: match.status,
          scannedAt: match.scannedAt
        });
        setSelectedCellHistory(cellItems.slice(0, 5).map((it: any) => ({
          productId: it.productId,
          productName: it.productName,
          quantity: it.quantity,
          status: it.status,
          scannedAt: it.scannedAt
        })));
        const historyValues = items
          .filter((it: any) => (it.zone === zone) && (Number(it.rowNumber) === row) && (Number(it.shelfNumber) === shelf))
          .slice(0, 12)
          .map((it: any) => Number(it.quantity) || 0)
        setCellHistoryValues(historyValues.reverse());
      } else {
        setSelectedCellInfo(null);
        setSelectedCellHistory([]);
        setCellHistoryValues([]);
      }
    } catch (e) {
      setSelectedCellInfo(null);
      setSelectedCellHistory([]);
      setCellHistoryValues([]);
    } finally {
      setLoadingCellInfo(false);
    }
  }

  const handleGroupClose = () => {
    setGroupAnchorEl(null);
    setSelectedCellRobots([]);
    setSelectedCellPosition(null);
    setPopoverRobot(null);
  };

  // Подсчет роботов по зонам для статистики
  const getZoneStats = (zone: string) => {
    const zoneRobots = currentRobots.filter(robot => robot.current_zone === zone);
    return {
      total: zoneRobots.length,
      // считаем активными всех, кто не paused и не offline
      active: zoneRobots.filter(r => r.status !== 'paused' && r.status !== 'offline').length,
      charging: zoneRobots.filter(r => r.status === 'charging').length,
      offline: zoneRobots.filter(r => r.status === 'offline').length,
    };
  };

  // Получение общего статуса для группы роботов
  const getGroupStatus = (robots: Robot[]) => {
    if (robots.some(r => r.status === 'offline')) return 'offline';
    if (robots.some(r => r.battery_level < 20)) return 'low_battery';
    if (robots.some(r => r.status === 'charging')) return 'charging';
    return 'active';
  };

  const groupOpen = Boolean(groupAnchorEl);

  return (
    <Paper elevation={3} sx={{ p: 2, height: { xs: 520, md: 680 }, position: 'relative' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6">Карта склада</Typography>
          <Typography variant="caption" color="textSecondary">
            Всего роботов: {currentRobots.length} • Обновлено: {lastUpdateTime}
          </Typography>
          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
            Роботы: {currentRobots.map(r => r.id).join(', ')}
          </Typography>
        </Box>
        <Box>
          <IconButton onClick={handleZoomOut} size="small" title="Уменьшить">
            <Remove />
          </IconButton>
          <IconButton onClick={handleCenter} size="small" title="Сбросить масштаб">
            <MyLocation />
          </IconButton>
          <IconButton onClick={handleZoomIn} size="small" title="Увеличить">
            <Add />
          </IconButton>
        </Box>
      </Box>

      {/* Легенда и статистика */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip 
            icon={<BatteryFull color="success" />} 
            label="Активный" 
            variant="outlined" 
            size="small" 
          />
          <Chip 
            icon={<Battery50 color="warning" />} 
            label="Низкий заряд" 
            variant="outlined" 
            size="small" 
          />
          <Chip 
            icon={<Battery20 color="error" />} 
            label="Оффлайн" 
            variant="outlined" 
            size="small" 
          />
          <Chip 
            icon={<Groups color="primary" />} 
            label="Группа" 
            variant="outlined" 
            size="small" 
          />
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormGroup row>
            <FormControlLabel control={<Switch checked={showOnlyCriticalCells} onChange={(e) => setShowOnlyCriticalCells(e.target.checked)} />} label="Только критические ячейки" />
            <FormControlLabel control={<Switch checked={showOnlyLowBattery} onChange={(e) => setShowOnlyLowBattery(e.target.checked)} />} label={`Только роботы < ${lowBatteryThreshold}%`} />
            <FormControlLabel control={<Switch checked={showCellStates} onChange={(e) => setShowCellStates(e.target.checked)} />} label="Показывать состояние ячеек" />
          </FormGroup>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {zones.map(zone => {
            const stats = getZoneStats(zone);
            return (
              <Chip
                key={zone}
                label={`${zone}: ${stats.total}`}
                size="small"
                variant="outlined"
                color={stats.total > 0 ? "primary" : "default"}
              />
            );
          })}
        </Box>
      </Box>

      {/* Карта склада */}
      <Box 
        sx={{ 
          border: '1px solid #ddd',
          backgroundColor: '#f9f9f9',
          height: 'calc(100% - 190px)',
          overflow: 'auto',
          position: 'relative'
        }}
        ref={containerRef}
      >
        <Box sx={{ transform: `scale(${scale})`, transformOrigin: 'top left', p: 2 }}>
          {zones.map(zone => {
            const zoneStats = getZoneStats(zone);
            
            return (
              <Box key={zone} sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                    🏢 Зона {zone}
                  </Typography>
                  {zoneStats.total > 0 && (
                    <Typography variant="caption" color="textSecondary">
                      ({zoneStats.active} актив., {zoneStats.charging} зар., {zoneStats.offline} выкл.)
                    </Typography>
                  )}
                </Box>
                
                <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${shelves}, 36px)`, gap: 0.5 }}>
                  <AnimatePresence initial={false}>
                  {Array.from({ length: rows * shelves }, (_, index) => {
                    const row = Math.floor(index / shelves) + 1;
                    const shelf = (index % shelves) + 1;
                    const cellId = `${zone}-${row}-${shelf}`;
                    const robotsInCell = getRobotsInCell(zone, row, shelf);
                    const robotsCount = robotsInCell.length;
                    const isCritical = criticalCells.has(cellId);
                    const cellStatus = cellStatusMap.get(cellId);
                    const visible = showOnlyCriticalCells ? isCritical : true;

                    return visible ? (
                      <motion.div
                        key={cellId}
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.18 }}
                      >
                      <Box
                        
                        id={`cell-${zone}-${row}-${shelf}`}
                        sx={{
                          width: 36,
                          height: 36,
                          border: '1px solid #ccc',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: showCellStates 
                            ? getCellColorByStatus(cellStatus)
                            : (robotsCount > 0 ? (isCritical ? '#ffebee' : '#e3f2fd') : (isCritical ? '#ffebee' : 'white')),
                          transition: 'background-color .25s ease',
                          borderRadius: 1,
                          cursor: 'pointer',
                          position: 'relative',
                          '&:hover': {
                            backgroundColor: showCellStates
                              ? getCellColorByStatus(cellStatus)
                              : (robotsCount > 0 ? (isCritical ? '#ffcdd2' : '#bbdefb') : (isCritical ? '#ffcdd2' : '#f5f5f5')),
                            transform: robotsCount > 0 ? 'scale(1.04)' : 'none',
                            transition: 'all 0.15s ease'
                          }
                        }}
                        onClick={(event) => handleCellClick(event, zone, row, shelf)}
                      >
                        {robotsCount > 0 ? (
                          <>
                            {/* Один робот */}
                            {robotsCount === 1 && (
                              <Box
                                sx={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: '50%',
                                  backgroundColor: getRobotColor(robotsInCell[0].status, robotsInCell[0].battery_level),
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  fontSize: '9px',
                                  fontWeight: 'bold',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                }}
                                title={`
Робот: ${robotsInCell[0].id}
Статус: ${getRobotStatusText(robotsInCell[0].status, robotsInCell[0].battery_level)}
Заряд: ${robotsInCell[0].battery_level}%
Позиция: ${zone}-${row}-${shelf}
Обновлено: ${new Date(robotsInCell[0].last_update).toLocaleTimeString()}
                                `.trim()}
                              >
                                {robotsInCell[0].id.split('-')[1]}
                              </Box>
                            )}
                            
                            {/* Несколько роботов */}
                            {robotsCount > 1 && (
                              <Box
                                sx={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: '50%',
                                  backgroundColor: '#9c27b0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  fontSize: '10px',
                                  fontWeight: 'bold',
                                  boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                                  flexDirection: 'column'
                                }}
                                title={`${robotsCount} роботов в этой ячейке\nНажмите для просмотра списка`}
                              >
                                <Groups fontSize="small" />
                                <Typography variant="caption" sx={{ fontSize: '8px', lineHeight: 1 }}>
                                  {robotsCount}
                                </Typography>
                              </Box>
                            )}
                          </>
                        ) : (
                          <Typography variant="caption" color="textSecondary">
                            {shelf}
                          </Typography>
                        )}
                        
                        {/* Индикатор низкого заряда для одиночного робота */}
                        {robotsCount === 1 && robotsInCell[0].battery_level < 20 && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 2,
                              right: 2,
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              backgroundColor: '#ff9800',
                              animation: 'pulse 1.5s infinite'
                            }}
                          />
                        )}
                      </Box>
                      </motion.div>
                    ) : (
                      <motion.div key={cellId} />
                    );
                  })}
                  </AnimatePresence>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Поповер с группой роботов */}
      <Popover
        open={Boolean(groupAnchorEl)}
        anchorEl={groupAnchorEl}
        onClose={handleGroupClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <Paper sx={{ p: 2, minWidth: 260, maxWidth: 380 }}>
          <AnimatePresence mode="wait" initial={false}>
          {!popoverRobot ? (
            <motion.div
              key="cell-content"
              initial={{ opacity: 0, scale: .96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: .96 }}
              transition={{ duration: 0.2 }}
              style={{ transformOrigin: 'top center' }}
            >
              <Typography variant="h6" gutterBottom>
                Содержимое ячейки
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Позиция: {selectedCellPosition?.zone}-{selectedCellPosition?.row}-{selectedCellPosition?.shelf}
              </Typography>
              <Box sx={{ mb: 1 }}>
                <Typography variant="subtitle2">Последнее сканирование</Typography>
                {loadingCellInfo ? (
                  <Typography variant="caption" color="textSecondary">Загрузка...</Typography>
                ) : selectedCellInfo ? (
                  <Box>
                    <Typography variant="caption" display="block">Товар: {selectedCellInfo.productName || selectedCellInfo.productId}</Typography>
                    <Typography variant="caption" display="block">Количество: {selectedCellInfo.quantity} шт.</Typography>
                    <Typography variant="caption" display="block">Статус: {selectedCellInfo.status}</Typography>
                    <Typography variant="caption" display="block">Время: {new Date(selectedCellInfo.scannedAt).toLocaleString('ru-RU')}</Typography>
                    {cellHistoryValues.length > 1 && (
                      <Box sx={{ mt: 1 }}>
                        <MiniSparkline values={cellHistoryValues} />
                      </Box>
                    )}
                    {selectedCellHistory.length > 1 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" display="block" sx={{ fontWeight: 'bold', mb: .5 }}>Последние сканы:</Typography>
                        {selectedCellHistory.map((h, idx) => (
                          <Typography key={idx} variant="caption" display="block">
                            {new Date(h.scannedAt).toLocaleString('ru-RU')} • {h.productName || h.productId} • {h.quantity} шт. • {h.status}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Typography variant="caption" color="textSecondary">Нет данных</Typography>
                )}
              </Box>
              {selectedCellRobots && selectedCellRobots.length > 0 && (
                <Box sx={{ maxHeight: 220, overflow: 'auto' }}>
                  <Typography variant="subtitle2">Роботы в ячейке:</Typography>
                  {selectedCellRobots.map((robot) => (
                    <Box
                      key={robot.id}
                      sx={{
                        p: 1, mb: 1, borderRadius: 1,
                        backgroundColor: '#f5f5f5',
                        border: `1px solid ${getRobotColor(robot.status, robot.battery_level)}`,
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: '#e0e0e0' }
                      }}
                      onClick={() => setPopoverRobot(robot)}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" fontWeight="bold">{robot.id}</Typography>
                        {getBatteryIcon(robot.battery_level)}
                      </Box>
                      <Typography variant="caption" display="block">
                        Заряд: {robot.battery_level}% • {getRobotStatusText(robot.status, robot.battery_level)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="robot-profile"
              initial={{ opacity: 0, scale: .92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: .92 }}
              transition={{ duration: 0.22 }}
              style={{ transformOrigin: 'top center' }}
            >
              <Typography variant="h6" gutterBottom>
                🤖 Робот {popoverRobot.id}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                {getBatteryIcon(popoverRobot.battery_level)}
                <Typography variant="body1" fontWeight="bold">
                  {popoverRobot.battery_level}%
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Статус: <strong>{getRobotStatusText(popoverRobot.status, popoverRobot.battery_level)}</strong>
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Позиция: <strong>
                  {popoverRobot.current_zone}-{popoverRobot.current_row}-{popoverRobot.current_shelf}
                </strong>
              </Typography>
              <Box sx={{ mb: 1 }}>
                <Typography variant="subtitle2">Профиль</Typography>
                {(() => { const w = getWearFromId(popoverRobot.id); return (
                  <>
                    <Typography variant="caption" display="block">Износ шин: {w.tireWear}%</Typography>
                    <Typography variant="caption" display="block">Износ лап: {w.legWear}%</Typography>
                  </>
                )})()}
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
                <IconButton 
                  size="small" 
                  onClick={async () => {
                    if (!popoverRobot) return;
                    if (popoverRobot.status === 'paused') {
                      await resumeRobotUniversal(popoverRobot.id);
                      setPopoverRobot({ ...popoverRobot, status: 'active' } as any);
                      dispatch(showNotification({ type: 'success', title: 'Продолжение', message: `Робот ${popoverRobot.id} возобновлен`, duration: 3000 } as any));
                    } else {
                      await pauseRobotUniversal(popoverRobot.id);
                      setPopoverRobot({ ...popoverRobot, status: 'paused' } as any);
                      dispatch(showNotification({ type: 'info', title: 'Пауза', message: `Робот ${popoverRobot.id} поставлен на паузу`, duration: 3000 } as any));
                    }
                  }}
                  sx={{ fontSize: '12px' }}
                  title={popoverRobot.status === 'paused' ? 'Продолжить' : 'Пауза'}
                >{popoverRobot.status === 'paused' ? <PlayArrow fontSize="small" /> : <Pause fontSize="small" />}</IconButton>
                <IconButton 
                  size="small" 
                  onClick={async () => {
                    if (!popoverRobot) return;
                    await robotsAPI.rescan(popoverRobot.id, { zone: popoverRobot.current_zone, row: popoverRobot.current_row, shelf: popoverRobot.current_shelf });
                    dispatch(showNotification({ type: 'info', title: 'Пересканирование', message: `Робот ${popoverRobot.id} пересканирует текущую ячейку`, duration: 3000 } as any));
                  }}
                  sx={{ fontSize: '12px' }}
                  title="Пересканировать ячейку"
                >🔄</IconButton>
                <IconButton 
                  size="small" 
                  onClick={() => {
                    setCardAnimatingOut(true);
                    setTimeout(() => { setPopoverRobot(null); setCardAnimatingOut(false); }, 200);
                  }}
                  sx={{ fontSize: '12px' }}
                >
                  <ArrowBack fontSize="small" />
                </IconButton>
              </Box>
            </motion.div>
          )}
          </AnimatePresence>
        </Paper>
      </Popover>

      {/* Карточка робота показывается теперь внутри поповера */}

      {/* Стили для анимации пульсации */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.4; }
            100% { opacity: 1; }
          }
          .highlight-cell {
            box-shadow: 0 0 0 3px rgba(255, 0, 0, 0.5) inset;
            transition: box-shadow 0.3s ease;
          }
          @keyframes cardIn {
            0% { opacity: 0; transform: translateY(8px) scale(0.92); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes cardOut {
            0% { opacity: 1; transform: translateY(0) scale(1); }
            100% { opacity: 0; transform: translateY(8px) scale(0.94); }
          }
        `}
      </style>
    </Paper>
  );
};

export default WarehouseMap;