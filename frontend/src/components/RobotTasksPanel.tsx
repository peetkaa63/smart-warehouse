import React from 'react'
import { Paper, Typography, Box, Button, Select, MenuItem, FormControl, InputLabel, List, ListItem, ListItemText, Divider, TextField, useTheme, CircularProgress, IconButton } from '@mui/material'
import { Pause, PlayArrow, DeleteOutline, Refresh } from '@mui/icons-material'
import api, { pauseRobotUniversal, resumeRobotUniversal } from '../services/api'
import { socketService } from '../services/socketService'
import { useEffect, useRef } from 'react';
import update from 'immutability-helper';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable'
import { motion, AnimatePresence } from 'framer-motion'

// Sortable task item component
type SortableTaskProps = { id: string; primary: string; secondary?: string; onDelete: () => void }
const SortableTask: React.FC<SortableTaskProps> = ({ id, primary, secondary, onDelete }) => {
  const theme = useTheme();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const isDark = theme.palette.mode === 'dark';
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    background: isDragging 
      ? (isDark ? 'rgba(224, 247, 250, 0.2)' : '#e0f7fa')
      : (isDark ? theme.palette.background.paper : '#fafafa'),
    borderRadius: 4,
    marginBottom: 4,
    // Фиксированная высота при перетаскивании, чтобы размер не менялся
    minHeight: isDragging ? '48px' : undefined,
    height: isDragging ? '48px' : undefined
  }
  return (
    <ListItem 
      ref={setNodeRef} 
      style={style} 
      {...attributes}
      sx={{ 
        '&:hover': { 
          background: isDark ? 'rgba(240, 247, 255, 0.2)' : '#f0f7ff' 
        } 
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
        <Box 
          {...listeners} 
          sx={{ 
            flex: 1, 
            cursor: 'grab',
            '&:active': { cursor: 'grabbing' }
          }}
        >
          <ListItemText primary={<span style={{ fontWeight: 500 }}>{primary}</span>} secondary={secondary} />
        </Box>
        <Button 
          size="small" 
          variant="outlined" 
          color="error" 
          onClick={(e) => {
            console.log('🚨🚨🚨 DELETE_BUTTON_CLICKED 🚨🚨🚨', { id, primary });
            console.log('🚨 DELETE_BUTTON_CLICKED - Event:', e);
            e.preventDefault();
            e.stopPropagation();
            console.log('🚨 DELETE_BUTTON_CLICKED - Calling onDelete callback');
            onDelete();
            console.log('🚨 DELETE_BUTTON_CLICKED - onDelete called');
          }}
          onMouseDown={(e) => {
            console.log('🚨 DELETE_BUTTON_MOUSEDOWN 🚨');
            e.stopPropagation();
          }}
          title="Удалить" 
          startIcon={<DeleteOutline />}
        >
          Удалить
        </Button>
      </Box>
    </ListItem>
  )
}

const polling = 5000;

const RobotTasksPanel: React.FC = () => {
  const [data, setData] = React.useState<{ robotId: string; tasks: any[]; status?: string }[]>([]);
  const dataRef = React.useRef<{ robotId: string; tasks: any[]; status?: string }[]>([]);
  const [leavingMap, setLeavingMap] = React.useState<{ [robotId: string]: number[] }>({});
  const assignedDefaultRef = React.useRef<{[robotId: string]: boolean}>({});
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [newTask, setNewTask] = React.useState<{[key: string]: string}>({});
  const [newTaskPayload, setNewTaskPayload] = React.useState<{[key: string]: string}>({});
  const [moveParams, setMoveParams] = React.useState<{[key: string]: { zone: string; row: number; shelf: number }}>({});
  const [dragIdx, setDragIdx] = React.useState<{robotId: string, idx: number}|null>(null);
  const [loading, setLoading] = React.useState(false);
  const [initialLoad, setInitialLoad] = React.useState(true);
  const timerRef = React.useRef<any>(null);

  // функция для получения задач робота с peek
  const fetchRobotTasks = async (robotId: string) => {
    const resp = await api.get(`/api/robots/${robotId}/tasks/peek`);
    return resp.data.tasks || [];
  };

  const load = async () => {
    setLoading(true);
    const mode = localStorage.getItem('dataTransport') || 'socket';
    if (mode === 'socket' && socketService.isConnected()) {
      // Также получаем статусы роботов отдельно
      const robotsResp = await api.get('/api/robots');
      const robotStatusMap = new Map((robotsResp.data?.robots || []).map((rob: any) => [rob.id, rob.status]));
      
      // запросить актуальные задачи через сокет
      socketService.requestRobotTasks();
      
      // при получении от сокета обновить data
      socketService.offRobotTasksUpdate(); // снять предыдущую подписку
      socketService.onRobotTasksUpdate(async (tasks: any) => {
        // Получаем актуальные статусы роботов каждый раз
        const robotsResp = await api.get('/api/robots');
        const currentRobotStatusMap = new Map((robotsResp.data?.robots || []).map((rob: any) => [rob.id, rob.status]));
        
        const prev = dataRef.current || [];
        const next = (tasks || []).filter((g: any) => g.robotId !== '__trash__' && g.robotId !== '_trash_').map((g: any) => ({
          ...g,
          status: currentRobotStatusMap.get(g.robotId) || g.status || 'active'
        }));
        const toLeave: { [robotId: string]: number[] } = {};
        // ищем уменьшившиеся списки задач — анимируем удаление
        next.forEach((group: any) => {
          const prevGroup = prev.find(p => p.robotId === group.robotId);
          if (prevGroup) {
            const removedIndices: number[] = [];
            const prevTasks = prevGroup.tasks || [];
            const currTasks = group.tasks || [];
            prevTasks.forEach((t: any, idx: number) => {
              const signature = JSON.stringify({ id: t.id || t.type, payload: t.payload });
              const stillExists = currTasks.some((ct: any) => JSON.stringify({ id: ct.id || ct.type, payload: ct.payload }) === signature);
              if (!stillExists) removedIndices.push(idx);
            });
            if (removedIndices.length) toLeave[group.robotId] = removedIndices;
          }
        });

        // Убрали автодобавление дефолтной задачи на клиенте.
        // Инициализацию стартовой задачи выполняет сервер при запуске.

        if (Object.keys(toLeave).length) {
          setLeavingMap(toLeave);
          // даём анимации завершиться, затем устанавливаем новые данные
          setTimeout(() => {
            dataRef.current = next;
            setData(next);
            setLeavingMap({});
            setLoading(false);
            setInitialLoad(false);
          }, 250);
        } else {
          dataRef.current = next;
          setData(next);
          setLoading(false);
          setInitialLoad(false);
        }
      });
    } else {
      // получаем список роботов:
      const robotsResp = await api.get('/api/robots');
      const robotList = robotsResp.data?.robots || [];
      const allData = await Promise.all(robotList.map(async (rob: any) => {
        const tasks = await fetchRobotTasks(rob.id);
        // Убеждаемся что статус берется из API роботов
        return { robotId: rob.id, tasks, status: rob.status || 'active' };
      }));
      setData(allData);
      dataRef.current = allData;
      setLoading(false);
      setInitialLoad(false);
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
    console.log(`[DELETE ALL TASKS] Starting deletion for robot: ${robotId}`);
    try {
      const response = await api.post('/api/robots/tasks/reassign', { from: robotId, to: '__trash__' });
      console.log(`[DELETE ALL TASKS] API response:`, response.data);
      await load();
    } catch (error: any) {
      console.error('[DELETE ALL TASKS] Error:', error);
      console.error('[DELETE ALL TASKS] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  };
  const setTask = (robotId: string, task: string) => {
    setNewTask(t => ({ ...t, [robotId]: task }));
  };

  const onDragEnd = (robotId: string) => async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const robot = data.find(d => d.robotId === robotId);
    if (!robot) return;
    const oldIndex = robot.tasks.findIndex((_: any, i: number) => `task-${i}` === active.id);
    const newIndex = robot.tasks.findIndex((_: any, i: number) => `task-${i}` === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const updated = arrayMove(robot.tasks, oldIndex, newIndex);
    await api.post('/api/robots/tasks/reorder', { robotId, tasks: updated });
    await load();
  };

  const handleDelete = async (robotId: string, idx: number) => {
    console.log('🚨🚨🚨 DELETE_TASK_HANDLER_START 🚨🚨🚨', { robotId, idx });
    console.log('🚨 DELETE_TASK_HANDLER_START - robotId:', robotId, 'idx:', idx);
    
    // Получаем задачу для удаления
    const group = data.find(d => d.robotId === robotId);
    if (!group || !group.tasks || idx < 0 || idx >= group.tasks.length) {
      console.warn('🚨 DELETE_TASK_HANDLER - Invalid parameters:', { 
        group: !!group, 
        tasksLength: group?.tasks?.length, 
        idx 
      });
      return;
    }
    
    const taskToDelete = group.tasks[idx];
    console.log('🚨 DELETE_TASK_HANDLER - Task to delete:', taskToDelete);
    
    // Помечаем задачу для анимации удаления (задача остается в массиве до завершения анимации!)
    setLeavingMap(m => ({ ...m, [robotId]: Array.from(new Set([...(m[robotId] || []), idx])) }));
    
    // Вызываем API для удаления на сервере сразу (анимация происходит независимо)
    setTimeout(async () => {
      try {
        console.log('🚨 DELETE_TASK_HANDLER - Calling API: POST /api/robots/tasks/delete', { robotId, idx });
        const response = await api.post('/api/robots/tasks/delete', { robotId, idx });
        console.log('🚨 DELETE_TASK_HANDLER - API response:', response.data);
        
        // В socket режиме обновление придет через socket
        const mode = localStorage.getItem('dataTransport') || 'socket';
        if (mode === 'socket' && socketService.isConnected()) {
          console.log('🚨 DELETE_TASK_HANDLER - Requesting robot tasks update via socket');
          socketService.requestRobotTasks();
        } else {
          // В HTTP режиме загружаем обновленные данные после небольшой задержки для завершения анимации
          console.log('🚨 DELETE_TASK_HANDLER - Reloading data after delay');
          setTimeout(() => {
            console.log('🚨 DELETE_TASK_HANDLER - Executing load() for HTTP mode');
            load();
          }, 300);
        }
      } catch (error: any) {
        console.error('🚨 DELETE_TASK_HANDLER - ERROR deleting task:', error);
        console.error('🚨 DELETE_TASK_HANDLER - Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          config: { url: error.config?.url, method: error.config?.method }
        });
        // В случае ошибки восстанавливаем задачу
        setLeavingMap(m => {
          const newMap = { ...m };
          if (newMap[robotId]) {
            newMap[robotId] = newMap[robotId].filter(i => i !== idx);
            if (newMap[robotId].length === 0) {
              delete newMap[robotId];
            }
          }
          return newMap;
        });
        await load();
      }
    }, 50);
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">Задачи роботов</Typography>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <IconButton size="small" disabled>
                <CircularProgress size={20} />
              </IconButton>
            </motion.div>
          ) : (
            <motion.div
              key="refresh"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <Button size="small" onClick={load} startIcon={<Refresh />}>Обновить</Button>
            </motion.div>
          )}
        </AnimatePresence>
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
          <motion.div 
            layout 
            key={`group-wrap-${group.robotId}`}
            initial={initialLoad ? { opacity: 0, scale: 0.9 } : false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
          <Paper sx={{ p: 1.5, mb: 2 }} variant="outlined">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">{group.robotId}</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {(group.status !== 'paused') && (
                  <Button size="small" variant="outlined" startIcon={<Pause />} onClick={async () => { 
                    // Оптимистично обновляем статус сразу
                    setData(prev => prev.map(item => 
                      item.robotId === group.robotId ? { ...item, status: 'paused' } : item
                    ));
                    dataRef.current = dataRef.current.map(item => 
                      item.robotId === group.robotId ? { ...item, status: 'paused' } : item
                    );
                    await pauseRobotUniversal(group.robotId); 
                    try { socketService.requestDashboardUpdate(); } catch {}; 
                    await load(); 
                  }} title="Пауза">Пауза</Button>
                )}
                {(group.status === 'paused') && (
                  <Button size="small" variant="outlined" startIcon={<PlayArrow />} onClick={async () => { 
                    // Оптимистично обновляем статус сразу
                    setData(prev => prev.map(item => 
                      item.robotId === group.robotId ? { ...item, status: 'active' } : item
                    ));
                    dataRef.current = dataRef.current.map(item => 
                      item.robotId === group.robotId ? { ...item, status: 'active' } : item
                    );
                    await resumeRobotUniversal(group.robotId); 
                    try { socketService.requestDashboardUpdate(); } catch {}; 
                    await load(); 
                  }} title="Продолжить">Продолжить</Button>
                )}
                <Button size="small" variant="outlined" color="error" startIcon={<DeleteOutline />} onClick={async () => {
                  const allIdx = (group.tasks || []).map((_: any, i: number) => i);
                  setLeavingMap(m => ({ ...m, [group.robotId]: allIdx }));
                  setTimeout(async () => { await deleteAllTasks(group.robotId); }, 220);
                }} title="Очистить задачи">Очистить</Button>
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
              <div style={{
                transition: 'opacity .3s ease',
                opacity: (newTask[group.robotId] === 'move' || newTask[group.robotId] === 'rescan') ? 1 : 0,
                height: (newTask[group.robotId] === 'move' || newTask[group.robotId] === 'rescan') ? 'auto' : 0,
                pointerEvents: (newTask[group.robotId] === 'move' || newTask[group.robotId] === 'rescan') ? 'auto' : 'none'
              }}>
                {(newTask[group.robotId] === 'move' || newTask[group.robotId] === 'rescan') && (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', transition: 'all .2s ease' }}>
                  <FormControl size="small" sx={{ minWidth: 80, '& .MuiInputLabel-root': { overflow: 'visible', whiteSpace: 'nowrap' } }}>
                    <InputLabel id={`zone-${group.robotId}`} sx={{ overflow: 'visible' }}>Зона</InputLabel>
                    <Select labelId={`zone-${group.robotId}`} label="Зона" value={(moveParams[group.robotId]?.zone) || 'A'} onChange={e => setMoveParams(p => ({ ...p, [group.robotId]: { ...(p[group.robotId] || { zone: 'A', row: 1, shelf: 1 }), zone: String(e.target.value) } }))}>
                      {['A','B','C','D','E'].map(z => <MenuItem key={z} value={z}>{z}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <TextField 
                    size="small" 
                    type="number" 
                    label="Ряд" 
                    value={(moveParams[group.robotId]?.row) || 1} 
                    onChange={e => setMoveParams(p => ({ ...p, [group.robotId]: { ...(p[group.robotId] || { zone: 'A', row: 1, shelf: 1 }), row: Number(e.target.value) } }))} 
                    sx={{ 
                      width: 90,
                      '& .MuiInputLabel-root': { overflow: 'visible', whiteSpace: 'nowrap' }
                    }} 
                  />
                  <TextField 
                    size="small" 
                    type="number" 
                    label="Полка" 
                    value={(moveParams[group.robotId]?.shelf) || 1} 
                    onChange={e => setMoveParams(p => ({ ...p, [group.robotId]: { ...(p[group.robotId] || { zone: 'A', row: 1, shelf: 1 }), shelf: Number(e.target.value) } }))} 
                    sx={{ 
                      width: 100,
                      '& .MuiInputLabel-root': { overflow: 'visible', whiteSpace: 'nowrap' }
                    }} 
                  />
                </Box>
                )}
              </div>
              <Button variant="contained" size="small" disabled={!newTask[group.robotId]} onClick={() => addTask(group.robotId)}>Добавить</Button>
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="loading-small"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    style={{ display: 'inline-flex', alignItems: 'center' }}
                  >
                    <IconButton size="small" disabled>
                      <CircularProgress size={16} />
                    </IconButton>
                  </motion.div>
                ) : (
                  <motion.div
                    key="refresh-small"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button size="small" variant="outlined" onClick={load} startIcon={<Refresh />}>Обновить</Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </Box>
            <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd(group.robotId)}>
              <SortableContext items={(group.tasks || []).map((_: any, i: number) => `task-${i}`)} strategy={verticalListSortingStrategy}>
                <List dense sx={{ overflow: 'visible' }}>
                  <AnimatePresence initial={false}>
                  {group.tasks && group.tasks.length ? group.tasks.map((t, idx) => {
                    const isLeaving = leavingMap[group.robotId]?.includes(idx);
                    // Используем уникальный ключ на основе данных задачи БЕЗ индекса для стабильности
                    const taskSignature = JSON.stringify({ id: t.id || t.type, payload: t.payload });
                    const taskKey = `${group.robotId}-${taskSignature}`;
                    
                    // Пропускаем отрисовку удаляемых задач, но они остаются в массиве для анимации exit
                    if (isLeaving) {
                      return (
                        <motion.div
                          key={taskKey}
                          initial={{ opacity: 1, x: 0, height: 'auto' }}
                          animate={{ opacity: 0, x: 20, height: 0 }}
                          exit={{ opacity: 0, x: 20, height: 0 }}
                          transition={{ duration: 0.22, ease: 'easeInOut' }}
                          onAnimationComplete={() => {
                            // После завершения анимации удаляем задачу из массива
                            setData(prev => prev.map(g => {
                              if (g.robotId === group.robotId) {
                                const newTasks = [...(g.tasks || [])];
                                const taskToRemove = newTasks.findIndex((task: any) => {
                                  const sig = JSON.stringify({ id: task.id || task.type, payload: task.payload });
                                  return sig === taskSignature;
                                });
                                if (taskToRemove >= 0) {
                                  newTasks.splice(taskToRemove, 1);
                                }
                                return { ...g, tasks: newTasks };
                              }
                              return g;
                            }));
                            // Убираем из leavingMap
                            setLeavingMap(m => {
                              const newMap = { ...m };
                              if (newMap[group.robotId]) {
                                newMap[group.robotId] = newMap[group.robotId].filter(i => i !== idx);
                                if (newMap[group.robotId].length === 0) {
                                  delete newMap[group.robotId];
                                }
                              }
                              return newMap;
                            });
                          }}
                          style={{ overflow: 'hidden' }}
                        >
                          <SortableTask
                            id={`task-${idx}`}
                            onDelete={() => {}}
                            primary={ruTaskName(t.id || t.type)}
                            secondary={(t.id === 'move' || t.type === 'move') && t.payload ? `Цель: ${t.payload.zone || t.payload.targetZone}-${t.payload.row || t.payload.targetRow}-${t.payload.shelf || t.payload.targetShelf}` : undefined}
                          />
                        </motion.div>
                      );
                    }
                    
                    return (
                      <motion.div
                        key={taskKey}
                        layout="position"
                        initial={{ opacity: 0, x: -8, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95 }}
                        transition={{ 
                          layout: { duration: 0.3, ease: 'easeInOut' },
                          opacity: { duration: 0.22 },
                          scale: { duration: 0.22 }
                        }}
                        style={{ overflow: 'visible', height: 'auto', position: 'relative', zIndex: 1 }}
                      >
                        <SortableTask
                          id={`task-${idx}`}
                          onDelete={() => {
                            console.log('🚨🚨🚨 DELETE_CALLBACK_TRIGGERED 🚨🚨🚨', { robotId: group.robotId, idx, task: t });
                            handleDelete(group.robotId, idx);
                          }}
                          primary={ruTaskName(t.id || t.type)}
                          secondary={(t.id === 'move' || t.type === 'move') && t.payload ? `Цель: ${t.payload.zone || t.payload.targetZone}-${t.payload.row || t.payload.targetRow}-${t.payload.shelf || t.payload.targetShelf}` : undefined}
                        />
                      </motion.div>
                    );
                  }) : (
                    <ListItem key={`empty-${group.robotId}`}><ListItemText primary="Нет задач" /></ListItem>
                  )}
                  </AnimatePresence>
                </List>
              </SortableContext>
            </DndContext>
          </Paper>
          </motion.div>
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