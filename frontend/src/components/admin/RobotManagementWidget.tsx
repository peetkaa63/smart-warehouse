import React, { useState, useEffect } from 'react';
import {
  Button,
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Alert,
  CircularProgress,
  TextField,
  Chip,
  Tooltip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpring, animated } from '@react-spring/web';
import {
  Add,
  Delete,
  Refresh,
  BatteryChargingFull,
  CalendarToday,
  Check,
  Close,
  Edit,
} from '@mui/icons-material';
import api from '../../services/api';

interface Robot {
  id: string;
  name?: string;
  status: string;
  battery?: number;
  zone?: string;
  last_maintenance?: string;
  next_maintenance?: string;
}

const RobotManagementWidget: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outlined"
        fullWidth
        onClick={() => setOpen(true)}
        sx={{ py: 2 }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6">🤖 Управление роботами</Typography>
          <Typography variant="caption" color="text.secondary">
            Добавление, маршруты, обслуживание
          </Typography>
        </Box>
      </Button>
      <RobotManagementDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
};

const RobotManagementDialog: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const [robots, setRobots] = useState<Robot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<string | null>(null);
  const [maintenanceDate, setMaintenanceDate] = useState('');
  const [newRobot, setNewRobot] = useState({ id: '', name: '', zone: '' });

  const formAnimation = useSpring({
    height: showAddForm ? 'auto' : 0,
    opacity: showAddForm ? 1 : 0,
    config: { tension: 200, friction: 20 }
  });

  const loadRobots = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await api.get('/api/admin/robots');
      setRobots(resp.data?.robots || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка загрузки роботов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadRobots();
    }
  }, [open]);

  const handleAddRobot = async () => {
    if (!newRobot.id.trim()) {
      setError('ID робота обязателен');
      return;
    }
    try {
      await api.post('/api/admin/robots', {
        id: newRobot.id,
        name: newRobot.name || undefined,
        zone: newRobot.zone || undefined,
      });
      setNewRobot({ id: '', name: '', zone: '' });
      setShowAddForm(false);
      await loadRobots();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка добавления робота');
    }
  };

  const handleDeleteRobot = async (id: string) => {
    if (!window.confirm(`Удалить робота ${id}?`)) return;
    try {
      await api.delete(`/api/admin/robots/${id}`);
      await loadRobots();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка удаления робота');
    }
  };

  const handleCharge = async (id: string) => {
    try {
      await api.post(`/api/admin/robots/${id}/charge`);
      await loadRobots();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка отправки на зарядку');
    }
  };

  const handleSaveMaintenance = async (id: string) => {
    if (!maintenanceDate) {
      setError('Укажите дату обслуживания');
      return;
    }
    try {
      await api.post(`/api/admin/robots/${id}/maintenance`, { date: maintenanceDate });
      setEditingMaintenance(null);
      setMaintenanceDate('');
      await loadRobots();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка сохранения даты обслуживания');
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Не назначено';
    try {
      return new Date(dateStr).toLocaleDateString('ru-RU');
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
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
          <Typography variant="h6">Управление роботами</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={loadRobots} disabled={loading} size="small">
              <motion.div
                animate={{ rotate: loading ? 360 : 0 }}
                transition={{ 
                  duration: loading ? 1 : 0,
                  repeat: loading ? Infinity : 0,
                  ease: 'linear'
                }}
              >
                <Refresh />
              </motion.div>
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent>
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1">Список роботов</Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            Добавить робота
          </Button>
        </Box>

        <animated.div style={{ ...formAnimation, overflow: 'hidden' }}>
              <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Новый робот
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                label="ID робота *"
                size="small"
                value={newRobot.id}
                onChange={(e) => setNewRobot({ ...newRobot, id: e.target.value })}
                required
              />
              <TextField
                label="Название"
                size="small"
                value={newRobot.name}
                onChange={(e) => setNewRobot({ ...newRobot, name: e.target.value })}
              />
              <TextField
                label="Зона"
                size="small"
                value={newRobot.zone}
                onChange={(e) => setNewRobot({ ...newRobot, zone: e.target.value })}
              />
              <Button variant="contained" onClick={handleAddRobot}>
                Сохранить
              </Button>
              <Button onClick={() => setShowAddForm(false)}>Отмена              </Button>
            </Box>
          </Paper>
        </animated.div>

        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          </motion.div>
        ) : (
          <motion.div
            key="table-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            layout
          >
            <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Название</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell>Батарея</TableCell>
                  <TableCell>Зона</TableCell>
                  <TableCell>Последнее ТО</TableCell>
                  <TableCell>Следующее ТО</TableCell>
                  <TableCell>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {robots.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        Нет роботов
                      </TableCell>
                    </TableRow>
                  ) : (
                    robots.map((robot, index) => (
                      <TableRow 
                        key={robot.id}
                        component={motion.tr}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                      >
                      <TableCell>{robot.id}</TableCell>
                      <TableCell>{robot.name || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={robot.status}
                          color={robot.status === 'active' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {robot.battery !== undefined ? `${robot.battery}%` : '-'}
                      </TableCell>
                      <TableCell>{robot.zone || '-'}</TableCell>
                      <TableCell>{formatDate(robot.last_maintenance)}</TableCell>
                      <TableCell>
                        {editingMaintenance === robot.id ? (
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <TextField
                              type="date"
                              size="small"
                              value={maintenanceDate}
                              onChange={(e) => setMaintenanceDate(e.target.value)}
                              InputLabelProps={{ shrink: true }}
                              sx={{ width: 150 }}
                            />
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleSaveMaintenance(robot.id)}
                            >
                              <Check />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditingMaintenance(null);
                                setMaintenanceDate('');
                              }}
                            >
                              <Close />
                            </IconButton>
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Typography variant="body2">{formatDate(robot.next_maintenance)}</Typography>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditingMaintenance(robot.id);
                                if (robot.next_maintenance) {
                                  const date = new Date(robot.next_maintenance);
                                  setMaintenanceDate(date.toISOString().split('T')[0]);
                                } else {
                                  setMaintenanceDate('');
                                }
                              }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Отправить на зарядку">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleCharge(robot.id)}
                            >
                              <BatteryChargingFull fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Удалить">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteRobot(robot.id)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                      </TableRow>
                    ))
                  )}
                </AnimatePresence>
              </TableBody>
            </Table>
          </TableContainer>
          </motion.div>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  );
};

export default RobotManagementWidget;
