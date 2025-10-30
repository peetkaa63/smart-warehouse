import React from 'react'
import { Paper, Typography, Box, Button, Select, MenuItem, FormControl, InputLabel, List, ListItem, ListItemText, Divider } from '@mui/material'
import api from '../services/api'
import { useEffect } from 'react'
import update from 'immutability-helper';

const RobotTasksPanel: React.FC = () => {
  const [data, setData] = React.useState<{ robotId: string; tasks: any[] }[]>([])
  const [from, setFrom] = React.useState('')
  const [to, setTo] = React.useState('')
  const [newTask, setNewTask] = React.useState<{[key: string]: string}>({});
  const [newTaskPayload, setNewTaskPayload] = React.useState<{[key: string]: string}>({});

  // функция для получения задач робота с peek
  const fetchRobotTasks = async (robotId: string) => {
    const resp = await api.get(`/api/robots/${robotId}/tasks/peek`);
    return resp.data.tasks || [];
  };

  const load = async () => {
    const mode = localStorage.getItem('dataTransport') || 'socket';
    if (mode === 'socket' && window.socket) {
      // запросить актуальные задачи через сокет
      window.socket.emit('request_robot_tasks');
      // при получении от сокета обновить data
      window.socket.off('robot_tasks_update'); // снять предыдущую подписку
      window.socket.on('robot_tasks_update', (tasks: any) => {
        setData(tasks || []);
      });
    } else {
      // получаем список роботов:
      const robotsResp = await api.get('/api/robots');
      const robotList = robotsResp.data?.robots || [];
      const allData = await Promise.all(robotList.map(async (rob: any) => {
        const tasks = await fetchRobotTasks(rob.id);
        return { robotId: rob.id, tasks };
      }));
      setData(allData);
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

  const addTask = async (robotId: string) => {
    if (!newTask[robotId]) return;
    const payload: any = {}; // Явно any для динамических полей
    if (newTask[robotId] === 'move') {
      payload.zone = prompt('Задайте зону (например, A)') || 'A';
      payload.row = Number(prompt('Задайте ряд (например, 1)') || 1);
      payload.shelf = Number(prompt('Задайте полку (например, 1)') || 1);
    }
    await api.post(`/api/robots/${robotId}/tasks/assign`, { taskId: newTask[robotId], payload });
    setNewTask(t => ({ ...t, [robotId]: '' }));
    setNewTaskPayload(t => ({ ...t, [robotId]: '' }));
    await load();
  };
  const deleteAllTasks = async (robotId: string) => {
    await api.post('/api/robots/tasks/reassign', { from: robotId, to: '__trash__' });
    await load();
  };
  const setTask = (robotId: string, task: string) => {
    setNewTask(t => ({ ...t, [robotId]: task }));
  };

  // драг-н-дроп простейший для тасков:
  const moveTask = (robotId: string, dragIndex: number, hoverIndex: number) => {
    const robot = data.find(d => d.robotId === robotId);
    if (!robot) return;
    const updatedTasks = update(robot.tasks, {
      $splice: [
        [dragIndex, 1],
        [hoverIndex, 0, robot.tasks[dragIndex]],
      ],
    });
    setData(arr => arr.map(d => d.robotId === robotId ? { ...d, tasks: updatedTasks } : d));
  };
  const reorderTasks = async (robotId: string, newOrder: any[]) => {
    // Можно реализовать эндпоинт на бэке для reorder списка очереди задач;
    // здесь заглушка: пересоздадим очередь
    await api.post('/api/robots/tasks/reorder', { robotId, tasks: newOrder });
    await load();
  };

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
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Button size="small" onClick={async () => { await api.post(`/api/robots/${group.robotId}/pause`); await load(); }}>Пауза</Button>
              <Button size="small" onClick={async () => { await api.post(`/api/robots/${group.robotId}/resume`); await load(); }}>Продолжить</Button>
              <Button size="small" color="error" onClick={() => deleteAllTasks(group.robotId)}>Удалить задачи</Button>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <FormControl size="small">
                <Select value={newTask[group.robotId] || ''} displayEmpty onChange={e => setTask(group.robotId, e.target.value)}>
                  <MenuItem value="" disabled>Выбрать задачу</MenuItem>
                  <MenuItem value="rescan">Пересканировать локацию</MenuItem>
                  <MenuItem value="move">Поехать в точку</MenuItem>
                  <MenuItem value="custom">Своя команда</MenuItem>
                </Select>
              </FormControl>
              <Button variant="contained" size="small" disabled={!newTask[group.robotId]} onClick={() => addTask(group.robotId)}>Добавить</Button>
            </Box>
            <Divider sx={{ mb: 1 }} />
            <List dense>
              {(group.tasks || []).map((t, idx) => (
                <ListItem key={`${group.robotId}-${idx}`} draggable onDragStart={e => e.dataTransfer.setData('task-idx', String(idx))}
                  onDrop={e => { const drag = Number(e.dataTransfer.getData('task-idx')); moveTask(group.robotId, drag, idx); /* можно сбрасывать порядок через reorderTasks!*/ }}
                  onDragOver={e => e.preventDefault()}>
                  <ListItemText
                    primary={`Задача: ${ruTaskName(t.id || t.type)}`}
                    secondary={t.priority ? `Приоритет: ${t.priority}` : undefined}
                  />
                  <Button size="small" onClick={async () => { /* выполнить сейчас (например, rescan/move) */ await api.post(`/api/robots/${group.robotId}/tasks/assign`, { taskId: t.id, payload: t.payload || {} }); await load(); }}>Выполнить</Button>
                  <Button size="small" color="error" onClick={async () => { await api.post('/api/robots/tasks/delete', { robotId: group.robotId, idx }); await load(); }}>Удалить</Button>
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

// вспомогательная функция
function ruTaskName(taskId: string) {
  switch (taskId) {
    case 'pause': return 'Пауза';
    case 'resume': return 'Продолжить';
    case 'rescan': return 'Пересканировать локацию';
    case 'move': return 'Поехать в точку';
    default: return taskId ? `Кастомная задача: ${taskId}` : '';
  }
}

export default RobotTasksPanel


