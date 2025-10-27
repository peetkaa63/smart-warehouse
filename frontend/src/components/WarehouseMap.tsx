import React, { useState, useEffect } from 'react';
import { Paper, Typography, Box, IconButton, Chip, Popover } from '@mui/material';
import { Add, Remove, MyLocation, Battery20, Battery50, Battery80, BatteryFull, Groups } from '@mui/icons-material';

interface Robot {
  id: string;
  status: 'active' | 'charging' | 'offline';
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
  const [currentRobots, setCurrentRobots] = useState<Robot[]>(robots);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [groupAnchorEl, setGroupAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCellRobots, setSelectedCellRobots] = useState<Robot[]>([]);
  const [selectedCellPosition, setSelectedCellPosition] = useState<{zone: string, row: number, shelf: number} | null>(null);

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

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));
  const handleCenter = () => setScale(1);

  const handleRobotClick = (robot: Robot) => {
    setSelectedRobot(robot);
  };

  // Функция для получения всех роботов в ячейке
  const getRobotsInCell = (zone: string, row: number, shelf: number) => {
    return currentRobots.filter(robot => 
      robot.current_zone === zone && 
      robot.current_row === row && 
      robot.current_shelf === shelf
    );
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
  };

  const handleGroupClose = () => {
    setGroupAnchorEl(null);
    setSelectedCellRobots([]);
    setSelectedCellPosition(null);
  };

  // Подсчет роботов по зонам для статистики
  const getZoneStats = (zone: string) => {
    const zoneRobots = currentRobots.filter(robot => robot.current_zone === zone);
    return {
      total: zoneRobots.length,
      active: zoneRobots.filter(r => r.status === 'active').length,
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
    <Paper elevation={3} sx={{ p: 2, height: '600px', position: 'relative' }}>
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
          height: 'calc(100% - 120px)',
          overflow: 'auto',
          position: 'relative'
        }}
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
                
                <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${shelves}, 50px)`, gap: 1 }}>
                  {Array.from({ length: rows * shelves }, (_, index) => {
                    const row = Math.floor(index / shelves) + 1;
                    const shelf = (index % shelves) + 1;
                    const cellId = `${zone}-${row}-${shelf}`;
                    const robotsInCell = getRobotsInCell(zone, row, shelf);
                    const robotsCount = robotsInCell.length;

                    return (
                      <Box
                        key={cellId}
                        sx={{
                          width: 50,
                          height: 50,
                          border: '1px solid #ccc',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: robotsCount > 0 ? '#e3f2fd' : 'white',
                          borderRadius: 1,
                          cursor: robotsCount > 0 ? 'pointer' : 'default',
                          position: 'relative',
                          '&:hover': {
                            backgroundColor: robotsCount > 0 ? '#bbdefb' : '#f5f5f5',
                            transform: robotsCount > 0 ? 'scale(1.05)' : 'none',
                            transition: 'all 0.2s ease'
                          }
                        }}
                        onClick={(event) => robotsCount > 0 && handleCellWithMultipleRobotsClick(event, zone, row, shelf)}
                      >
                        {robotsCount > 0 ? (
                          <>
                            {/* Один робот */}
                            {robotsCount === 1 && (
                              <Box
                                sx={{
                                  width: 30,
                                  height: 30,
                                  borderRadius: '50%',
                                  backgroundColor: getRobotColor(robotsInCell[0].status, robotsInCell[0].battery_level),
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  fontSize: '10px',
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
                                  width: 35,
                                  height: 35,
                                  borderRadius: '50%',
                                  backgroundColor: '#9c27b0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
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
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: '#ff9800',
                              animation: 'pulse 1.5s infinite'
                            }}
                          />
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Поповер с группой роботов */}
      <Popover
        open={groupOpen}
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
        <Paper sx={{ p: 2, minWidth: 200, maxWidth: 300 }}>
          <Typography variant="h6" gutterBottom>
            🤖 Группа роботов
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Позиция: {selectedCellPosition?.zone}-{selectedCellPosition?.row}-{selectedCellPosition?.shelf}
          </Typography>
          
          <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
            {selectedCellRobots.map((robot, index) => (
              <Box
                key={robot.id}
                sx={{
                  p: 1,
                  mb: 1,
                  borderRadius: 1,
                  backgroundColor: '#f5f5f5',
                  border: `1px solid ${getRobotColor(robot.status, robot.battery_level)}`,
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: '#e0e0e0'
                  }
                }}
                onClick={() => {
                  handleRobotClick(robot);
                  handleGroupClose();
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" fontWeight="bold">
                    {robot.id}
                  </Typography>
                  {getBatteryIcon(robot.battery_level)}
                </Box>
                <Typography variant="caption" display="block">
                  Заряд: {robot.battery_level}% • {getRobotStatusText(robot.status, robot.battery_level)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      </Popover>

      {/* Информация о выбранном роботе */}
      {selectedRobot && (
        <Paper 
          elevation={4} 
          sx={{ 
            position: 'absolute', 
            top: 100, 
            right: 20, 
            p: 2, 
            minWidth: 250,
            backgroundColor: 'white',
            zIndex: 1000,
            border: `2px solid ${getRobotColor(selectedRobot.status, selectedRobot.battery_level)}`
          }}
        >
          <Typography variant="h6" gutterBottom>
            🤖 Робот {selectedRobot.id}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            {getBatteryIcon(selectedRobot.battery_level)}
            <Typography variant="body1" fontWeight="bold">
              {selectedRobot.battery_level}%
            </Typography>
          </Box>
          
          <Typography variant="body2" sx={{ mb: 1 }}>
            Статус: <strong>{getRobotStatusText(selectedRobot.status, selectedRobot.battery_level)}</strong>
          </Typography>
          
          <Typography variant="body2" sx={{ mb: 1 }}>
            Позиция: <strong>
              {selectedRobot.current_zone}-{selectedRobot.current_row}-{selectedRobot.current_shelf}
            </strong>
          </Typography>
          
          <Typography variant="caption" color="textSecondary">
            Последнее обновление: {new Date(selectedRobot.last_update).toLocaleTimeString()}
          </Typography>
          
          <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #eee' }}>
            <IconButton 
              size="small" 
              onClick={() => setSelectedRobot(null)}
              sx={{ fontSize: '12px' }}
            >
              ✕ Закрыть
            </IconButton>
          </Box>
        </Paper>
      )}

      {/* Стили для анимации пульсации */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.4; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </Paper>
  );
};

export default WarehouseMap;