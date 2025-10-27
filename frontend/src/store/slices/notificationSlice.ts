import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number; // 0 = не исчезает автоматически
  timestamp: number;
  read: boolean;
  persistent?: boolean; // Сохраняется до ручного закрытия
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    showNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp' | 'read'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        read: false
      };

      state.notifications.unshift(notification);
      state.unreadCount += 1;

      // Ограничиваем количество уведомлений
      if (state.notifications.length > 50) {
        state.notifications = state.notifications.slice(0, 50);
      }
    },

    markAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },

    markAllAsRead: (state) => {
      state.notifications.forEach(notification => {
        notification.read = true;
      });
      state.unreadCount = 0;
    },

    removeNotification: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification) {
        if (!notification.read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.notifications = state.notifications.filter(n => n.id !== action.payload);
      }
    },

    clearAllNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },

    clearExpiredNotifications: (state) => {
      const now = Date.now();
      state.notifications = state.notifications.filter(notification => {
        if (notification.persistent || notification.duration === 0) {
          return true; // Не удаляем постоянные уведомления
        }
        
        const isExpired = notification.duration && (now - notification.timestamp) > notification.duration;
        if (isExpired && !notification.read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        
        return !isExpired;
      });
    }
  }
});

export const {
  showNotification,
  markAsRead,
  markAllAsRead,
  removeNotification,
  clearAllNotifications,
  clearExpiredNotifications
} = notificationSlice.actions;

export default notificationSlice.reducer;

