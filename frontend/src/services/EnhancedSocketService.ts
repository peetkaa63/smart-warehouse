import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';

export interface SocketConfig {
  url: string;
  options?: {
    autoConnect?: boolean;
    reconnection?: boolean;
    reconnectionAttempts?: number;
    reconnectionDelay?: number;
    reconnectionDelayMax?: number;
    timeout?: number;
    forceNew?: boolean;
  };
}

export interface ConnectionState {
  connected: boolean;
  reconnecting: boolean;
  error: string | null;
  reconnectAttempts: number;
  lastConnectedAt: Date | null;
  lastDisconnectedAt: Date | null;
}

export interface SocketError {
  type: 'connection' | 'authentication' | 'data' | 'timeout' | 'unknown';
  message: string;
  code?: string | number;
  details?: any;
  timestamp: Date;
}

class EnhancedSocketService extends EventEmitter {
  private socket: Socket | null = null;
  private config: SocketConfig;
  private connectionState: ConnectionState;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isManualDisconnect = false;

  constructor(config: SocketConfig) {
    super();
    this.config = {
      url: config.url,
      options: {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        forceNew: true,
        ...config.options
      }
    };

    this.connectionState = {
      connected: false,
      reconnecting: false,
      error: null,
      reconnectAttempts: 0,
      lastConnectedAt: null,
      lastDisconnectedAt: null
    };
  }

  // Подключение к WebSocket
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.isManualDisconnect = false;
      this.socket = io(this.config.url, this.config.options);

      this.setupEventListeners();

      // Таймаут для подключения
      const connectTimeout = setTimeout(() => {
        if (!this.connectionState.connected) {
          this.handleError({
            type: 'timeout',
            message: 'Превышено время ожидания подключения',
            timestamp: new Date()
          });
          reject(new Error('Connection timeout'));
        }
      }, this.config.options?.timeout || 20000);

