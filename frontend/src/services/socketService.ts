import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (this.socket) return this.socket;
    
    this.socket = io(process.env.REACT_APP_WS_URL || 'http://localhost:3000');
    
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