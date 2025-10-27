import { useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { enhancedSocketService, ConnectionState, SocketError } from '../services/EnhancedSocketService';
import { updateDashboard, addScan } from '../store/slices/dashboardSlice';
import { showNotification } from '../store/slices/notificationSlice';

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  onError?: (error: SocketError) => void;
  onReconnecting?: (info: { attempt: number; delay: number }) => void;
  onStateChange?: (state: ConnectionState) => void;
}

export const useEnhancedWebSocket = (options: UseWebSocketOptions = {}) => {
  const dispatch = useDispatch();
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    enhancedSocketService.getConnectionState()
  );
  const [lastError, setLastError] = useState<SocketError | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const {
    autoConnect = true,
    onError,
    onReconnecting,
    onStateChange
  } = options;

  // Обработка подключения
  const handleConnected = useCallback(() => {
    console.log('✅ WebSocket connected');
    reconnectAttemptsRef.current = 0;
    setLastError(null);
  }, []);

  // Обработка отключения
  const handleDisconnected = useCallback((reason: string) => {
    console.log('❌ WebSocket disconnected:', reason);
  }, []);

  // Обработка переподключения
  const handleReconnecting = useCallback((info: { attempt: number; delay: number }) => {
    console.log(`🔄 Reconnecting... Attempt ${info.attempt}, delay: ${info.delay}ms`);
    reconnectAttemptsRef.current = info.attempt;
    
    if (onReconnecting) {
      onReconnecting(info);
    }
  }, [onReconnecting]);

  // Обработка ошибок
  const handleError = useCallback((error: SocketError) => {
    console.error('🚨 WebSocket error:', error);
    setLastError(error);
    
    // Показываем уведомление пользователю
    const errorMessages: Record<string, string> = {
      'connection': 'Ошибка подключения к серверу. Проверьте интернет-соединение.',
      'authentication': 'Ошибка авторизации. Войдите в систему заново.',
      'data': 'Ошибка обработки данных от сервера.',
      'timeout': 'Превышено время ожидания ответа сервера.',
      'unknown': 'Произошла неизвестная ошибка WebSocket.'
    };

    const message = errorMessages[error.type] || error.message;
    
    dispatch(showNotification({
      type: 'error',
      title: 'Ошибка WebSocket',
      message,
      duration: 5000
    }));

    if (onError) {
      onError(error);
    }
  }, [dispatch, onError]);

  // Обработка изменения состояния
  const handleStateChange = useCallback((state: ConnectionState) => {
    setConnectionState(state);
    
    if (onStateChange) {
      onStateChange(state);
    }
  }, [onStateChange]);

  // Обработка обновлений dashboard
  const handleDashboardUpdate = useCallback((data: any) => {
    console.log('📊 Received dashboard update:', {
      robotsCount: data.robots?.length,
      recentScansCount: data.recentScans?.length,
      statistics: data.statistics
    });
    dispatch(updateDashboard(data));
  }, [dispatch]);

  // Обработка обновлений роботов
  const handleRobotUpdate = useCallback((data: any) => {
    console.log('🤖 Received robot update:', data);
    // Здесь можно добавить обработку обновлений роботов
  }, []);

  // Обработка алертов инвентаризации
  const handleInventoryAlert = useCallback((data: any) => {
    console.log('📦 Received inventory alert:', data);
    dispatch(addScan(data));
    
    // Показываем уведомление о критическом уровне запасов
    if (data.status === 'CRITICAL') {
      dispatch(showNotification({
        type: 'warning',
        title: 'Критический уровень запасов',
        message: `Товар ${data.product_name} имеет критически низкий уровень запасов (${data.quantity} шт.)`,
        duration: 10000
      }));
    }
  }, [dispatch]);

  // Обработка уведомлений
  const handleNotification = useCallback((data: any) => {
    console.log('🔔 Received notification:', data);
    
    dispatch(showNotification({
      type: data.type || 'info',
      title: data.title || 'Уведомление',
      message: data.message,
      duration: data.duration || 5000
    }));
  }, [dispatch]);

  // Обработка критических алертов
  const handleCriticalAlert = useCallback((data: any) => {
    console.log('🚨 Received critical alert:', data);
    
    dispatch(showNotification({
      type: 'error',
      title: 'Критический алерт',
      message: data.message,
      duration: 0 // Не исчезает автоматически
    }));
  }, [dispatch]);

  // Подключение к WebSocket
  const connect = useCallback(async () => {
    try {
      await enhancedSocketService.connect();
    } catch (error) {
      console.error('❌ Failed to connect to WebSocket:', error);
      handleError({
        type: 'connection',
        message: 'Не удалось подключиться к серверу',
        timestamp: new Date()
      });
    }
  }, [handleError]);

  // Отключение от WebSocket
  const disconnect = useCallback(() => {
    enhancedSocketService.disconnect();
  }, []);

  // Принудительное переподключение
  const forceReconnect = useCallback(() => {
    enhancedSocketService.forceReconnect();
  }, []);

  // Подписка на события dashboard
  const subscribeToDashboard = useCallback(() => {
    enhancedSocketService.subscribeToDashboard();
  }, []);

  // Отписка от событий dashboard
  const unsubscribeFromDashboard = useCallback(() => {
    enhancedSocketService.unsubscribeFromDashboard();
  }, []);

  // Подписка на критические алерты
  const subscribeToCriticalAlerts = useCallback(() => {
    enhancedSocketService.subscribeToCriticalAlerts();
  }, []);

  // Подписка на обновления роботов
  const subscribeToRobotUpdates = useCallback(() => {
    enhancedSocketService.subscribeToRobotUpdates();
  }, []);

  // Запрос обновления dashboard
  const requestDashboardUpdate = useCallback(() => {
    enhancedSocketService.requestDashboardUpdate();
  }, []);

  // Инициализация при монтировании
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Подписываемся на события
    enhancedSocketService.onConnected(handleConnected);
    enhancedSocketService.onDisconnected(handleDisconnected);
    enhancedSocketService.onReconnecting(handleReconnecting);
    enhancedSocketService.onError(handleError);
    enhancedSocketService.onStateChange(handleStateChange);
    enhancedSocketService.onDashboardUpdate(handleDashboardUpdate);
    enhancedSocketService.onRobotUpdate(handleRobotUpdate);
    enhancedSocketService.onInventoryAlert(handleInventoryAlert);
    enhancedSocketService.onNotification(handleNotification);
    enhancedSocketService.onCriticalAlert(handleCriticalAlert);

    // Очистка при размонтировании
    return () => {
      enhancedSocketService.off('connected', handleConnected);
      enhancedSocketService.off('disconnected', handleDisconnected);
      enhancedSocketService.off('reconnecting', handleReconnecting);
      enhancedSocketService.off('error', handleError);
      enhancedSocketService.off('state_change', handleStateChange);
      enhancedSocketService.off('dashboard_update', handleDashboardUpdate);
      enhancedSocketService.off('robot_update', handleRobotUpdate);
      enhancedSocketService.off('inventory_alert', handleInventoryAlert);
      enhancedSocketService.off('notification', handleNotification);
      enhancedSocketService.off('critical_alert', handleCriticalAlert);
    };
  }, [
    autoConnect,
    connect,
    handleConnected,
    handleDisconnected,
    handleReconnecting,
    handleError,
    handleStateChange,
    handleDashboardUpdate,
    handleRobotUpdate,
    handleInventoryAlert,
    handleNotification,
    handleCriticalAlert
  ]);

  return {
    // Состояние
    connectionState,
    lastError,
    isConnected: connectionState.connected,
    isReconnecting: connectionState.reconnecting,
    
    // Методы
    connect,
    disconnect,
    forceReconnect,
    subscribeToDashboard,
    unsubscribeFromDashboard,
    subscribeToCriticalAlerts,
    subscribeToRobotUpdates,
    requestDashboardUpdate,
    
    // Информация о переподключении
    reconnectAttempts: connectionState.reconnectAttempts,
    maxReconnectAttempts
  };
};

