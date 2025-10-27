import { configureStore } from '@reduxjs/toolkit';
import notificationsReducer, { 
  addNotification, 
  markAsRead, 
  markAllAsRead, 
  removeNotification, 
  clearAll 
} from '../slices/notificationsSlice';
import { Notification, NotificationPriority } from '../slices/notificationsSlice';

describe('Notifications Slice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        notifications: notificationsReducer
      }
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = store.getState().notifications;
      
      expect(state.items).toEqual([]);
      expect(state.unreadCount).toBe(0);
    });
  });

  describe('Add Notification Action', () => {
    it('should add notification to beginning of list', () => {
      const notification: Notification = {
        id: '1',
        type: 'stock_alert',
        title: 'Low Stock Alert',
        message: 'Product PROD-001 is running low',
        priority: 'HIGH' as NotificationPriority,
        product_id: 'PROD-001',
        timestamp: '2024-01-01T10:00:00Z',
        read: false,
        action_required: true
      };

      store.dispatch(addNotification(notification));
      
      const state = store.getState().notifications;
      expect(state.items).toHaveLength(1);
      expect(state.items[0]).toEqual(notification);
      expect(state.unreadCount).toBe(1);
    });

    it('should add multiple notifications', () => {
      const notification1: Notification = {
        id: '1',
        type: 'stock_alert',
        title: 'Low Stock Alert',
        message: 'Product PROD-001 is running low',
        priority: 'HIGH' as NotificationPriority,
        product_id: 'PROD-001',
        timestamp: '2024-01-01T10:00:00Z',
        read: false,
        action_required: true
      };

      const notification2: Notification = {
        id: '2',
        type: 'robot_status',
        title: 'Robot Offline',
        message: 'Robot ROBOT-001 is offline',
        priority: 'MEDIUM' as NotificationPriority,
        robot_id: 'ROBOT-001',
        timestamp: '2024-01-01T11:00:00Z',
        read: false,
        action_required: false
      };

      store.dispatch(addNotification(notification1));
      store.dispatch(addNotification(notification2));
      
      const state = store.getState().notifications;
      expect(state.items).toHaveLength(2);
      expect(state.items[0]).toEqual(notification2); // Последний добавленный - первый в списке
      expect(state.items[1]).toEqual(notification1);
      expect(state.unreadCount).toBe(2);
    });

    it('should limit notifications to 50 items', () => {
      // Добавляем 51 уведомление
      for (let i = 1; i <= 51; i++) {
        const notification: Notification = {
          id: i.toString(),
          type: 'test',
          title: `Test ${i}`,
          message: `Test message ${i}`,
          priority: 'LOW' as NotificationPriority,
          timestamp: '2024-01-01T10:00:00Z',
          read: false,
          action_required: false
        };
        store.dispatch(addNotification(notification));
      }
      
      const state = store.getState().notifications;
      expect(state.items).toHaveLength(50);
      expect(state.unreadCount).toBe(50);
      // Проверяем, что остались последние 50 уведомлений
      expect(state.items[0].id).toBe('51');
      expect(state.items[49].id).toBe('2');
    });

    it('should handle different priority levels', () => {
      const priorities: NotificationPriority[] = ['HIGH', 'MEDIUM', 'LOW'];
      
      priorities.forEach((priority, index) => {
        const notification: Notification = {
          id: (index + 1).toString(),
          type: 'test',
          title: `Test ${priority}`,
          message: `Test message ${priority}`,
          priority,
          timestamp: '2024-01-01T10:00:00Z',
          read: false,
          action_required: false
        };
        store.dispatch(addNotification(notification));
      });
      
      const state = store.getState().notifications;
      expect(state.items).toHaveLength(3);
      expect(state.items[0].priority).toBe('LOW');
      expect(state.items[1].priority).toBe('MEDIUM');
      expect(state.items[2].priority).toBe('HIGH');
    });
  });

  describe('Mark As Read Action', () => {
    it('should mark specific notification as read', () => {
      const notification: Notification = {
        id: '1',
        type: 'stock_alert',
        title: 'Low Stock Alert',
        message: 'Product PROD-001 is running low',
        priority: 'HIGH' as NotificationPriority,
        product_id: 'PROD-001',
        timestamp: '2024-01-01T10:00:00Z',
        read: false,
        action_required: true
      };

      store.dispatch(addNotification(notification));
      store.dispatch(markAsRead('1'));
      
      const state = store.getState().notifications;
      expect(state.items[0].read).toBe(true);
      expect(state.unreadCount).toBe(0);
    });

    it('should not affect unread count if notification is already read', () => {
      const notification: Notification = {
        id: '1',
        type: 'stock_alert',
        title: 'Low Stock Alert',
        message: 'Product PROD-001 is running low',
        priority: 'HIGH' as NotificationPriority,
        product_id: 'PROD-001',
        timestamp: '2024-01-01T10:00:00Z',
        read: true, // Уже прочитано
        action_required: true
      };

      store.dispatch(addNotification(notification));
      store.dispatch(markAsRead('1'));
      
      const state = store.getState().notifications;
      expect(state.items[0].read).toBe(true);
      expect(state.unreadCount).toBe(0); // Не должно измениться
    });

    it('should handle marking non-existent notification', () => {
      store.dispatch(markAsRead('non-existent'));
      
      const state = store.getState().notifications;
      expect(state.items).toEqual([]);
      expect(state.unreadCount).toBe(0);
    });

    it('should handle multiple notifications with mixed read states', () => {
      const notification1: Notification = {
        id: '1',
        type: 'stock_alert',
        title: 'Low Stock Alert',
        message: 'Product PROD-001 is running low',
        priority: 'HIGH' as NotificationPriority,
        product_id: 'PROD-001',
        timestamp: '2024-01-01T10:00:00Z',
        read: false,
        action_required: true
      };

      const notification2: Notification = {
        id: '2',
        type: 'robot_status',
        title: 'Robot Offline',
        message: 'Robot ROBOT-001 is offline',
        priority: 'MEDIUM' as NotificationPriority,
        robot_id: 'ROBOT-001',
        timestamp: '2024-01-01T11:00:00Z',
        read: false,
        action_required: false
      };

      store.dispatch(addNotification(notification1));
      store.dispatch(addNotification(notification2));
      
      // Отмечаем первое как прочитанное
      store.dispatch(markAsRead('2')); // notification2 находится первым в списке
      
      const state = store.getState().notifications;
      expect(state.items[0].read).toBe(true);
      expect(state.items[1].read).toBe(false);
      expect(state.unreadCount).toBe(1);
    });
  });

  describe('Mark All As Read Action', () => {
    it('should mark all notifications as read', () => {
      const notifications: Notification[] = [
        {
          id: '1',
          type: 'stock_alert',
          title: 'Low Stock Alert',
          message: 'Product PROD-001 is running low',
          priority: 'HIGH' as NotificationPriority,
          product_id: 'PROD-001',
          timestamp: '2024-01-01T10:00:00Z',
          read: false,
          action_required: true
        },
        {
          id: '2',
          type: 'robot_status',
          title: 'Robot Offline',
          message: 'Robot ROBOT-001 is offline',
          priority: 'MEDIUM' as NotificationPriority,
          robot_id: 'ROBOT-001',
          timestamp: '2024-01-01T11:00:00Z',
          read: false,
          action_required: false
        }
      ];

      notifications.forEach(notification => {
        store.dispatch(addNotification(notification));
      });

      store.dispatch(markAllAsRead());
      
      const state = store.getState().notifications;
      expect(state.items[0].read).toBe(true);
      expect(state.items[1].read).toBe(true);
      expect(state.unreadCount).toBe(0);
    });

    it('should handle empty notifications list', () => {
      store.dispatch(markAllAsRead());
      
      const state = store.getState().notifications;
      expect(state.items).toEqual([]);
      expect(state.unreadCount).toBe(0);
    });

    it('should handle mixed read/unread notifications', () => {
      const notification1: Notification = {
        id: '1',
        type: 'stock_alert',
        title: 'Low Stock Alert',
        message: 'Product PROD-001 is running low',
        priority: 'HIGH' as NotificationPriority,
        product_id: 'PROD-001',
        timestamp: '2024-01-01T10:00:00Z',
        read: true, // Уже прочитано
        action_required: true
      };

      const notification2: Notification = {
        id: '2',
        type: 'robot_status',
        title: 'Robot Offline',
        message: 'Robot ROBOT-001 is offline',
        priority: 'MEDIUM' as NotificationPriority,
        robot_id: 'ROBOT-001',
        timestamp: '2024-01-01T11:00:00Z',
        read: false,
        action_required: false
      };

      store.dispatch(addNotification(notification1));
      store.dispatch(addNotification(notification2));
      
      store.dispatch(markAllAsRead());
      
      const state = store.getState().notifications;
      expect(state.items[0].read).toBe(true);
      expect(state.items[1].read).toBe(true);
      expect(state.unreadCount).toBe(0);
    });
  });

  describe('Remove Notification Action', () => {
    it('should remove specific notification', () => {
      const notification: Notification = {
        id: '1',
        type: 'stock_alert',
        title: 'Low Stock Alert',
        message: 'Product PROD-001 is running low',
        priority: 'HIGH' as NotificationPriority,
        product_id: 'PROD-001',
        timestamp: '2024-01-01T10:00:00Z',
        read: false,
        action_required: true
      };

      store.dispatch(addNotification(notification));
      store.dispatch(removeNotification('1'));
      
      const state = store.getState().notifications;
      expect(state.items).toEqual([]);
      expect(state.unreadCount).toBe(0);
    });

    it('should decrease unread count when removing unread notification', () => {
      const notifications: Notification[] = [
        {
          id: '1',
          type: 'stock_alert',
          title: 'Low Stock Alert',
          message: 'Product PROD-001 is running low',
          priority: 'HIGH' as NotificationPriority,
          product_id: 'PROD-001',
          timestamp: '2024-01-01T10:00:00Z',
          read: false,
          action_required: true
        },
        {
          id: '2',
          type: 'robot_status',
          title: 'Robot Offline',
          message: 'Robot ROBOT-001 is offline',
          priority: 'MEDIUM' as NotificationPriority,
          robot_id: 'ROBOT-001',
          timestamp: '2024-01-01T11:00:00Z',
          read: false,
          action_required: false
        }
      ];

      notifications.forEach(notification => {
        store.dispatch(addNotification(notification));
      });

      store.dispatch(removeNotification('2')); // Удаляем первое в списке
      
      const state = store.getState().notifications;
      expect(state.items).toHaveLength(1);
      expect(state.items[0].id).toBe('1');
      expect(state.unreadCount).toBe(1);
    });

    it('should not affect unread count when removing read notification', () => {
      const notification: Notification = {
        id: '1',
        type: 'stock_alert',
        title: 'Low Stock Alert',
        message: 'Product PROD-001 is running low',
        priority: 'HIGH' as NotificationPriority,
        product_id: 'PROD-001',
        timestamp: '2024-01-01T10:00:00Z',
        read: true, // Уже прочитано
        action_required: true
      };

      store.dispatch(addNotification(notification));
      store.dispatch(removeNotification('1'));
      
      const state = store.getState().notifications;
      expect(state.items).toEqual([]);
      expect(state.unreadCount).toBe(0); // Не должно измениться
    });

    it('should handle removing non-existent notification', () => {
      store.dispatch(removeNotification('non-existent'));
      
      const state = store.getState().notifications;
      expect(state.items).toEqual([]);
      expect(state.unreadCount).toBe(0);
    });
  });

  describe('Clear All Action', () => {
    it('should clear all notifications', () => {
      const notifications: Notification[] = [
        {
          id: '1',
          type: 'stock_alert',
          title: 'Low Stock Alert',
          message: 'Product PROD-001 is running low',
          priority: 'HIGH' as NotificationPriority,
          product_id: 'PROD-001',
          timestamp: '2024-01-01T10:00:00Z',
          read: false,
          action_required: true
        },
        {
          id: '2',
          type: 'robot_status',
          title: 'Robot Offline',
          message: 'Robot ROBOT-001 is offline',
          priority: 'MEDIUM' as NotificationPriority,
          robot_id: 'ROBOT-001',
          timestamp: '2024-01-01T11:00:00Z',
          read: true,
          action_required: false
        }
      ];

      notifications.forEach(notification => {
        store.dispatch(addNotification(notification));
      });

      store.dispatch(clearAll());
      
      const state = store.getState().notifications;
      expect(state.items).toEqual([]);
      expect(state.unreadCount).toBe(0);
    });

    it('should handle clearing empty notifications list', () => {
      store.dispatch(clearAll());
      
      const state = store.getState().notifications;
      expect(state.items).toEqual([]);
      expect(state.unreadCount).toBe(0);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle complete notification lifecycle', () => {
      // Добавляем уведомления
      const notification1: Notification = {
        id: '1',
        type: 'stock_alert',
        title: 'Low Stock Alert',
        message: 'Product PROD-001 is running low',
        priority: 'HIGH' as NotificationPriority,
        product_id: 'PROD-001',
        timestamp: '2024-01-01T10:00:00Z',
        read: false,
        action_required: true
      };

      const notification2: Notification = {
        id: '2',
        type: 'robot_status',
        title: 'Robot Offline',
        message: 'Robot ROBOT-001 is offline',
        priority: 'MEDIUM' as NotificationPriority,
        robot_id: 'ROBOT-001',
        timestamp: '2024-01-01T11:00:00Z',
        read: false,
        action_required: false
      };

      store.dispatch(addNotification(notification1));
      store.dispatch(addNotification(notification2));
      
      let state = store.getState().notifications;
      expect(state.items).toHaveLength(2);
      expect(state.unreadCount).toBe(2);
      
      // Отмечаем одно как прочитанное
      store.dispatch(markAsRead('2'));
      
      state = store.getState().notifications;
      expect(state.unreadCount).toBe(1);
      expect(state.items[0].read).toBe(true);
      expect(state.items[1].read).toBe(false);
      
      // Отмечаем все как прочитанные
      store.dispatch(markAllAsRead());
      
      state = store.getState().notifications;
      expect(state.unreadCount).toBe(0);
      expect(state.items[0].read).toBe(true);
      expect(state.items[1].read).toBe(true);
      
      // Удаляем одно уведомление
      store.dispatch(removeNotification('1'));
      
      state = store.getState().notifications;
      expect(state.items).toHaveLength(1);
      expect(state.items[0].id).toBe('2');
      expect(state.unreadCount).toBe(0);
      
      // Очищаем все
      store.dispatch(clearAll());
      
      state = store.getState().notifications;
      expect(state.items).toEqual([]);
      expect(state.unreadCount).toBe(0);
    });

    it('should handle rapid notification additions', () => {
      // Добавляем много уведомлений быстро
      for (let i = 1; i <= 10; i++) {
        const notification: Notification = {
          id: i.toString(),
          type: 'test',
          title: `Test ${i}`,
          message: `Test message ${i}`,
          priority: 'LOW' as NotificationPriority,
          timestamp: '2024-01-01T10:00:00Z',
          read: false,
          action_required: false
        };
        store.dispatch(addNotification(notification));
      }
      
      const state = store.getState().notifications;
      expect(state.items).toHaveLength(10);
      expect(state.unreadCount).toBe(10);
      expect(state.items[0].id).toBe('10'); // Последний добавленный - первый в списке
      expect(state.items[9].id).toBe('1');
    });

    it('should maintain correct order after operations', () => {
      const notifications: Notification[] = [
        {
          id: '1',
          type: 'stock_alert',
          title: 'Low Stock Alert',
          message: 'Product PROD-001 is running low',
          priority: 'HIGH' as NotificationPriority,
          product_id: 'PROD-001',
          timestamp: '2024-01-01T10:00:00Z',
          read: false,
          action_required: true
        },
        {
          id: '2',
          type: 'robot_status',
          title: 'Robot Offline',
          message: 'Robot ROBOT-001 is offline',
          priority: 'MEDIUM' as NotificationPriority,
          robot_id: 'ROBOT-001',
          timestamp: '2024-01-01T11:00:00Z',
          read: false,
          action_required: false
        },
        {
          id: '3',
          type: 'maintenance',
          title: 'Maintenance Required',
          message: 'Scheduled maintenance for Zone A',
          priority: 'LOW' as NotificationPriority,
          zone: 'A',
          timestamp: '2024-01-01T12:00:00Z',
          read: false,
          action_required: false
        }
      ];

      notifications.forEach(notification => {
        store.dispatch(addNotification(notification));
      });

      // Проверяем порядок: последний добавленный - первый в списке
      let state = store.getState().notifications;
      expect(state.items[0].id).toBe('3');
      expect(state.items[1].id).toBe('2');
      expect(state.items[2].id).toBe('1');
      
      // Отмечаем среднее как прочитанное
      store.dispatch(markAsRead('2'));
      
      // Порядок должен остаться тем же
      state = store.getState().notifications;
      expect(state.items[0].id).toBe('3');
      expect(state.items[1].id).toBe('2');
      expect(state.items[2].id).toBe('1');
      expect(state.items[1].read).toBe(true);
    });
  });
});
