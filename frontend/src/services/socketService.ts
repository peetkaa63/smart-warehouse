import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (this.socket) return this.socket;
    
    const wsUrl = process.env.REACT_APP_WS_URL || (typeof window !== 'undefined'
      ? (() => {
          const { protocol, hostname } = window.location;
          const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
          return `${wsProtocol}//${hostname}:3000`;
        })()
      : 'ws://localhost:3000');

    this.socket = io(wsUrl);
    // Экспортируем ссылку глобально для обратной совместимости (но лучше использовать socketService методы)
    (window as any).socket = this.socket;
    
    this.socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected');
    });

    return this.socket;
  }

  subscribeToDashboard() {
    if (this.socket) {
      this.socket.emit('subscribe_dashboard');
    }
  }

  unsubscribeFromDashboard() {
    if (this.socket) {
      this.socket.emit('unsubscribe_dashboard');
    }
  }

  // ДОБАВЬТЕ ЭТОТ МЕТОД
  onDashboardUpdate(callback: (data: any) => void) {
    this.socket?.on('dashboard_update', callback);
  }

  onRobotUpdate(callback: (data: any) => void) {
    this.socket?.on('robot_update', callback);
  }

  onInventoryAlert(callback: (data: any) => void) {
    this.socket?.on('inventory_alert', callback);
  }

  onCriticalAlert(callback: (data: any) => void) {
    this.socket?.on('critical_alert', callback);
  }

  onSystemNotification(callback: (data: any) => void) {
    this.socket?.on('system_notification', callback);
  }

  onRobotAlert(callback: (data: any) => void) {
    this.socket?.on('robot_alert', callback);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Дополнительный метод для проверки подключения
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Получить сокет для прямого доступа (для совместимости с существующим кодом)
  getSocket(): Socket | null {
    return this.socket;
  }

  // Методы для работы с задачами роботов
  requestRobotTasks() {
    this.socket?.emit('request_robot_tasks');
  }

  onRobotTasksUpdate(callback: (tasks: any) => void) {
    this.socket?.on('robot_tasks_update', callback);
  }

  offRobotTasksUpdate(callback?: (tasks: any) => void) {
    if (callback) {
      this.socket?.off('robot_tasks_update', callback);
    } else {
      this.socket?.off('robot_tasks_update');
    }
  }

  // Методы для работы с картой
  onMapUpdate(callback: (data: any) => void) {
    this.socket?.on('map_update', callback);
  }

  offMapUpdate(callback?: (data: any) => void) {
    if (callback) {
      this.socket?.off('map_update', callback);
    } else {
      this.socket?.off('map_update');
    }
  }

  onRobotUpdate(callback: (data: any) => void) {
    this.socket?.on('robot_update', callback);
  }

  offRobotUpdate(callback?: (data: any) => void) {
    if (callback) {
      this.socket?.off('robot_update', callback);
    } else {
      this.socket?.off('robot_update');
    }
  }

  requestDashboardUpdate() {
    this.socket?.emit('request_dashboard_update');
  }

  // Команды для роботов
  sendRobotCommand(command: { type: string; robotId: string; [key: string]: any }) {
    this.socket?.emit('robot_command', command);
  }
}

export const socketService = new SocketService();