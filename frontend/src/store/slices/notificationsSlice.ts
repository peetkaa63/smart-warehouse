// store/slices/notificationsSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Определяем тип для приоритета
export type NotificationPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  product_id?: string;
  robot_id?: string;
  zone?: string;
  timestamp: string;
  read: boolean;
  action_required: boolean;
}

interface NotificationsState {
  items: Notification[];
  unreadCount: number;
}

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.items.unshift(action.payload);
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
    }
  }
});

export const { 
  addNotification, 
  markAsRead, 
  markAllAsRead, 
  removeNotification, 
  clearAll 
} = notificationsSlice.actions;

export default notificationsSlice.reducer;