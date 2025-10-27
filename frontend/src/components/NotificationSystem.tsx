import React, { useEffect, useState } from 'react';
import {
  Alert,
  AlertTitle,
  IconButton,
  Box,
  Typography,
  Button,
  SlideProps,
  Collapse,
  Snackbar,
  Slide
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Notifications as NotificationsIcon,
  MarkEmailRead as MarkReadIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  removeNotification,
  markAsRead,
  markAllAsRead,
  clearExpiredNotifications,
  clearAllNotifications,
  NotificationAction
} from '../store/slices/notificationsSlice';
import { Notification } from '../store/slices/notificationsSlice';

// Расширяем тип Notification из slice для поддержки действий
interface ExtendedNotification extends Notification {
  actions?: NotificationAction[];
  duration?: number;
}

// Анимация для уведомлений
const SlideTransition = (props: SlideProps) => {
  return <Slide {...props} direction="left" />;
};

const NotificationItem: React.FC<{
  notification: ExtendedNotification;
  onClose: (id: string) => void;
  onMarkAsRead: (id: string) => void;
}> = ({ notification, onClose, onMarkAsRead }) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose(notification.id);
    }, 300);
  };

  const handleMarkAsRead = () => {
    onMarkAsRead(notification.id);
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <SuccessIcon />;
      case 'error':
        return <ErrorIcon />;
      case 'warning':
        return <WarningIcon />;
      case 'info':
      default:
        return <InfoIcon />;
    }
  };

  const getSeverity = () => {
    switch (notification.type) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'info';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.8 }}
      transition={{ duration: 0.3, type: 'spring', stiffness: 200 }}
    >
      <Collapse in={isVisible}>
        <Alert
          severity={getSeverity() as any}
          icon={getIcon()}
          action={
            <Box display="flex" alignItems="center" gap={1}>
              {!notification.read && (
                <IconButton
                  size="small"
                  onClick={handleMarkAsRead}
                  title="Отметить как прочитанное"
                >
                  <MarkReadIcon fontSize="small" />
                </IconButton>
              )}
              <IconButton
                size="small"
                onClick={handleClose}
                title="Закрыть"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          }
          sx={{
            mb: 1,
            boxShadow: 3,
            borderRadius: 2,
            maxWidth: 400,
            '& .MuiAlert-message': {
              width: '100%'
            }
          }}
        >
          <AlertTitle sx={{ fontWeight: 'bold' }}>
            {notification.title}
          </AlertTitle>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            {notification.message}
          </Typography>
          
          {notification.actions && notification.actions.length > 0 && (
            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {notification.actions.map((action: NotificationAction, index: number) => (
                <Button
                  key={index}
                  size="small"
                  variant={action.variant === 'danger' ? 'contained' : 'outlined'}
                  color={action.variant === 'danger' ? 'error' : 'primary'}
                  onClick={action.action}
                >
                  {action.label}
                </Button>
              ))}
            </Box>
          )}
        </Alert>
      </Collapse>
    </motion.div>
  );
};

const NotificationSystem: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: notifications, unreadCount } = useSelector((state: RootState) => state.notifications);
  const [open, setOpen] = useState(false);

  // Очистка истекших уведомлений каждые 30 секунд
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(clearExpiredNotifications());
    }, 30000);

    return () => clearInterval(interval);
  }, [dispatch]);

  // Автоматическое закрытие уведомлений с duration
  useEffect(() => {
    notifications.forEach((notification: Notification) => {
      // Приводим к расширенному типу для доступа к duration
      const extendedNotification = notification as ExtendedNotification;
      if (extendedNotification.duration && extendedNotification.duration > 0) {
        setTimeout(() => {
          dispatch(removeNotification(notification.id));
        }, extendedNotification.duration);
      }
    });
  }, [notifications, dispatch]);

  const handleClose = (id: string) => {
    dispatch(removeNotification(id));
  };

  const handleMarkAsRead = (id: string) => {
    dispatch(markAsRead(id));
  };

  const handleMarkAllAsRead = () => {
    dispatch(markAllAsRead());
  };

  const handleClearAll = () => {
    dispatch(clearAllNotifications());
  };

  // Показываем только непрочитанные уведомления
  const unreadNotifications = notifications.filter((n: Notification) => !n.read);

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 9999,
        maxHeight: '80vh',
        overflow: 'auto',
        '&::-webkit-scrollbar': {
          width: '6px'
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent'
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '3px'
        }
      }}
    >
      {/* Заголовок с количеством уведомлений */}
      {unreadCount > 0 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
            p: 1,
            backgroundColor: 'background.paper',
            borderRadius: 1,
            boxShadow: 1
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <NotificationsIcon color="primary" />
            <Typography variant="subtitle2" fontWeight="bold">
              Уведомления ({unreadCount})
            </Typography>
          </Box>
          
          <Box display="flex" gap={1}>
            <Button
              size="small"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
            >
              Прочитать все
            </Button>
            <Button
              size="small"
              onClick={handleClearAll}
              color="error"
            >
              Очистить
            </Button>
          </Box>
        </Box>
      )}

      {/* Список уведомлений */}
      <AnimatePresence>
        {unreadNotifications.map((notification: Notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification as ExtendedNotification}
            onClose={handleClose}
            onMarkAsRead={handleMarkAsRead}
          />
        ))}
      </AnimatePresence>
    </Box>
  );
};

export default NotificationSystem;