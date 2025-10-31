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
    // Экспортируем ссылку глобально, чтобы существующий код (pause/resume, карта) всегда имел доступ
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
}

export const socketService = new SocketService();