      this.socket.on('connect', () => {
        clearTimeout(connectTimeout);
        this.handleConnect();
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        clearTimeout(connectTimeout);
        this.handleError({
          type: 'connection',
          message: 'Ошибка подключения к серверу',
          code: error.message,
          details: error,
          timestamp: new Date()
        });
        reject(error);
      });
    });
  }

  // Отключение от WebSocket
  disconnect(): void {
    this.isManualDisconnect = true;
    this.clearTimers();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.updateConnectionState({
      connected: false,
      reconnecting: false,
      error: null,
      lastDisconnectedAt: new Date()
    });
  }

  // Настройка обработчиков событий
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Подключение
    this.socket.on('connect', () => {
      this.handleConnect();
    });

    // Отключение
    this.socket.on('disconnect', (reason) => {
      this.handleDisconnect(reason);
    });

    // Ошибки подключения
    this.socket.on('connect_error', (error) => {
      this.handleError({
        type: 'connection',
        message: 'Ошибка подключения к серверу',
        code: error.message,
        details: error,
        timestamp: new Date()
      });
    });

    // Ошибки аутентификации
    this.socket.on('auth_error', (error) => {
      this.handleError({
        type: 'authentication',
        message: 'Ошибка авторизации WebSocket',
        code: error.code,
        details: error,
        timestamp: new Date()
      });
    });

    // Ошибки данных
    this.socket.on('data_error', (error) => {
      this.handleError({
        type: 'data',
        message: 'Ошибка обработки данных',
        code: error.code,
        details: error,
        timestamp: new Date()
      });
    });

    // События приложения
    this.socket.on('dashboard_update', (data) => {
      this.emit('dashboard_update', data);
    });

    this.socket.on('robot_update', (data) => {
      this.emit('robot_update', data);
    });

    this.socket.on('inventory_alert', (data) => {
      this.emit('inventory_alert', data);
    });

    this.socket.on('notification', (data) => {
      this.emit('notification', data);
    });

    this.socket.on('critical_alert', (data) => {
      this.emit('critical_alert', data);
    });

    // Heartbeat для проверки соединения
    this.socket.on('pong', () => {
      this.emit('heartbeat');
    });
  }

  // Обработка успешного подключения
  private handleConnect(): void {
    this.updateConnectionState({
      connected: true,
      reconnecting: false,
      error: null,
      reconnectAttempts: 0,
      lastConnectedAt: new Date()
    });

    this.startHeartbeat();
    this.emit('connected');
    
    console.log('✅ WebSocket connected successfully');
  }

  // Обработка отключения
  private handleDisconnect(reason: string): void {
    this.updateConnectionState({
      connected: false,
      lastDisconnectedAt: new Date()
    });

    this.clearTimers();
    this.emit('disconnected', reason);

    console.log('❌ WebSocket disconnected:', reason);

    // Автоматическое переподключение, если не ручное отключение
    if (!this.isManualDisconnect && this.config.options?.reconnection) {
      this.scheduleReconnect();
    }
  }

  // Обработка ошибок
  private handleError(error: SocketError): void {
    this.updateConnectionState({
      error: error.message,
      reconnecting: false
    });

    this.emit('error', error);
    console.error('🚨 WebSocket error:', error);
  }

  // Планирование переподключения
  private scheduleReconnect(): void {
    if (this.connectionState.reconnectAttempts >= (this.config.options?.reconnectionAttempts || 5)) {
      this.handleError({
        type: 'connection',
        message: 'Превышено максимальное количество попыток переподключения',
        timestamp: new Date()
      });
      return;
    }

    const delay = Math.min(
      (this.config.options?.reconnectionDelay || 1000) * Math.pow(2, this.connectionState.reconnectAttempts),
      this.config.options?.reconnectionDelayMax || 5000
    );

    this.updateConnectionState({
      reconnecting: true,
      reconnectAttempts: this.connectionState.reconnectAttempts + 1
    });

    this.emit('reconnecting', {
      attempt: this.connectionState.reconnectAttempts,
      delay
    });

    this.reconnectTimer = setTimeout(() => {
      this.attemptReconnect();
    }, delay);
  }

  // Попытка переподключения
  private attemptReconnect(): void {
    console.log(`🔄 Attempting to reconnect (${this.connectionState.reconnectAttempts}/${this.config.options?.reconnectionAttempts})`);
    
    this.connect().catch((error) => {
      console.error('❌ Reconnection failed:', error);
      this.scheduleReconnect();
    });
  }

  // Запуск heartbeat
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, 30000); // Ping каждые 30 секунд
  }

  // Очистка таймеров
  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // Обновление состояния подключения
  private updateConnectionState(updates: Partial<ConnectionState>): void {
    this.connectionState = { ...this.connectionState, ...updates };
    this.emit('state_change', this.connectionState);
  }

  // Публичные методы для подписки на события
  onDashboardUpdate(callback: (data: any) => void): void {
    this.on('dashboard_update', callback);
  }

  onRobotUpdate(callback: (data: any) => void): void {
    this.on('robot_update', callback);
  }

  onInventoryAlert(callback: (data: any) => void): void {
    this.on('inventory_alert', callback);
  }

  onNotification(callback: (data: any) => void): void {
    this.on('notification', callback);
  }

  onCriticalAlert(callback: (data: any) => void): void {
    this.on('critical_alert', callback);
  }

  onConnected(callback: () => void): void {
    this.on('connected', callback);
  }

  onDisconnected(callback: (reason: string) => void): void {
    this.on('disconnected', callback);
  }

  onReconnecting(callback: (info: { attempt: number; delay: number }) => void): void {
    this.on('reconnecting', callback);
  }

  onError(callback: (error: SocketError) => void): void {
    this.on('error', callback);
  }

  onStateChange(callback: (state: ConnectionState) => void): void {
    this.on('state_change', callback);
  }

  // Методы для отправки событий
  subscribeToDashboard(): void {
    this.socket?.emit('subscribe_dashboard');
  }

  unsubscribeFromDashboard(): void {
    this.socket?.emit('unsubscribe_dashboard');
  }

  subscribeToCriticalAlerts(): void {
    this.socket?.emit('subscribe_critical_alerts');
  }

  subscribeToRobotUpdates(): void {
    this.socket?.emit('subscribe_robot_updates');
  }

  requestDashboardUpdate(): void {
    this.socket?.emit('request_dashboard_update');
  }

  // Получение текущего состояния
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  isConnected(): boolean {
    return this.connectionState.connected && this.socket?.connected === true;
  }

  // Принудительное переподключение
  forceReconnect(): void {
    this.disconnect();
    setTimeout(() => {
      this.connect();
    }, 1000);
  }

  // Очистка при размонтировании
  destroy(): void {
    this.removeAllListeners();
    this.disconnect();
  }
}

// Создание singleton instance
export const enhancedSocketService = new EnhancedSocketService({
  url: process.env.REACT_APP_WS_URL || 'http://localhost:3000',
  options: {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 20000
  }
});

export default EnhancedSocketService;

