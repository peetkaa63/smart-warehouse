import { Server, Socket } from 'socket.io';
import { RobotService } from '../services/robotService';
import { 
  NotificationManager, 
  DashboardObserver, 
  CriticalAlertsObserver,
  RobotObserver,
  NotificationEventType 
} from './NotificationObserver';
import { AppError } from '../errors/AppError';
import { ErrorCode } from '../types/errors';
import { v4 as uuidv4 } from 'uuid';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  requestId?: string;
}

export class EnhancedWebSocketManager {
  private io: Server;
  private robotService: RobotService;
  private notificationManager: NotificationManager;
  private connectedClients: Map<string, AuthenticatedSocket> = new Map();
  private clientSubscriptions: Map<string, Set<string>> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.robotService = new (RobotService as any)(io);
    this.notificationManager = new (NotificationManager as any)(io);
    
    this.setupConnectionHandlers();
    this.setupErrorHandlers();
    this.setupHeartbeat();
  }

  private setupConnectionHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log('🔌 Client connected:', socket.id);
      
      // Добавляем request ID
      socket.requestId = uuidv4();
      
      // Сохраняем информацию о клиенте
      this.connectedClients.set(socket.id, socket);

      // Обработка аутентификации
      socket.on('authenticate', (data: { token: string; userId: string; userRole: string }) => {
        this.handleAuthentication(socket, data);
      });

      // Обработка подписок
      socket.on('subscribe_dashboard', () => this.handleDashboardSubscription(socket));
      socket.on('subscribe_critical_alerts', () => this.handleCriticalAlertsSubscription(socket));
      socket.on('subscribe_robot_updates', () => this.handleRobotUpdatesSubscription(socket));
      socket.on('unsubscribe_dashboard', () => this.handleDashboardUnsubscription(socket));
      socket.on('unsubscribe_critical_alerts', () => this.handleCriticalAlertsUnsubscription(socket));
      socket.on('unsubscribe_robot_updates', () => this.handleRobotUpdatesUnsubscription(socket));

      // Обработка запросов
      socket.on('request_dashboard_update', () => this.handleDashboardUpdateRequest(socket));
      socket.on('ping', () => this.handlePing(socket));

      // Обработка отключения
      socket.on('disconnect', (reason) => this.handleDisconnect(socket, reason));

      // Обработка ошибок клиента
      socket.on('error', (error) => this.handleClientError(socket, error));
    });
  }

  private setupErrorHandlers(): void {
    // Обработка ошибок сервера
    this.io.engine.on('connection_error', (err) => {
      console.error('🚨 WebSocket connection error:', err);
    });

    // Обработка необработанных ошибок
    process.on('uncaughtException', (error) => {
      console.error('🚨 Uncaught exception in WebSocket:', error);
      this.broadcastSystemError('Внутренняя ошибка сервера');
    });

    process.on('unhandledRejection', (reason) => {
      console.error('🚨 Unhandled rejection in WebSocket:', reason);
      this.broadcastSystemError('Ошибка обработки запроса');
    });
  }

  private setupHeartbeat(): void {
    // Heartbeat каждые 30 секунд
    setInterval(() => {
      this.io.emit('ping');
    }, 30000);

    // Очистка неактивных соединений каждые 5 минут
    setInterval(() => {
      this.cleanupInactiveConnections();
    }, 300000);
  }

  private async handleAuthentication(socket: AuthenticatedSocket, data: { token: string; userId: string; userRole: string }): Promise<void> {
    try {
      // Здесь бы была проверка JWT токена
      // Пока что просто сохраняем данные
      socket.userId = data.userId;
      socket.userRole = data.userRole;

      console.log(`✅ Client ${socket.id} authenticated as ${data.userId} (${data.userRole})`);
      
      socket.emit('authenticated', {
        success: true,
        message: 'Успешная авторизация',
        userId: data.userId,
        userRole: data.userRole
      });

    } catch (error) {
      console.error('❌ Authentication error:', error);
      
      socket.emit('auth_error', {
        success: false,
        message: 'Ошибка авторизации',
        code: 'AUTH_FAILED'
      });

      // Отключаем неавторизованного клиента
      socket.disconnect(true);
    }
  }

  private async handleDashboardSubscription(socket: AuthenticatedSocket): Promise<void> {
    try {
      if (!this.isAuthenticated(socket)) {
        throw new (AppError as any).unauthorized('Необходима авторизация для подписки на dashboard');
      }

      socket.join('dashboard');
      this.addSubscription(socket.id, 'dashboard');
      
      const dashboardObserver = {
        update: (eventType: string, data: any) => {
          if (socket.rooms.has('dashboard')) {
            socket.emit('notification', {
              type: eventType,
              data,
              timestamp: new Date().toISOString()
            });
          }
        },
        getObserverId: () => socket.id
      };
      this.notificationManager.subscribe(dashboardObserver);
      
      console.log(`📊 Client ${socket.id} subscribed to dashboard`);
      
      // Отправляем текущее состояние
      await this.robotService.broadcastDashboardUpdate();
      
      socket.emit('subscription_success', {
        type: 'dashboard',
        message: 'Подписка на dashboard активирована'
      });

    } catch (error) {
      this.handleSubscriptionError(socket, 'dashboard', error);
    }
  }

  private async handleCriticalAlertsSubscription(socket: AuthenticatedSocket): Promise<void> {
    try {
      if (!this.isAuthenticated(socket)) {
        throw new (AppError as any).unauthorized('Необходима авторизация для подписки на критические алерты');
      }

      socket.join('critical_alerts');
      this.addSubscription(socket.id, 'critical_alerts');
      
      const criticalAlertsObserver = {
        update: (eventType: string, data: any) => {
          if (socket.rooms.has('critical_alerts')) {
            socket.emit('critical_alert', {
              type: eventType,
              data,
              timestamp: new Date().toISOString()
            });
          }
        },
        getObserverId: () => socket.id
      };
      this.notificationManager.subscribe(criticalAlertsObserver);
      
      console.log(`🚨 Client ${socket.id} subscribed to critical alerts`);
      
      socket.emit('subscription_success', {
        type: 'critical_alerts',
        message: 'Подписка на критические алерты активирована'
      });

    } catch (error) {
      this.handleSubscriptionError(socket, 'critical_alerts', error);
    }
  }

  private async handleRobotUpdatesSubscription(socket: AuthenticatedSocket): Promise<void> {
    try {
      if (!this.isAuthenticated(socket)) {
        throw new (AppError as any).unauthorized('Необходима авторизация для подписки на обновления роботов');
      }

      socket.join('robots');
      this.addSubscription(socket.id, 'robots');
      
      const robotObserver = {
        update: (eventType: string, data: any) => {
          if (socket.rooms.has('robots')) {
            socket.emit('robot_update', {
              type: eventType,
              data,
              timestamp: new Date().toISOString()
            });
          }
        },
        getObserverId: () => socket.id
      };
      this.notificationManager.subscribe(robotObserver);
      
      console.log(`🤖 Client ${socket.id} subscribed to robot updates`);
      
      socket.emit('subscription_success', {
        type: 'robots',
        message: 'Подписка на обновления роботов активирована'
      });

    } catch (error) {
      this.handleSubscriptionError(socket, 'robots', error);
    }
  }

  private handleDashboardUnsubscription(socket: AuthenticatedSocket): void {
    socket.leave('dashboard');
    this.removeSubscription(socket.id, 'dashboard');
    this.notificationManager.unsubscribe(socket.id);
    
    console.log(`📊 Client ${socket.id} unsubscribed from dashboard`);
    
    socket.emit('unsubscription_success', {
      type: 'dashboard',
      message: 'Подписка на dashboard отменена'
    });
  }

  private handleCriticalAlertsUnsubscription(socket: AuthenticatedSocket): void {
    socket.leave('critical_alerts');
    this.removeSubscription(socket.id, 'critical_alerts');
    
    console.log(`🚨 Client ${socket.id} unsubscribed from critical alerts`);
    
    socket.emit('unsubscription_success', {
      type: 'critical_alerts',
      message: 'Подписка на критические алерты отменена'
    });
  }

  private handleRobotUpdatesUnsubscription(socket: AuthenticatedSocket): void {
    socket.leave('robots');
    this.removeSubscription(socket.id, 'robots');
    
    console.log(`🤖 Client ${socket.id} unsubscribed from robot updates`);
    
    socket.emit('unsubscription_success', {
      type: 'robots',
      message: 'Подписка на обновления роботов отменена'
    });
  }

  private async handleDashboardUpdateRequest(socket: AuthenticatedSocket): Promise<void> {
    try {
      if (!this.isAuthenticated(socket)) {
        throw new (AppError as any).unauthorized('Необходима авторизация для запроса обновления dashboard');
      }

      console.log(`📊 Client ${socket.id} requested dashboard update`);
      await this.robotService.broadcastDashboardUpdate();

    } catch (error) {
      this.handleRequestError(socket, 'dashboard_update', error);
    }
  }

  private handlePing(socket: AuthenticatedSocket): void {
    socket.emit('pong');
  }

  private handleDisconnect(socket: AuthenticatedSocket, reason: string): void {
    console.log(`🔌 Client ${socket.id} disconnected: ${reason}`);
    
    // Удаляем все подписки
    const subscriptions = this.clientSubscriptions.get(socket.id);
    if (subscriptions) {
      subscriptions.forEach(subscription => {
        this.notificationManager.unsubscribe(`${socket.id}_${subscription}`);
      });
    }
    
    // Очищаем данные клиента
    this.connectedClients.delete(socket.id);
    this.clientSubscriptions.delete(socket.id);
  }

  private handleClientError(socket: AuthenticatedSocket, error: any): void {
    console.error(`🚨 Client ${socket.id} error:`, error);
    
    socket.emit('error_acknowledged', {
      message: 'Ошибка получена и обработана',
      timestamp: new Date().toISOString()
    });
  }

  private handleSubscriptionError(socket: AuthenticatedSocket, type: string, error: any): void {
    console.error(`❌ Subscription error for ${socket.id} (${type}):`, error);
    
    const errorMessage = error instanceof AppError 
      ? error.message 
      : 'Ошибка подписки на события';
    
    socket.emit('subscription_error', {
      type,
      message: errorMessage,
      code: error instanceof AppError ? error.code : 'SUBSCRIPTION_FAILED'
    });
  }

  private handleRequestError(socket: AuthenticatedSocket, type: string, error: any): void {
    console.error(`❌ Request error for ${socket.id} (${type}):`, error);
    
    const errorMessage = error instanceof AppError 
      ? error.message 
      : 'Ошибка обработки запроса';
    
    socket.emit('request_error', {
      type,
      message: errorMessage,
      code: error instanceof AppError ? error.code : 'REQUEST_FAILED'
    });
  }

  private isAuthenticated(socket: AuthenticatedSocket): boolean {
    return !!(socket.userId && socket.userRole);
  }

  private addSubscription(clientId: string, subscription: string): void {
    if (!this.clientSubscriptions.has(clientId)) {
      this.clientSubscriptions.set(clientId, new Set());
    }
    this.clientSubscriptions.get(clientId)!.add(subscription);
  }

  private removeSubscription(clientId: string, subscription: string): void {
    const subscriptions = this.clientSubscriptions.get(clientId);
    if (subscriptions) {
      subscriptions.delete(subscription);
      if (subscriptions.size === 0) {
        this.clientSubscriptions.delete(clientId);
      }
    }
  }

  private cleanupInactiveConnections(): void {
    const now = Date.now();
    const inactiveThreshold = 5 * 60 * 1000; // 5 минут

    this.connectedClients.forEach((socket, clientId) => {
      if (socket.disconnected || (now - Number(socket.handshake.time)) > inactiveThreshold) {
        console.log(`🧹 Cleaning up inactive connection: ${clientId}`);
        socket.disconnect(true);
        this.connectedClients.delete(clientId);
        this.clientSubscriptions.delete(clientId);
      }
    });
  }

  private broadcastSystemError(message: string): void {
    this.io.emit('system_error', {
      message,
      timestamp: new Date().toISOString(),
      severity: 'critical'
    });
  }

  // Публичные методы
  public getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  public getClientInfo(clientId: string): { userId?: string; userRole?: string; subscriptions: string[] } | null {
    const socket = this.connectedClients.get(clientId);
    if (!socket) return null;

    return {
      userId: socket.userId,
      userRole: socket.userRole,
      subscriptions: Array.from(this.clientSubscriptions.get(clientId) || [])
    };
  }

  public broadcastToRole(role: string, event: string, data: any): void {
    this.connectedClients.forEach((socket) => {
      if (socket.userRole === role) {
        socket.emit(event, data);
      }
    });
  }

  public broadcastToUser(userId: string, event: string, data: any): void {
    this.connectedClients.forEach((socket) => {
      if (socket.userId === userId) {
        socket.emit(event, data);
      }
    });
  }
}

// Экспорт для использования в app.ts
export const setupEnhancedWebSocket = (io: Server): EnhancedWebSocketManager => {
  return new (EnhancedWebSocketManager as any)(io);
};
