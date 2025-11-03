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
  Switch,
  FormControlLabel,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpring, animated } from '@react-spring/web';
import {
  Add,
  Refresh,
  Check,
  Close,
  Block,
  PersonAdd,
  Edit,
} from '@mui/icons-material';
import api from '../../services/api';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  blocked: boolean;
}

const UserManagementWidget: React.FC = () => {
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
          <Typography variant="h6">👥 Управление пользователями</Typography>
          <Typography variant="caption" color="text.secondary">
            Создание, роли, блокировка
          </Typography>
        </Box>
      </Button>
      <UserManagementDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
};

const UserManagementDialog: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRole, setEditingRole] = useState<number | null>(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'operator',
  });
  const [roleValues, setRoleValues] = useState<{ [key: number]: string }>({});

  const formAnimation = useSpring({
    height: showAddForm ? 'auto' : 0,
    opacity: showAddForm ? 1 : 0,
    config: { tension: 200, friction: 20 }
  });

  // Animated MUI Box wrapper to satisfy TS types
  const AnimatedBox = animated(Box as any);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await api.get('/api/admin/users');
      setUsers(resp.data?.users || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open]);

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      setError('Заполните все обязательные поля');
      return;
    }
    if (newUser.password.length < 8) {
      setError('Пароль должен быть не менее 8 символов');
      return;
    }
    try {
      await api.post('/api/admin/users', newUser);
      setNewUser({ name: '', email: '', password: '', role: 'operator' });
      setShowAddForm(false);
      await loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка создания пользователя');
    }
  };

  const handleUpdateRole = async (userId: number, role: string) => {
    try {
      await api.put(`/api/admin/users/${userId}/role`, { role });
      setEditingRole(null);
      await loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка обновления роли');
    }
  };

  const handleToggleBlock = async (userId: number, blocked: boolean) => {
    try {
      await api.put(`/api/admin/users/${userId}/block`, { blocked });
      await loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка изменения статуса блокировки');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'manager':
        return 'warning';
      case 'operator':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Администратор';
      case 'manager':
        return 'Менеджер';
      case 'operator':
        return 'Оператор';
      default:
        return role;
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
          <Typography variant="h6">Управление пользователями</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={loadUsers} disabled={loading} size="small">
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
          <Typography variant="subtitle1">Список пользователей</Typography>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            Создать пользователя
          </Button>
        </Box>

        <AnimatedBox style={{ ...formAnimation, overflow: 'hidden' }}>
              <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Новый пользователь
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Имя *"
                size="small"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="Email *"
                type="email"
                size="small"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="Пароль * (мин. 8 символов)"
                type="password"
                size="small"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                required
                fullWidth
              />
              <FormControl fullWidth size="small">
                <InputLabel>Роль</InputLabel>
                <Select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  label="Роль"
                >
                  <MenuItem value="operator">Оператор</MenuItem>
                  <MenuItem value="manager">Менеджер</MenuItem>
                  <MenuItem value="admin">Администратор</MenuItem>
                </Select>
              </FormControl>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" onClick={handleAddUser}>
                  Создать
                </Button>
                <Button onClick={() => setShowAddForm(false)}>Отмена</Button>
              </Box>
            </Box>
          </Paper>
        </AnimatedBox>

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
                  <TableCell>Имя</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Роль</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        Нет пользователей
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user, index) => (
                      <TableRow 
                        key={user.id}
                        component={motion.tr}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                      >
                      <TableCell>{user.id}</TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {editingRole === user.id ? (
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <FormControl size="small" sx={{ minWidth: 150 }}>
                              <Select
                                value={roleValues[user.id] || user.role}
                                onChange={(e) =>
                                  setRoleValues({ ...roleValues, [user.id]: e.target.value })
                                }
                              >
                                <MenuItem value="operator">Оператор</MenuItem>
                                <MenuItem value="manager">Менеджер</MenuItem>
                                <MenuItem value="admin">Администратор</MenuItem>
                              </Select>
                            </FormControl>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() =>
                                handleUpdateRole(user.id, roleValues[user.id] || user.role)
                              }
                            >
                              <Check />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditingRole(null);
                                setRoleValues({ ...roleValues, [user.id]: user.role });
                              }}
                            >
                              <Close />
                            </IconButton>
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Chip
                              label={getRoleLabel(user.role)}
                              color={getRoleColor(user.role) as any}
                              size="small"
                            />
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditingRole(user.id);
                                setRoleValues({ ...roleValues, [user.id]: user.role });
                              }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={!user.blocked}
                              onChange={(e) => handleToggleBlock(user.id, !e.target.checked)}
                              size="small"
                            />
                          }
                          label={user.blocked ? 'Заблокирован' : 'Активен'}
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title={user.blocked ? 'Разблокировать' : 'Заблокировать'}>
                          <IconButton
                            size="small"
                            color={user.blocked ? 'success' : 'error'}
                            onClick={() => handleToggleBlock(user.id, !user.blocked)}
                          >
                            <Block fontSize="small" />
                          </IconButton>
                        </Tooltip>
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

export default UserManagementWidget;
