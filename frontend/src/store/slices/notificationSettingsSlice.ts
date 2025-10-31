import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface NotificationSettingsState {
  showCritical: boolean
  showLow: boolean
  showSystem: boolean
  autoCollapse: boolean
  thresholds: {
    lowBattery: number
  }
  dataTransport?: 'socket' | 'http'
  theme?: 'light' | 'dark'
  browserNotifications?: boolean
}

const initialState: NotificationSettingsState = {
  showCritical: true,
  showLow: true,
  showSystem: true,
  autoCollapse: false,
  thresholds: {
    lowBattery: 25
  },
  dataTransport: 'socket'
}

const notificationSettingsSlice = createSlice({
  name: 'notificationSettings',
  initialState,
  reducers: {
    setAll(state, action: PayloadAction<NotificationSettingsState>) { return action.payload },
    setShowCritical(state, action: PayloadAction<boolean>) { state.showCritical = action.payload },
    setShowLow(state, action: PayloadAction<boolean>) { state.showLow = action.payload },
    setShowSystem(state, action: PayloadAction<boolean>) { state.showSystem = action.payload },
    setAutoCollapse(state, action: PayloadAction<boolean>) { state.autoCollapse = action.payload },
    setLowBatteryThreshold(state, action: PayloadAction<number>) { state.thresholds.lowBattery = action.payload }
  }
})

export const { setAll, setShowCritical, setShowLow, setShowSystem, setAutoCollapse, setLowBatteryThreshold } = notificationSettingsSlice.actions
export default notificationSettingsSlice.reducer


