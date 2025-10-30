import React from 'react'
import { Paper, Typography, Box, Button, Select, MenuItem, FormControl, InputLabel, List, ListItem, ListItemText, Divider } from '@mui/material'
import api from '../services/api'
import { useEffect } from 'react'

const RobotTasksPanel: React.FC = () => {
  const [data, setData] = React.useState<{ robotId: string; tasks: any[] }[]>([])
  const [from, setFrom] = React.useState('')
  const [to, setTo] = React.useState('')

  const load = async () => {
    const mode = localStorage.getItem('dataTransport') || 'socket';
    if (mode === 'socket' && window.socket) {
      // запросить актуальные задачи через сокет
      window.socket.emit('request_robot_tasks');
      // при получении от сокета обновить data
      window.socket.off('robot_tasks_update'); // снять предыдущую подписку
      window.socket.on('robot_tasks_update', (tasks) => {
        setData(tasks || []);
      });
    } else {
      const resp = await api.get('/api/robots/tasks')
      setData(resp.data?.data || [])
    }
  }

  useEffect(() => {
    load();
    // очистить обработчик при размонтировании
    return () => {
      if (window.socket) window.socket.off('robot_tasks_update');
    }
  }, [])

  const handleReassign = async () => {
    if (!from || !to || from === to) return
    await api.post('/api/robots/tasks/reassign', { from, to })
    await load()
  }

  const robotIds = data.map(d => d.robotId)

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">Задачи роботов</Typography>
        <Button size="small" onClick={load}>Обновить</Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="from-label">От</InputLabel>
          <Select labelId="from-label" value={from} label="От" onChange={e => setFrom(e.target.value)}>
            {robotIds.map(id => <MenuItem key={id} value={id}>{id}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="to-label">К</InputLabel>
          <Select labelId="to-label" value={to} label="К" onChange={e => setTo(e.target.value)}>
            {robotIds.map(id => <MenuItem key={id} value={id}>{id}</MenuItem>)}
          </Select>
        </FormControl>
        <Button variant="outlined" onClick={handleReassign}>Переназначить</Button>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        {data.map(group => (
          <Paper key={group.robotId} sx={{ p: 1 }} variant="outlined">
            <Typography variant="subtitle2" sx={{ mb: 1 }}>{group.robotId}</Typography>
            <Divider sx={{ mb: 1 }} />
            <List dense>
              {(group.tasks || []).map((t, idx) => (
                <ListItem key={`${group.robotId}-${idx}`}>
                  <ListItemText primary={`Задача: ${t.id || t.type}`} secondary={t.priority ? `Приоритет: ${t.priority}` : undefined} />
                </ListItem>
              ))}
              {(!group.tasks || group.tasks.length === 0) && (
                <ListItem><ListItemText primary="Нет задач" /></ListItem>
              )}
            </List>
          </Paper>
        ))}
      </Box>
    </Paper>
  )
}

export default RobotTasksPanel


