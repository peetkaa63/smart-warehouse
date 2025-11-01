import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { RootState } from '../store'
import { 
  Box, Paper, Typography, Avatar, Divider, List, ListItem, ListItemText, 
  Switch, Button, Chip, Slider, FormGroup, FormControlLabel, Card, 
  CardContent, Stack, IconButton, useTheme
} from '@mui/material'
import { DarkMode, LightMode, ExitToApp, Notifications, Settings, AccountCircle } from '@mui/icons-material'
import { logout } from '../store/slices/authSlice'
import AdminLogsWidget from '../components/AdminLogsWidget'
import { useDispatch as useReduxDispatch } from 'react-redux'
import { setAll, setShowCritical, setShowLow, setShowSystem, setAutoCollapse, setLowBatteryThreshold } from '../store/slices/notificationSettingsSlice'
import { profileAPI } from '../services/api'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import { motion, AnimatePresence } from 'framer-motion'
import notificationSocketService from '../services/notificationSocketService'

// Добавляем тему в Redux store или используем локальное состояние
const Profile: React.FC = () => {
  const dispatch = useDispatch()
  const rdispatch = useReduxDispatch()
  const navigate = useNavigate()
  const { user } = useSelector((state: RootState) => state.auth)
  const notificationSettings = useSelector((state: RootState) => state.notificationSettings)
  
  // Состояние темы
  const [themeMode, setThemeMode] = React.useState<'light' | 'dark'>(
    localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'
  )
  
  // Загружаем настройки включая тему
  React.useEffect(() => {
    (async () => {
      try {
        const resp = await profileAPI.getSettings()
        if (resp?.settings) {
          const loadedSettings = { ...notificationSettings, ...resp.settings }
          rdispatch(setAll(loadedSettings))
          if (resp.settings.theme) {
            setThemeMode(resp.settings.theme)
            localStorage.setItem('theme', resp.settings.theme)
            // Применяем тему к document
            if (resp.settings.theme === 'dark') {
              document.documentElement.classList.add('dark-mode')
            } else {
              document.documentElement.classList.remove('dark-mode')
            }
          }
        }
      } catch {}
    })()
  }, [])

  // Сохраняем изменения настроек
  React.useEffect(() => {
    const saveSettings = async () => {
      try {
        await profileAPI.saveSettings({ 
          ...notificationSettings, 
          theme: themeMode,
          browserNotifications 
        })
      } catch {}
    }
    // Дебаунс для избежания слишком частых сохранений
    const timer = setTimeout(saveSettings, 500)
    return () => clearTimeout(timer)
  }, [notificationSettings, themeMode])

  const [browserNotifications, setBrowserNotifications] = React.useState(
    Notification?.permission === 'granted'
  )

  const handleToggleNotifications = async () => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission()
      }
      setBrowserNotifications(Notification.permission === 'granted')
    }
  }

  const handleThemeToggle = () => {
    const newTheme = themeMode === 'light' ? 'dark' : 'light'
    setThemeMode(newTheme)
    localStorage.setItem('theme', newTheme)
    // Применяем тему к document
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark-mode')
    } else {
      document.documentElement.classList.remove('dark-mode')
    }
    // Отправляем событие для обновления темы в других компонентах (анимированно)
    window.dispatchEvent(new Event('theme-change'))
    // Не перезагружаем страницу, ThemeProvider обновится через событие
  }

  const theme = useTheme();
  
  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: '100vh', backgroundColor: (theme) => theme.palette.mode === 'dark' ? theme.palette.background.default : '#f5f5f5' }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        {/* Профиль пользователя */}
        <Box sx={{ width: { xs: '100%', md: '30%' }, minWidth: { md: 300 } }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack spacing={2} alignItems="center" sx={{ pt: 2 }}>
                <Avatar sx={{ width: 120, height: 120, fontSize: 48, bgcolor: 'primary.main' }}>
                  {user?.name?.[0] || 'U'}
                </Avatar>
                <Typography variant="h5" fontWeight="bold">
                  {user?.name}
                </Typography>
                <Chip 
                  label={user?.role || 'role'} 
                  color="primary" 
                  variant="outlined" 
                  sx={{ textTransform: 'capitalize' }}
                />
                <Divider sx={{ width: '100%', my: 1 }} />
                <List dense sx={{ width: '100%' }}>
                  <ListItem>
                    <ListItemText 
                      primary="Email" 
                      secondary={user?.email || '—'}
                      primaryTypographyProps={{ variant: 'subtitle2' }}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Роль" 
                      secondary={user?.role || '—'}
                      primaryTypographyProps={{ variant: 'subtitle2' }}
                    />
                  </ListItem>
                </List>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        {/* Настройки */}
        <Box sx={{ flex: 1, width: { xs: '100%', md: '70%' } }}>
          <Stack spacing={3}>
            {/* Настройки уведомлений */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                  <Notifications color="primary" />
                  <Typography variant="h6">Уведомления</Typography>
                </Box>
                <List>
                  <ListItem>
                    <ListItemText 
                      primary="Браузерные уведомления" 
                      secondary="Показывать нотификации при скрытой вкладке"
                    />
                    <Switch 
                      edge="end" 
                      onChange={handleToggleNotifications} 
                      checked={browserNotifications} 
                    />
                  </ListItem>
                </List>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
                  Типы уведомлений
                </Typography>
                <FormGroup row sx={{ gap: 2, mb: 2 }}>
                  <FormControlLabel 
                    control={
                      <Switch 
                        checked={notificationSettings.showCritical} 
                        onChange={(e) => rdispatch(setShowCritical(e.target.checked))} 
                      />
                    } 
                    label="Критические" 
                  />
                  <FormControlLabel 
                    control={
                      <Switch 
                        checked={notificationSettings.showLow} 
                        onChange={(e) => rdispatch(setShowLow(e.target.checked))} 
                      />
                    } 
                    label="Низкий приоритет" 
                  />
                  <FormControlLabel 
                    control={
                      <Switch 
                        checked={notificationSettings.showSystem} 
                        onChange={(e) => rdispatch(setShowSystem(e.target.checked))} 
                      />
                    } 
                    label="Системные" 
                  />
                  <FormControlLabel 
                    control={
                      <Switch 
                        checked={notificationSettings.autoCollapse} 
                        onChange={(e) => rdispatch(setAutoCollapse(e.target.checked))} 
                      />
                    } 
                    label="Авто-сворачивание" 
                  />
                </FormGroup>
                <Box sx={{ mt: 2, maxWidth: 400 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Порог низкого заряда: {notificationSettings.thresholds.lowBattery}%
                  </Typography>
                  <Slider
                    value={notificationSettings.thresholds.lowBattery}
                    valueLabelDisplay="auto"
                    step={1}
                    min={5}
                    max={50}
                    onChange={(_, v) => rdispatch(setLowBatteryThreshold(v as number))}
                    sx={{ mt: 1 }}
                  />
                </Box>
              </CardContent>
            </Card>

            {/* Настройки темы */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                  <Settings color="primary" />
                  <Typography variant="h6">Внешний вид</Typography>
                </Box>
                <ListItem>
                  <ListItemText 
                    primary="Тема приложения" 
                    secondary={themeMode === 'dark' ? 'Темная' : 'Светлая'}
                  />
                  <IconButton 
                    onClick={handleThemeToggle}
                    color="primary"
                    sx={{ ml: 1 }}
                  >
                    {themeMode === 'dark' ? <LightMode /> : <DarkMode />}
                  </IconButton>
                </ListItem>
              </CardContent>
            </Card>

            {/* Админ панель */}
            {user?.role === 'admin' && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Администрирование
                  </Typography>
                  <AdminLogsWidget />
                </CardContent>
              </Card>
            )}

            {/* Кнопка выхода */}
            <Card>
              <CardContent>
                <Button 
                  variant="contained" 
                  color="error" 
                  fullWidth
                  startIcon={<ExitToApp />}
                  onClick={() => {
                    // Отключаем уведомления при выходе
                    notificationSocketService.disconnect();
                    
                    // Переходим на dashboard для запуска анимации выхода
                    navigate('/dashboard', { state: { fromProfileLogout: true } });
                    
                    // Даем время на запуск анимации, затем выполняем логаут
                    setTimeout(() => {
                      dispatch(logout());
                      navigate('/login', { state: { fromLogout: true } });
                    }, 1000);
                  }}
                  sx={{ py: 1.5 }}
                >
                  Выйти из аккаунта
                </Button>
              </CardContent>
            </Card>

            {/* Логотип и версия */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, pt: 3, pb: 2 }}>
              <Box sx={{ position: 'relative', height: 48, width: 'auto' }}>
                <AnimatePresence mode="wait">
                  <motion.img
                    key={themeMode}
                    src={themeMode === 'dark' ? "/logo_white.png" : "/logo.png"}
                    alt="Logo"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    style={{
                      height: 48,
                      width: 'auto',
                      objectFit: 'contain',
                    }}
                    onError={(e: any) => {
                      // Если логотип не найден, скрываем его
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </AnimatePresence>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Версия 1.0
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Box>
    </Box>
  )
}

export default Profile
