import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import dashboardReducer from './slices/dashboardSlice';
import notificationsReducer from './slices/notificationsSlice';
import mapFocusReducer from './slices/mapFocusSlice';
import notificationSettingsReducer from './slices/notificationSettingsSlice';
import exportReducer from './slices/exportSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    dashboard: dashboardReducer,
    notifications: notificationsReducer,
    mapFocus: mapFocusReducer,
    notificationSettings: notificationSettingsReducer,
    export: exportReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;