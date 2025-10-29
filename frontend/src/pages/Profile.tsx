import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '../store'
import { Box, Paper, Typography, Avatar, Divider, List, ListItem, ListItemText, Switch, Button, Chip, Slider, FormGroup, FormControlLabel } from '@mui/material'
import Grid from '@mui/material/Grid'
import { logout } from '../store/slices/authSlice'
import AdminLogsWidget from '../components/AdminLogsWidget'
import { useDispatch as useReduxDispatch } from 'react-redux'
import { setAll, setShowCritical, setShowLow, setShowSystem, setAutoCollapse, setLowBatteryThreshold } from '../store/slices/notificationSettingsSlice'
import { profileAPI } from '../services/api'

const Profile: React.FC = () => {
  const dispatch = useDispatch()
  const rdispatch = useReduxDispatch()
  const { user } = useSelector((state: RootState) => state.auth)
  const notificationSettings = useSelector((state: RootState) => state.notificationSettings)

  // Load settings from server
  React.useEffect(() => {
    (async () => {
      try {
        const resp = await profileAPI.getSettings()
        if (resp?.settings) {
          rdispatch(setAll({ ...notificationSettings, ...resp.settings }))
        }
      } catch {}
    })()
  }, [])

  // Persist on changes (simple save)
  React.useEffect(() => {
    (async () => {
      try {
        await profileAPI.saveSettings(notificationSettings)
      } catch {}
    })()
  }, [notificationSettings])

  const [browserNotifications, setBrowserNotifications] = React.useState(Notification?.permission === 'granted')

  const handleToggleNotifications = async () => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission()
      }
      setBrowserNotifications(Notification.permission === 'granted')
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4} md={3}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 96, height: 96 }}>{user?.name?.[0] || 'U'}</Avatar>
              <Typography variant="h6">{user?.name}</Typography>
              <Chip label={user?.role || 'role'} size="small" color="primary" variant="outlined" />
            </Box>
          </Grid>
          <Grid item xs={12} sm={8} md={9}>
            <Typography variant="subtitle1" gutterBottom>Учетная запись</Typography>
            <List>
              <ListItem>
                <ListItemText primary="Email" secondary={user?.email || '—'} />
              </ListItem>
              <ListItem>
                <ListItemText primary="Роль" secondary={user?.role || '—'} />
              </ListItem>
            </List>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" gutterBottom>Настройки</Typography>
            <List>
              <ListItem secondaryAction={
                <Switch edge="end" onChange={handleToggleNotifications} checked={browserNotifications} />
              }>
                <ListItemText primary="Браузерные уведомления" secondary="Показывать нотификации при скрытой вкладке" />
              </ListItem>
            </List>
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle2" gutterBottom>Флаги уведомлений</Typography>
              <FormGroup row>
                <FormControlLabel control={<Switch checked={notificationSettings.showCritical} onChange={(e) => rdispatch(setShowCritical(e.target.checked))} />} label="Критические" />
                <FormControlLabel control={<Switch checked={notificationSettings.showLow} onChange={(e) => rdispatch(setShowLow(e.target.checked))} />} label="Низкий приоритет" />
                <FormControlLabel control={<Switch checked={notificationSettings.showSystem} onChange={(e) => rdispatch(setShowSystem(e.target.checked))} />} label="Системные" />
                <FormControlLabel control={<Switch checked={notificationSettings.autoCollapse} onChange={(e) => rdispatch(setAutoCollapse(e.target.checked))} />} label="Авто-сворачивание" />
              </FormGroup>
              <Box sx={{ mt: 2, maxWidth: 360 }}>
                <Typography variant="subtitle2">Порог низкого заряда: {notificationSettings.thresholds.lowBattery}%</Typography>
                <Slider
                  size="small"
                  value={notificationSettings.thresholds.lowBattery}
                  valueLabelDisplay="auto"
                  step={1}
                  min={5}
                  max={50}
                  onChange={(_, v) => rdispatch(setLowBatteryThreshold(v as number))}
                />
              </Box>
            </Box>
            <Divider sx={{ my: 2 }} />
            {user?.role === 'admin' && (
              <Box sx={{ mb: 2 }}>
                <AdminLogsWidget />
              </Box>
            )}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button variant="contained" color="error" onClick={() => dispatch(logout())}>Выйти</Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  )
}

export default Profile


