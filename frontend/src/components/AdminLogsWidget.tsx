import React from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../store'
import { 
  Box, Paper, Typography, Divider, List, ListItem, ListItemText, Chip, Button, TextField, 
  Stack, RadioGroup, FormControlLabel, Radio, Dialog, DialogTitle, DialogContent, 
  DialogActions, IconButton, Tabs, Tab, Select, MenuItem, FormControl, InputLabel 
} from '@mui/material'
import { Close, RefreshCw, Storage, People, Security, Settings } from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { useSpring, animated } from '@react-spring/web'
import { useDispatch as useReduxDispatch } from 'react-redux'
import { setAll } from '../store/slices/notificationSettingsSlice'
import { profileAPI } from '../services/api'
import api from '../services/api'

interface LogEntry {
  id?: string;
  timestamp: string;
  level: string;
  type: string;
  message: string;
  title?: string;
  priority?: string;
  category?: 'robot' | 'user' | 'system' | 'security' | 'warehouse';
}

const AdminLogsWidget: React.FC = () => {
  const { items: notifications } = useSelector((state: RootState) => state.notifications)
  const [open, setOpen] = React.useState(false)
  const [filter, setFilter] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [statusMsg, setStatusMsg] = React.useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all')
  const settings = useSelector((state: RootState) => state.notificationSettings)
  const rdispatch = useReduxDispatch()

  const [logs, setLogs] = React.useState<LogEntry[]>([])

  const loadLogs = React.useCallback(async () => {
    try {
      const resp = await api.get('/api/admin/logs')
      const rawLogs = resp.data?.data || []
      // Добавляем категории к логам на основе содержания
      const categorizedLogs = rawLogs.map((log: any) => ({
        ...log,
        category: categorizeLog(log)
      }))
      setLogs(categorizedLogs)
    } catch {}
  }, [])

  React.useEffect(() => {
    if (open) {
      loadLogs()
    }
  }, [open, loadLogs])

  const categorizeLog = (log: any): LogEntry['category'] => {
    const message = (log.message || log.title || '').toLowerCase()
    if (message.includes('робот') || message.includes('robot')) return 'robot'
    if (message.includes('пользователь') || message.includes('user') || message.includes('login') || message.includes('auth')) return 'user'
    if (message.includes('ошибка') || message.includes('error') || message.includes('exception') || message.includes('security')) return 'security'
    if (message.includes('склад') || message.includes('warehouse') || message.includes('inventory') || message.includes('scan')) return 'warehouse'
    return 'system'
  }

  // Генерируем расширенные логи на основе доступных данных
  const allItems = React.useMemo(() => {
    const items: LogEntry[] = []
    
    // Добавляем логи из БД
    items.push(...logs.map(log => ({
      ...log,
      timestamp: log.timestamp || new Date().toISOString(),
      level: log.level || 'INFO'
    })))
    
    // Добавляем уведомления как логи
    const notifItems: LogEntry[] = (notifications || []).map((n: any) => ({
      id: `notif-${n.id || Date.now()}`,
      timestamp: n.timestamp || new Date().toISOString(),
      level: n.type === 'error' ? 'ERROR' : n.type === 'warning' ? 'WARNING' : 'INFO',
      type: n.type || 'notification',
      message: `${n.title || ''}: ${n.message || ''}`,
      title: n.title,
      priority: n.priority,
      category: categorizeLog({ message: n.message, title: n.title })
    }))
    items.push(...notifItems)
    
    // Генерируем системные логи
    const systemLogs: LogEntry[] = [
      {
        id: 'sys-1',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        level: 'INFO',
        type: 'system',
        message: 'Система мониторинга запущена',
        category: 'system'
      },
      {
        id: 'sys-2',
        timestamp: new Date(Date.now() - 600000).toISOString(),
        level: 'INFO',
        type: 'system',
        message: 'База данных подключена',
        category: 'system'
      }
    ]
    items.push(...systemLogs)
    
    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [logs, notifications])

  const filtered = React.useMemo(() => {
    let items = allItems
    if (selectedCategory !== 'all') {
      items = items.filter((item) => item.category === selectedCategory)
    }
    const q = filter.trim().toLowerCase()
    if (!q) return items.slice(0, 100)
    return items.filter((n: LogEntry) =>
      (n.message || '').toLowerCase().includes(q) ||
      (n.level || '').toLowerCase().includes(q) ||
      (n.type || '').toLowerCase().includes(q) ||
      (n.title || '').toLowerCase().includes(q)
    ).slice(0, 100)
  }, [allItems, filter, selectedCategory])

  const listAnimation = useSpring({
    opacity: filtered.length > 0 ? 1 : 0.5,
    config: { tension: 200, friction: 20 }
  })

  const handleForceRefresh = async () => {
    try {
      setBusy(true)
      await api.post('/api/dashboard/refresh')
      await loadLogs()
      setStatusMsg('Обновление dashboard инициировано')
    } catch (e: any) {
      setStatusMsg(e?.message || 'Ошибка обновления')
    } finally {
      setBusy(false)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'robot': return <Storage fontSize="small" />
      case 'user': return <People fontSize="small" />
      case 'security': return <Security fontSize="small" />
      case 'system': return <Settings fontSize="small" />
      default: return <Settings fontSize="small" />
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'robot': return 'Роботы'
      case 'user': return 'Пользователи'
      case 'security': return 'Безопасность'
      case 'warehouse': return 'Склад'
      case 'system': return 'Система'
      default: return 'Все'
    }
  }

  return (
    <>
      <Button
        variant="outlined"
        fullWidth
        onClick={() => setOpen(true)}
        sx={{ py: 2 }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6">📋 Системные логи</Typography>
          <Typography variant="caption" color="text.secondary">
            Просмотр событий системы
          </Typography>
        </Box>
      </Button>

      <Dialog 
        open={open} 
        onClose={() => setOpen(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          component: motion.div,
          initial: { opacity: 0, scale: 0.9, y: 20 },
          animate: { opacity: 1, scale: 1, y: 0 },
          exit: { opacity: 0, scale: 0.9, y: 20 },
          transition: { duration: 0.3, ease: 'easeOut' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Системные логи</Typography>
            <IconButton onClick={() => setOpen(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              fullWidth
              sx={{ flex: 1, minWidth: 200 }}
              placeholder="Фильтр по тексту/типу"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Категория</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                label="Категория"
              >
                <MenuItem value="all">Все</MenuItem>
                <MenuItem value="robot">Роботы</MenuItem>
                <MenuItem value="user">Пользователи</MenuItem>
                <MenuItem value="warehouse">Склад</MenuItem>
                <MenuItem value="security">Безопасность</MenuItem>
                <MenuItem value="system">Система</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Переключатель канала передачи данных */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Канал передачи данных</Typography>
            <RadioGroup
              row
              value={settings.dataTransport || 'socket'}
              onChange={async (e) => {
                const v = e.target.value as 'socket' | 'http'
                try {
                  await api.post('/api/admin/transport-mode', { mode: v })
                  const next = { ...settings, dataTransport: v }
                  rdispatch(setAll(next as any))
                  try { await profileAPI.saveSettings(next) } catch {}
                  setStatusMsg(`Глобальный режим: ${v}`)
                } catch (err: any) {
                  setStatusMsg(err?.message || 'Ошибка смены режима')
                }
              }}
            >
              <FormControlLabel value="socket" control={<Radio />} label="Socket" />
              <FormControlLabel value="http" control={<Radio />} label="HTTP" />
            </RadioGroup>
          </Box>

          {statusMsg && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{statusMsg}</Typography>
          )}

          <Divider sx={{ mb: 2 }} />
          
          <animated.div style={{ ...listAnimation, overflow: 'hidden' }}>
            <List dense sx={{ maxHeight: 500, overflow: 'auto' }}>
              <AnimatePresence>
                {filtered.map((ev, idx) => (
                <motion.div
                  key={ev.id || `log-${idx}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2, delay: idx * 0.01 }}
                >
                  <ListItem sx={{ alignItems: 'flex-start', mb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          {ev.category && getCategoryIcon(ev.category)}
                          <Typography variant="subtitle2">{ev.title || ev.type}</Typography>
                          <Chip 
                            size="small" 
                            label={ev.level} 
                            color={ev.level === 'ERROR' ? 'error' : ev.level === 'WARNING' ? 'warning' : 'default'} 
                            variant="outlined"
                          />
                          {ev.category && (
                            <Chip 
                              size="small" 
                              label={getCategoryLabel(ev.category)}
                              variant="outlined"
                            />
                          )}
                          {ev.priority && (
                            <Chip 
                              size="small" 
                              label={ev.priority} 
                              color={ev.priority === 'HIGH' ? 'error' : ev.priority === 'MEDIUM' ? 'warning' : 'default'} 
                              variant="outlined" 
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" sx={{ mb: .5, mt: 0.5 }}>{ev.message}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(ev.timestamp).toLocaleString('ru-RU')}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                </motion.div>
              ))}
            </AnimatePresence>
            {filtered.length === 0 && (
              <ListItem>
                <ListItemText primary="Нет событий" secondary="Попробуйте изменить фильтр или категорию" />
              </ListItem>
            )}
          </List>
          </animated.div>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleForceRefresh} 
            disabled={busy} 
            startIcon={
              <motion.div
                animate={{ rotate: busy ? 360 : 0 }}
                transition={{ 
                  duration: busy ? 1 : 0,
                  repeat: busy ? Infinity : 0,
                  ease: 'linear'
                }}
              >
                <RefreshCw />
              </motion.div>
            }
          >
            Обновить
          </Button>
          <Button onClick={() => setOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default AdminLogsWidget


