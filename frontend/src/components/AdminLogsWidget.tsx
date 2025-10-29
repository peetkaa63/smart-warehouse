import React from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../store'
import { Box, Paper, Typography, Divider, List, ListItem, ListItemText, Chip, Button, TextField, Stack, RadioGroup, FormControlLabel, Radio } from '@mui/material'
import { useDispatch as useReduxDispatch } from 'react-redux'
import { setAll } from '../store/slices/notificationSettingsSlice'
import { profileAPI } from '../services/api'
import api from '../services/api'

const AdminLogsWidget: React.FC = () => {
  const { items: notifications } = useSelector((state: RootState) => state.notifications)
  const [filter, setFilter] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [statusMsg, setStatusMsg] = React.useState<string | null>(null)
  const settings = useSelector((state: RootState) => state.notificationSettings)
  const rdispatch = useReduxDispatch()

  const [logs, setLogs] = React.useState<any[]>([])

  React.useEffect(() => {
    (async () => {
      try {
        const resp = await api.get('/api/admin/logs')
        setLogs(resp.data?.data || [])
      } catch {}
    })()
  }, [])

  const allItems = React.useMemo(() => {
    // Смешиваем логи и уведомления как «события»
    const notifItems = (notifications || []).map((n: any) => ({ ts: n.timestamp, level: 'INFO', message: `${n.type}: ${n.title} - ${n.message}` }))
    return [...logs, ...notifItems].sort((a: any, b: any) => String(b.ts).localeCompare(String(a.ts)))
  }, [logs, notifications])

  const filtered = React.useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return allItems.slice(0, 50)
    return allItems.filter((n: any) =>
      (n.message || '').toLowerCase().includes(q) ||
      (n.level || '').toLowerCase().includes(q)
    ).slice(0, 50)
  }, [allItems, filter])

  const handleForceRefresh = async () => {
    try {
      setBusy(true)
      await api.post('/api/dashboard/refresh')
      setStatusMsg('Обновление dashboard инициировано')
    } catch (e: any) {
      setStatusMsg(e?.message || 'Ошибка обновления')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Админ: последние события</Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" onClick={handleForceRefresh} disabled={busy}>Обновить дашборд</Button>
        </Stack>
      </Box>

      <TextField
        size="small"
        fullWidth
        placeholder="Фильтр по тексту/типу"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        sx={{ mb: 2 }}
      />

      {/* Переключатель канала передачи данных (только для админов) */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Канал передачи данных</Typography>
        <RadioGroup
          row
          defaultValue={settings.dataTransport || 'socket'}
          onChange={async (e) => {
            const v = e.target.value as 'socket' | 'http'
            try {
              await api.post('/api/admin/transport-mode', { mode: v })
              // локально обновим UI
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

      <Divider sx={{ mb: 1 }} />
      <List dense>
        {filtered.map(ev => (
          <ListItem key={ev.id} sx={{ alignItems: 'flex-start' }}>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="subtitle2">{ev.title}</Typography>
                  <Chip size="small" label={ev.type} />
                  <Chip size="small" label={ev.priority} color={ev.priority === 'HIGH' ? 'error' : ev.priority === 'MEDIUM' ? 'warning' : 'default'} variant="outlined" />
                </Box>
              }
              secondary={
                <>
                  <Typography variant="body2" sx={{ mb: .5 }}>{ev.message}</Typography>
                  <Typography variant="caption" color="text.secondary">{new Date(ev.timestamp).toLocaleString('ru-RU')}</Typography>
                </>
              }
            />
          </ListItem>
        ))}
        {filtered.length === 0 && (
          <ListItem>
            <ListItemText primary="Нет событий" secondary="Попробуйте изменить фильтр" />
          </ListItem>
        )}
      </List>
    </Paper>
  )
}

export default AdminLogsWidget


