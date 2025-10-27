// services/notificationSocketService.ts
import { store } from '../store';
import { addNotification, NotificationPriority } from '../store/slices/notificationsSlice';
import { socketService } from './socketService';

type EventCallback = (data: any) => void;

class NotificationSocketService {
  private isConnected = false;
  private isTabVisible = true;
  private eventListeners: Map<string, EventCallback[]> = new Map();

  constructor() {
    this.setupPageVisibilityListener();
  }

  // Отслеживаем видимость вкладки
  private setupPageVisibilityListener() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.isTabVisible = !document.hidden;
        console.log(`👀 Tab visibility changed: ${this.isTabVisible ? 'visible' : 'hidden'}`);
      });
    }
  }

  // Методы для подписки на события
  on(event: string, callback: EventCallback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  connect() {
    if (this.isConnected) return;

    console.log('🔔 Connecting notification service via Socket.io...');
    
    const socket = socketService.connect();
    
    socket.on('system_notification', (data: any) => {
      console.log('📨 Received system notification:', data);
      this.handleSystemNotification(data);
    });

    socket.on('inventory_alert', (data: any) => {
      console.log('📦 Received inventory alert:', data);
      this.handleInventoryAlert(data);
    });

    socket.on('robot_alert', (data: any) => {
      console.log('🤖 Received robot alert:', data);
      this.handleRobotAlert(data);
    });

    socket.on('system_alert', (data: any) => {
      console.log('🔧 Received system alert:', data);
      this.handleSystemAlert(data);
    });

    this.isConnected = true;
  }

  private handleSystemNotification(data: any) {
    console.log('🔔 Processing system notification:', data);
    
    const priority: NotificationPriority = this.mapPriority(data.priority);
    
    const notification = {
      id: `${data.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: data.type,
      title: data.title,
      message: data.message,
      priority: priority,
      product_id: data.product_id,
      robot_id: data.robot_id,
      zone: data.zone,
      timestamp: new Date().toISOString(),
      read: false,
      action_required: data.action_required || false
    };

    console.log('📝 Dispatching notification to Redux:', notification);
    store.dispatch(addNotification(notification));
    
    // Эмитим событие для UI alert
    this.emit('notification_alert', notification);
    
    // Показываем браузерное уведомление ТОЛЬКО если вкладка не видна
    if (Notification.permission === 'granted' && !this.isTabVisible) {
      console.log('📱 Showing browser notification (tab is hidden)');
      this.showBrowserNotification(notification);
    } else if (this.isTabVisible) {
      console.log('🚫 Skipping browser notification (tab is visible)');
    }
  }

  private handleInventoryAlert(data: any) {
    const priority: NotificationPriority = data.critical ? 'HIGH' : 'MEDIUM';
    
    const notification = {
      id: `inventory-${Date.now()}`,
      type: 'INVENTORY_ALERT',
      title: `🚨 ${data.critical ? 'КРИТИЧЕСКИЙ ОСТАТОК' : 'НИЗКИЙ ЗАПАС'}: ${data.productName}`,
      message: `Зона ${data.zone}. Текущий запас: ${data.currentStock} шт.`,
      priority: priority,
      product_id: data.productId,
      zone: data.zone,
      timestamp: new Date().toISOString(),
      read: false,
      action_required: data.critical
    };

    store.dispatch(addNotification(notification));
    this.emit('notification_alert', notification);
    
    // Показываем браузерное уведомление ТОЛЬКО если вкладка не видна
    if (Notification.permission === 'granted' && !this.isTabVisible) {
      this.showBrowserNotification(notification);
    }
  }

  private handleRobotAlert(data: any) {
    const notification = {
      id: `robot-${Date.now()}`,
      type: data.type || 'ROBOT_ISSUE',
      title: `Робот ${data.robot_id}`,
      message: data.message,
      priority: data.priority || 'MEDIUM',
      robot_id: data.robot_id,
      timestamp: new Date().toISOString(),
      read: false,
      action_required: data.action_required || false
    };

    store.dispatch(addNotification(notification));
    this.emit('notification_alert', notification);
  }

  private handleSystemAlert(data: any) {
    const notification = {
      id: `system-${Date.now()}`,
      type: 'SYSTEM_ALERT',
      title: 'Системное уведомление',
      message: data.message,
      priority: data.priority || 'LOW',
      timestamp: new Date().toISOString(),
      read: false,
      action_required: data.action_required || false
    };

    store.dispatch(addNotification(notification));
    this.emit('notification_alert', notification);
  }

  private showBrowserNotification(notification: any) {
    const browserNotification = new Notification(notification.title, {
      body: notification.message,
      icon: '/logo_vert.png',
      tag: 'warehouse-notification',
      requireInteraction: notification.action_required
    });

    browserNotification.onclick = () => {
      window.focus();
      this.closeBrowserNotification(browserNotification);
    };

    if (!notification.action_required) {
      setTimeout(() => {
        this.closeBrowserNotification(browserNotification);
      }, 10000);
    }
  }

  private closeBrowserNotification(notification: any) {
    if (notification && typeof notification.close === 'function') {
      notification.close();
    }
  }

  private mapPriority(priority: string): NotificationPriority {
    if (priority === 'HIGH' || priority === 'MEDIUM' || priority === 'LOW') {
      return priority;
    }
    return 'MEDIUM';
  }

  disconnect() {
    this.isConnected = false;
    this.eventListeners.clear();
  }

  setBrowserNotificationsEnabled(enabled: boolean) {
    this.isTabVisible = !enabled;
    console.log(`🔔 Browser notifications ${enabled ? 'enabled' : 'disabled'}`);
  }
}

export default new NotificationSocketService();