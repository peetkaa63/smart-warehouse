// Observer pattern для WebSocket уведомлений

// Интерфейс для наблюдателей
/**
 * Наблюдатель за доменно-значимыми событиями уведомлений.
 *
 * Почему так:
 * - Отделяем «что произошло» от «как/куда доставить»: добавление новых каналов доставки (UI, лог, вебхуки) не ломает продюсеров событий.
 */
export interface NotificationObserver {
  update(eventType: string, data: any): void;
  getObserverId(): string;
}

// Интерфейс для субъекта (наблюдаемого объекта)
export interface NotificationSubject {
  subscribe(observer: NotificationObserver): void;
  unsubscribe(observerId: string): void;
  notify(eventType: string, data: any): void;
}

// Типы событий для уведомлений
export enum NotificationEventType {
  ROBOT_STATUS_CHANGE = 'robot_status_change',
  INVENTORY_UPDATE = 'inventory_update',
  CRITICAL_STOCK = 'critical_stock',
  ROBOT_BATTERY_LOW = 'robot_battery_low',
  SCAN_COMPLETED = 'scan_completed',
  SYSTEM_ALERT = 'system_alert'
}

// Менеджер уведомлений (Subject)
/**
 * Subject/Manager, агрегирующий подписчиков и рассылку событий.
 *
 * Почему так:
 * - Централизация маршрутизации позволяет ввести кросс‑срезовые политики (дедупликация, QoS, трейсинг) без изменений отправителей.
 */
export class NotificationManager implements NotificationSubject {
  private observers: Map<string, NotificationObserver> = new Map();
  private io: any; // Socket.IO instance

  constructor(io: any) {
    this.io = io;
  }

  // Подписка на уведомления
  subscribe(observer: NotificationObserver): void {
    this.observers.set(observer.getObserverId(), observer);
    console.log(`📢 Observer ${observer.getObserverId()} subscribed to notifications`);
  }

  // Отписка от уведомлений
  unsubscribe(observerId: string): void {
    this.observers.delete(observerId);
    console.log(`📢 Observer ${observerId} unsubscribed from notifications`);
  }

  // Уведомление всех наблюдателей
  notify(eventType: string, data: any): void {
    console.log(`📢 Broadcasting notification: ${eventType}`, data);
    
    this.observers.forEach((observer) => {
      try {
        observer.update(eventType, data);
      } catch (error) {
        console.error(`Error notifying observer ${observer.getObserverId()}:`, error);
      }
    });
  }

  // Публичные методы для отправки конкретных типов уведомлений
  notifyRobotStatusChange(robotId: string, oldStatus: string, newStatus: string): void {
    this.notify(NotificationEventType.ROBOT_STATUS_CHANGE, {
      robotId,
      oldStatus,
      newStatus,
      timestamp: new Date().toISOString()
    });
  }

  notifyInventoryUpdate(productId: string, quantity: number, status: string): void {
    this.notify(NotificationEventType.INVENTORY_UPDATE, {
      productId,
      quantity,
      status,
      timestamp: new Date().toISOString()
    });
  }

  notifyCriticalStock(productId: string, productName: string, quantity: number): void {
    this.notify(NotificationEventType.CRITICAL_STOCK, {
      productId,
      productName,
      quantity,
      timestamp: new Date().toISOString(),
      priority: 'HIGH'
    });
  }

  notifyRobotBatteryLow(robotId: string, batteryLevel: number): void {
    this.notify(NotificationEventType.ROBOT_BATTERY_LOW, {
      robotId,
      batteryLevel,
      timestamp: new Date().toISOString(),
      priority: 'MEDIUM'
    });
  }

  notifyScanCompleted(robotId: string, scanResults: any[]): void {
    this.notify(NotificationEventType.SCAN_COMPLETED, {
      robotId,
      scanResults,
      timestamp: new Date().toISOString()
    });
  }

  notifySystemAlert(message: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): void {
    this.notify(NotificationEventType.SYSTEM_ALERT, {
      message,
      severity,
      timestamp: new Date().toISOString()
    });
  }
}

// Базовый класс для наблюдателей WebSocket
export abstract class WebSocketObserver implements NotificationObserver {
  protected socketId: string;
  protected socket: any;

  constructor(socketId: string, socket: any) {
    this.socketId = socketId;
    this.socket = socket;
  }

  getObserverId(): string {
    return this.socketId;
  }

  abstract update(eventType: string, data: any): void;
}

// Наблюдатель для dashboard уведомлений
export class DashboardObserver extends WebSocketObserver {
  update(eventType: string, data: any): void {
    // Отправляем уведомление только если клиент подписан на dashboard
    if (this.socket.rooms.has('dashboard')) {
      this.socket.emit('notification', {
        type: eventType,
        data,
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Наблюдатель для критических уведомлений
export class CriticalAlertsObserver extends WebSocketObserver {
  update(eventType: string, data: any): void {
    // Отправляем только критические уведомления
    const criticalEvents = [
      NotificationEventType.CRITICAL_STOCK,
      NotificationEventType.ROBOT_BATTERY_LOW,
      NotificationEventType.SYSTEM_ALERT
    ];

    if (criticalEvents.includes(eventType as NotificationEventType)) {
      this.socket.emit('critical_alert', {
        type: eventType,
        data,
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Наблюдатель для роботов (если нужно уведомлять роботы)
export class RobotObserver extends WebSocketObserver {
  update(eventType: string, data: any): void {
    // Отправляем уведомления роботам
    if (this.socket.rooms.has('robots')) {
      this.socket.emit('robot_notification', {
        type: eventType,
        data,
        timestamp: new Date().toISOString()
      });
    }
  }
}

