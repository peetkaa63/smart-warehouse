import React from 'react'
import { Paper, Typography, Box, Button, Select, MenuItem, FormControl, InputLabel, List, ListItem, ListItemText, Divider, TextField } from '@mui/material'
import { Pause, PlayArrow, DeleteOutline } from '@mui/icons-material'
import api, { pauseRobotUniversal, resumeRobotUniversal } from '../services/api'
import { useEffect, useRef } from 'react';
import update from 'immutability-helper';

const polling = 5000;

const RobotTasksPanel: React.FC = () => {
  const [data, setData] = React.useState<{ robotId: string; tasks: any[]; status?: string }[]>([]);
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [newTask, setNewTask] = React.useState<{[key: string]: string}>({});
  const [newTaskPayload, setNewTaskPayload] = React.useState<{[key: string]: string}>({});
  const [moveParams, setMoveParams] = React.useState<{[key: string]: { zone: string; row: number; shelf: number }}>({});
  const [dragIdx, setDragIdx] = React.useState<{robotId: string, idx: number}|null>(null);
  const timerRef = React.useRef<any>(null);

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
        return { robotId: rob.id, tasks, status: rob.status };
      }));
      setData(allData);
    }
  }

  useEffect(() => {
    const poll = async () => {
      await load();
      timerRef.current = setTimeout(poll, polling);
    };
    poll();
    return () => { clearTimeout(timerRef.current); };
  }, []);

  const handleReassign = async () => {
    if (!from || !to || from === to) return
    await api.post('/api/robots/tasks/reassign', { from, to })
    await load()
  }

  const robotIds = data.map(d => d.robotId)

  const addTask = async (robotId: string) => {
    if (!newTask[robotId]) return;
    const payload: any = {};
    if (newTask[robotId] === 'move' || newTask[robotId] === 'rescan') {
      const p = moveParams[robotId] || { zone: 'A', row: 1, shelf: 1 };
      payload.zone = p.zone;
      payload.row = Number(p.row) || 1;
      payload.shelf = Number(p.shelf) || 1;
    }
    await api.post(`/api/robots/${robotId}/tasks/assign`, { taskId: newTask[robotId], payload });
    setNewTask(t => ({ ...t, [robotId]: '' }));
    setNewTaskPayload(t => ({ ...t, [robotId]: '' }));
    setMoveParams(ms => ({ ...ms, [robotId]: { zone: 'A', row: 1, shelf: 1 } }));
    await load();
  };
  const deleteAllTasks = async (robotId: string) => {
    await api.post('/api/robots/tasks/reassign', { from: robotId, to: '__trash__' });
    await load();
  };
  const setTask = (robotId: string, task: string) => {
    setNewTask(t => ({ ...t, [robotId]: task }));
  };

  const handleDragStart = (robotId: string, idx: number) => {
    setDragIdx({ robotId, idx });
  };
  const handleDragOver = (robotId: string, idx: number, e: React.DragEvent) => {
    e.preventDefault();
  };
  const handleDrop = async (robotId: string, idx: number) => {
    if (!dragIdx) return;
    const robot = data.find(d => d.robotId === robotId);
    if (!robot) return;
    const updated = [...robot.tasks];
    const [moved] = updated.splice(dragIdx.idx, 1);
    updated.splice(idx, 0, moved);
    await api.post('/api/robots/tasks/reorder', { robotId, tasks: updated });
    setDragIdx(null);
    await load();
  };
  const handleDelete = async (robotId: string, idx: number) => {
    await api.post('/api/robots/tasks/delete', { robotId, idx });
    await load();
  }

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
          <Paper key={group.robotId} sx={{ p: 1.5, mb: 2 }} variant="outlined">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">{group.robotId}</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {(group.status !== 'paused') && (
                  <Button size="small" variant="outlined" startIcon={<Pause />} onClick={async () => { await pauseRobotUniversal(group.robotId); await load(); }} title="Пауза">Пауза</Button>
                )}
                {(group.status === 'paused') && (
                  <Button size="small" variant="outlined" startIcon={<PlayArrow />} onClick={async () => { await resumeRobotUniversal(group.robotId); await load(); }} title="Продолжить">Продолжить</Button>
                )}
                <Button size="small" variant="outlined" color="error" startIcon={<DeleteOutline />} onClick={() => deleteAllTasks(group.robotId)} title="Очистить задачи">Очистить</Button>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1, flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <Select value={newTask[group.robotId] || ''} displayEmpty onChange={e => setTask(group.robotId, e.target.value)}>
                  <MenuItem value="" disabled>Выбрать задачу</MenuItem>
                  <MenuItem value="scan_warehouse">Сканировать склад</MenuItem>
                  <MenuItem value="rescan">Пересканировать локацию</MenuItem>
                  <MenuItem value="move">Поехать в точку</MenuItem>
                </Select>
              </FormControl>
              {(newTask[group.robotId] === 'move' || newTask[group.robotId] === 'rescan') && (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', transition: 'all .2s ease' }}>
                  <FormControl size="small" sx={{ minWidth: 80 }}>
                    <InputLabel id={`zone-${group.robotId}`}>Зона</InputLabel>
                    <Select labelId={`zone-${group.robotId}`} label="Зона" value={(moveParams[group.robotId]?.zone) || 'A'} onChange={e => setMoveParams(p => ({ ...p, [group.robotId]: { ...(p[group.robotId] || { zone: 'A', row: 1, shelf: 1 }), zone: String(e.target.value) } }))}>
                      {['A','B','C','D','E'].map(z => <MenuItem key={z} value={z}>{z}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <TextField size="small" type="number" label="Ряд" value={(moveParams[group.robotId]?.row) || 1} onChange={e => setMoveParams(p => ({ ...p, [group.robotId]: { ...(p[group.robotId] || { zone: 'A', row: 1, shelf: 1 }), row: Number(e.target.value) } }))} sx={{ width: 90 }} />
                  <TextField size="small" type="number" label="Полка" value={(moveParams[group.robotId]?.shelf) || 1} onChange={e => setMoveParams(p => ({ ...p, [group.robotId]: { ...(p[group.robotId] || { zone: 'A', row: 1, shelf: 1 }), shelf: Number(e.target.value) } }))} sx={{ width: 100 }} />
                </Box>
              )}
              <Button variant="contained" size="small" disabled={!newTask[group.robotId]} onClick={() => addTask(group.robotId)}>Добавить</Button>
              <Button size="small" variant="outlined" onClick={load}>Обновить</Button>
            </Box>
            <List dense>
              {group.tasks && group.tasks.length ? group.tasks.map((t, idx) => (
                <ListItem key={`${group.robotId}-${idx}`}
                  draggable
                  onDragStart={() => handleDragStart(group.robotId, idx)}
                  onDragOver={e => handleDragOver(group.robotId, idx, e)}
                  onDrop={() => handleDrop(group.robotId, idx)}
                  sx={{ transition: 'transform 0.2s ease, background 0.2s ease', borderRadius: 1, mb: .5, background: dragIdx && dragIdx.idx === idx && dragIdx.robotId === group.robotId ? '#e0f7fa' : '#fafafa', '&:hover': { background: '#f0f7ff' } }}
                >
                  <ListItemText
                    primary={<span style={{ fontWeight: 500 }}>{ruTaskName(t.id || t.type)}</span>}
                    secondary={(t.id === 'move' || t.type === 'move') && t.payload ? `Цель: ${t.payload.zone || t.payload.targetZone}-${t.payload.row || t.payload.targetRow}-${t.payload.shelf || t.payload.targetShelf}` : undefined}
                  />
                  <Button size="small" variant="outlined" color="error" onClick={() => handleDelete(group.robotId, idx)} title="Удалить" startIcon={<DeleteOutline />}>Удалить</Button>
                </ListItem>
              )) : (
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
    case 'scan_warehouse': return 'Сканировать склад';
    case 'pause': return 'Пауза';
    case 'resume': return 'Продолжить';
    case 'rescan': return 'Пересканировать локацию';
    case 'move': return 'Поехать в точку';
    default: return taskId ? `Кастомная задача: ${taskId}` : '';
  }
}

export default RobotTasksPanel


