import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { socketService } from '../services/socketService';
import { updateDashboard, addScan } from '../store/slices/dashboardSlice';

export const useWebSocket = () => {
  const dispatch = useDispatch();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    console.log('🔌 Initializing WebSocket connection...');
    
    // Подключаемся к WebSocket
    const socket = socketService.connect();
    socketService.subscribeToDashboard();

    // Слушаем полное обновление dashboard
    socketService.onDashboardUpdate((data) => {
      console.log('📊 Received dashboard update:', {
        robotsCount: data.robots?.length,
        recentScansCount: data.recentScans?.length,
        statistics: data.statistics
      });
      dispatch(updateDashboard(data));
    });

    // Слушаем отдельные обновления роботов
    socketService.onRobotUpdate((data) => {
      console.log('🤖 Received robot update:', data);
    });

    // Слушаем новые сканирования
    socketService.onInventoryAlert((data) => {
      console.log('📦 Received inventory alert:', data);
      dispatch(addScan(data));
    });

    // Обработка подключения/отключения
    socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setConnected(false);
    });

    // Отключаемся при размонтировании
    return () => {
      console.log('🔌 Cleaning up WebSocket connection...');
      socketService.unsubscribeFromDashboard();
      socketService.disconnect();
      setConnected(false);
    };
  }, [dispatch]);

  return connected;
};