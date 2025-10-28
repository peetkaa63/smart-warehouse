// services/notificationSocketService.ts
import { store } from '../store';
import { addNotification, NotificationPriority } from '../store/slices/notificationsSlice';
import { socketService } from './socketService';

type EventCallback = (data: any) => void;

/**
 * Клиентский слой подписки на уведомления через Socket.IO.
 *
 * Почему так:
 * - Локальная шина событий (on/emit) отделяет сокет‑транспорт от UI: компоненты не зависят от socket.io API.
 * - Браузерные нотификации показываем только при скрытой вкладке: снижаем «шум» и не конкурируем с in‑app алертами.
 * - Нормализация приоритета на клиенте защищает UI от расхождений форматов между сервисами.
 */
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

    socket.on('critical_alert', (data: any) => {
      console.log('🚨 Received critical alert:', data);
      this.handleCriticalAlert(data);
    });

    this.isConnected = true;
  }

  /**
   * Обработка системных уведомлений.
   *
   * Почему так: одно место нормализации структуры, чтобы Redux и UI не были связаны с формой событий на сервере.
   */
  private handleSystemNotification(data: any) {
    console.log('🔔 Processing system notification:', data);
    console.log('✅ ПРИНЯЛ УВЕДОМЛЕНИЕ ОТ СЕРВЕРА - данные:', JSON.stringify(data, null, 2));
    
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

    console.log('📝 Dispatch notification to Redux:', notification);
    console.log('✅ УВЕДОМЛЕНИЕ БУДЕТ ОТОБРАЖЕНО В ИНТЕРФЕЙСЕ');
    
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

  /**
   * Обработка критических алертов (низкий заряд, критический остаток).
   *
   * Почему так: явная ветвизация по типам нужна, чтобы задавать разные UX‑политики (авто‑таймауты, требование действий).
   */
  private handleCriticalAlert(data: any) {
    console.log('🚨 Processing critical alert:', data);
    console.log('✅ ПРИНЯЛ КРИТИЧЕСКОЕ УВЕДОМЛЕНИЕ ОТ СЕРВЕРА:', JSON.stringify(data, null, 2));
    
    // Определяем тип уведомления и создаем соответствующее сообщение
    let notification;
    
    switch (data.type) {
      case 'critical_stock':
        notification = {
          id: `critical-stock-${Date.now()}`,
          type: 'CRITICAL_STOCK',
          title: `🚨 KРИТИЧЕСКИЙ ОСТАТОК: ${data.data.productName || data.data.product_id}`,
          message: `Товар имеет критически низкий уровень запасов (${data.data.quantity} шт.)`,
          priority: 'HIGH' as NotificationPriority,
          product_id: data.data.productId || data.data.product_id,
          timestamp: new Date().toISOString(),
          read: false,
          action_required: true
        };
        break;
        
      case 'robot_battery_low':
        console.log(`🔋 ПРИНЯЛ УВЕДОМЛЕНИЕ О НИЗКОМ ЗАРЯДЕ: Робот ${data.data.robotId}, заряд ${data.data.batteryLevel}%`);
        
        notification = {
          id: `robot-battery-${Date.now()}`,
          type: 'ROBOT_BATTERY_LOW',
          title: `🔋 НИЗКИЙ ЗАРЯД РОБОТА: ${data.data.robotId}`,
          message: `Робот ${data.data.robotId} имеет низкий заряд батареи (${data.data.batteryLevel}%)`,
          priority: 'MEDIUM' as NotificationPriority,
          robot_id: data.data.robotId,
          timestamp: new Date().toISOString(),
          read: false,
          action_required: true
        };
        
        console.log('✅ УВЕДОМЛЕНИЕ О НИЗКОМ ЗАРЯДЕ БУДЕТ ОТОБРАЖЕНО');
        break;
        
      case 'system_alert':
        notification = {
          id: `system-critical-${Date.now()}`,
          type: 'SYSTEM_ALERT',
          title: `🚨 КРИТИЧЕСКАЯ ОШИБКА СИСТЕМЫ`,
          message: data.data.message || 'Произошла критическая ошибка в системе',
          priority: 'HIGH' as NotificationPriority,
          timestamp: new Date().toISOString(),
          read: false,
          action_required: true
        };
        break;
        
      default:
        notification = {
          id: `critical-${Date.now()}`,
          type: 'CRITICAL_ALERT',
          title: '🚨 Критический алерт',
          message: data.data.message || 'Произошло критическое событие',
          priority: 'HIGH' as NotificationPriority,
          timestamp: new Date().toISOString(),
          read: false,
          action_required: true
        };
    }

    // Добавляем уведомление в store
    console.log('📝 Dispatch critical notification to Redux:', notification);
    store.dispatch(addNotification(notification));
    
    // Эмитим событие для UI
    this.emit('notification_alert', notification);
    
    // Показываем браузерное уведомление для критических алертов
    if (Notification.permission === 'granted') {
      this.showBrowserNotification(notification);
    }
    
    console.log('🚨 Critical alert processed and displayed:', notification);
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