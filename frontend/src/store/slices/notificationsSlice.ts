// store/slices/notificationsSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Приоритет уведомлений влияет на визуализацию и политику автоудаления.
 *
 * Почему так: UI не должен принимать решения из бизнес‑контекста —
 * достаточно нормализованных уровней для единых UX‑правил.
 */
// Определяем тип для приоритета
export type NotificationPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  product_id?: string;
  product_name?: string;
  robot_id?: string;
  zone?: string;
  row?: number;
  shelf?: number;
  timestamp: string;
  read: boolean;
  action_required: boolean;
  actions?: NotificationAction[];
  duration?: number;
  persistent?: boolean;
}

export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

interface NotificationsState {
  items: Notification[];
  unreadCount: number;
}

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0
};

/**
 * Redux slice для управления уведомлениями.
 *
 * Почему так:
 * - Храним непрочитанные отдельным счётчиком: это O(1) обновления без проходов по массиву.
 * - Ограничение в 50 элементов предотвращает деградацию производительности и «дедлок» UI от всплесков событий.
 */
const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    /** Добавляет нормализованное уведомление в начало списка (LIFO).
     * Почему так: новое важнее старого, и так меньше прокрутки.
     */
    addNotification: (state, action: PayloadAction<Notification>) => {
      const newNotification = action.payload;
      
      // Проверяем на дубликаты по ID - если уведомление с таким ID уже есть, не добавляем
      const existingIndex = state.items.findIndex(item => item.id === newNotification.id);
      if (existingIndex !== -1) {
        return; // Уже существует, пропускаем
      }
      
      state.items.unshift(newNotification);
      state.unreadCount += 1;
      
      // Лимит уведомлений
      if (state.items.length > 50) {
        state.items = state.items.slice(0, 50);
      }
    },
    /** Упрощённый экшен для удобного показа уведомлений из UI/хуков.
     * Почему так: снимаем с вызывающих сторон обязанность генерировать id/timestamp.
     */
    showNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp' | 'read' | 'priority' | 'action_required'> & { priority?: NotificationPriority; action_required?: boolean }>) => {
      const notification: Notification = {
        ...action.payload,
        id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        read: false,
        priority: action.payload.priority || 'MEDIUM',
        action_required: action.payload.action_required || false
      };
      state.items.unshift(notification);
      state.unreadCount += 1;
      
      // Лимит уведомлений
      if (state.items.length > 50) {
        state.items = state.items.slice(0, 50);
      }
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.items.find(item => item.id === action.payload);
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount -= 1;
      }
    },
    /** Помечает все уведомления прочитанными.
     * Почему так: массовая операция должна быть O(n) без пересоздания массива, чтобы не терять ссылки в UI.
     */
    markAllAsRead: (state) => {
      state.items.forEach(item => {
        if (!item.read) {
          item.read = true;
        }
      });
      state.unreadCount = 0;
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      const notification = state.items.find(item => item.id === action.payload);
      if (notification && !notification.read) {
        state.unreadCount -= 1;
      }
      state.items = state.items.filter(item => item.id !== action.payload);
    },
    clearAll: (state) => {
      state.items = [];
      state.unreadCount = 0;
    },
    /** Удаляет устаревшие уведомления с мягкими правилами.
     * Почему так: не удаляем требующие действий — безопасность и операционная дисциплина важнее «чистоты» ленты.
     */
    clearExpiredNotifications: (state) => {
      const now = new Date().getTime();
      state.items = state.items.filter(notification => {
        // Простая логика для постоянных уведомлений
        if (notification.action_required) {
          return true; // Не удаляем уведомления, требующие действий
        }
        
        // Удаляем старые уведомления (старше 24 часов)
        const notificationTime = new Date(notification.timestamp).getTime();
        const isExpired = (now - notificationTime) > 24 * 60 * 60 * 1000;
        
        if (isExpired && !notification.read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        
        return !isExpired;
      });
    },
    clearAllNotifications: (state) => {
      state.items = [];
      state.unreadCount = 0;
    }
  }
});

export const { 
  addNotification, 
  showNotification,
  markAsRead, 
  markAllAsRead, 
  removeNotification, 
  clearAll,
  clearExpiredNotifications,
  clearAllNotifications
} = notificationsSlice.actions;

export default notificationsSlice.reducer;