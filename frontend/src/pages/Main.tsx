import React, { useState, useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate, useLocation } from "react-router-dom"
import {
  Box,
  AppBar,
  Toolbar,
  Button,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  Badge,
  Typography,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  ListItemButton,
  Alert,
  BottomNavigation,
  BottomNavigationAction,
} from "@mui/material"
import {
  AccountCircle,
  Logout,
  Wifi,
  WifiOff,
  Notifications,
  Dashboard as DashboardIcon,
  History as HistoryIcon,
  Upload,
  Close,
  Warning,
  BatteryAlert,
  TrendingUp
} from "@mui/icons-material"
import { motion, AnimatePresence } from "framer-motion"
import { RootState, AppDispatch } from '../store'
import { logout } from '../store/slices/authSlice'
import { useWebSocket } from '../hooks/useWebSocket'
import Dashboard from './Dashboard'
import History from './History'
import Profile from './Profile'
import UploadCSVModal from '../components/UploadCSVModal'
import { markAsRead, markAllAsRead, removeNotification, clearAllNotifications } from '../store/slices/notificationsSlice'
import { setMapFocus } from '../store/slices/mapFocusSlice'
import notificationSocketService from '../services/notificationSocketService'
import { useSelector as useReduxSelector } from 'react-redux'
import api from '../services/api'

type TabType = "dashboard" | "history" | "profile"

const logoAnimation = {
  initial: { scale: 0, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
  },
  exit: { 
    scale: 0, 
    opacity: 0,
  }
}

const appBarAnimation = {
  initial: { y: -100, opacity: 0 },
  animate: { 
    y: 0, 
    opacity: 1,
  },
  exit: { 
    y: -100, 
    opacity: 0,
  }
}

const contentAnimation = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
  },
  exit: { 
    opacity: 0,
  }
}

const Main: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))

  const { user } = useSelector((state: RootState) => state.auth)
  const { items: notifications, unreadCount } = useSelector((state: RootState) => state.notifications)
  const exportState = useReduxSelector((state: RootState) => (state as any).export)
  const wsConnected = useWebSocket()

  const [showInitialAnimation, setShowInitialAnimation] = useState(true)
  const [showContent, setShowContent] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Определяем активную вкладку на основе текущего URL
  const getActiveTabFromPath = (pathname: string): TabType => {
    if (pathname.includes('/history')) return 'history'
    if (pathname.includes('/profile')) return 'profile'
    return 'dashboard'
  }

  const [activeTab, setActiveTab] = useState<TabType>(getActiveTabFromPath(location.pathname))
  const [prevTab, setPrevTab] = useState<TabType | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [notificationsDrawerOpen, setNotificationsDrawerOpen] = useState(false)
  const [mobileBottomValue, setMobileBottomValue] = useState<string>('dashboard')
  const [profileSheetOpen, setProfileSheetOpen] = useState(false)
  const [alert, setAlert] = useState<{ type: "success" | "error" | "warning" | "info"; message: string } | null>(null)

  const handleLogout = React.useCallback(() => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    setShowContent(false)
    
    // Отключаем уведомления при выходе
    notificationSocketService.disconnect();
    
    // Показываем фон с анимацией opacity (без лого)
    setShowInitialAnimation(true)
    
    // Анимация выхода: ждем окончания анимации появления фона (400мс) + 800мс ожидания
    setTimeout(() => {
      // Переходим на логин с флагом выхода
      navigate("/login", { state: { fromLogout: true } })
      // Выполняем логаут после перехода
      setTimeout(() => dispatch(logout()), 100)
    }, 400 + 800) // 400мс анимация + 800мс ожидание
  }, [isLoggingOut, navigate, dispatch])

  // Синхронизация активной вкладки с URL при изменении location
  useEffect(() => {
    const newActiveTab = getActiveTabFromPath(location.pathname)
    if (newActiveTab !== activeTab) {
      setActiveTab(newActiveTab)
    }
  }, [location.pathname])

  // Анимация входа
  useEffect(() => {
    const fromLogin = location.state?.fromLogin
    const fromLogout = location.state?.fromLogout
    const fromProfileLogout = location.state?.fromProfileLogout
    
    if (fromProfileLogout) {
      // Если выход из профиля - вызываем handleLogout для правильной анимации
      handleLogout()
      return
    }
    
    if (fromLogout) {
      // При выходе показываем анимацию фона без лого
      setShowContent(false)
      setIsLoggingOut(true)
      
      // Сначала показываем фон с анимацией opacity
      setShowInitialAnimation(true)
      
      // Ждем окончания анимации появления фона (400мс) + 800мс дополнительно
      const timer = setTimeout(() => {
        setShowInitialAnimation(false)
        setShowContent(false)
      }, 400 + 800) // 400мс анимация + 800мс ожидание
      
      return () => clearTimeout(timer)
    } else if (fromLogin) {
      // Быстрая анимация при переходе из логина
      const timer = setTimeout(() => {
        setShowInitialAnimation(false)
        setShowContent(true)
      }, 400)
      return () => clearTimeout(timer)
    } else {
      // Полная анимация при обычной загрузке
      const timer1 = setTimeout(() => setShowInitialAnimation(false), 1200)
      const timer2 = setTimeout(() => setShowContent(true), 1300)
      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
      }
    }
  }, [location.state, navigate, handleLogout])

  // Подключение к уведомлениям через Socket.io (по настройке dataTransport)
  useEffect(() => {
    const transport = (window as any).store?.getState?.()?.notificationSettings?.dataTransport || 'socket';
    let interval: any;
    if (transport === 'socket') {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      notificationSocketService.connect();
    }

  

    return () => {
      if (transport === 'socket') {
        notificationSocketService.disconnect();
      }
      clearInterval(interval);
    };
  }, [dispatch]);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget)
  const handleClose = () => setAnchorEl(null)

  const handleTabChange = (tab: TabType) => {
    if (tab === activeTab || isAnimating) return
    setIsAnimating(true)
    setPrevTab(activeTab)
    setActiveTab(tab)
    // Навигация происходит автоматически через изменение URL
    navigate(`/${tab}`)
    setTimeout(() => {
      setIsAnimating(false)
      setPrevTab(null)
    }, 500)
  }

  const handleNotificationClick = (notification: any) => {
    dispatch(markAsRead(notification.id))
    // Всегда переходим на dashboard при клике по уведомлению, если есть координаты
    if (notification.zone && notification.row && notification.shelf) {
      handleTabChange('dashboard');
      dispatch(setMapFocus({ zone: notification.zone, row: Number(notification.row), shelf: Number(notification.shelf) }))
      return;
    }

    // Специальные кейсы без координат
    if (notification.type === 'CRITICAL_STOCK' || notification.type === 'INVENTORY_ALERT' || notification.type === 'ROBOT_BATTERY_LOW') {
      handleTabChange('dashboard');
    }
  }

  const handleMarkAllAsRead = () => dispatch(markAllAsRead())

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'CRITICAL_STOCK':
      case 'INVENTORY_ALERT': return <Warning color="error" />
      case 'LOW_BATTERY': return <BatteryAlert color="warning" />
      case 'ROBOT_OFFLINE':
      case 'ROBOT_ISSUE': return <WifiOff color="error" />
      case 'STOCK_PREDICTION': return <TrendingUp color="info" />
      case 'SYSTEM_ALERT': return <Warning color="warning" />
      default: return <Notifications color="info" />
    }
  }

  const getAlertColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'error'
      case 'MEDIUM': return 'warning'
      case 'LOW': return 'info'
      default: return 'default'
    }
  }

  const getTabButtonStyle = (tab: TabType) => ({
    backgroundColor: activeTab === tab ? "rgba(255, 255, 255, 0.16)" : "transparent",
    "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.08)" },
    mx: 0.5,
    minWidth: "auto",
    px: 2
  })

  return (
    <Box sx={{ 
      flexGrow: 1, 
      minHeight: "100vh", 
      backgroundColor: (theme) => theme.palette.mode === 'dark' ? theme.palette.background.default : '#f5f5f5',
      position: "relative",
      overflow: "hidden",
      transition: 'background-color 0.6s ease, color 0.6s ease',
      willChange: 'background-color'
    }}>
      {/* Начальная анимация логотипа или фона при выходе */}
      <AnimatePresence>
        {showInitialAnimation && (
		  <motion.div
			key="initial-animation"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.4 }}
			style={{
			  position: "fixed",
			  top: 0,
			  left: 0,
			  width: "100vw",
			  height: "100vh",
			  zIndex: 9999,
			  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.default : '#f5f5f5',
			  display: "flex",
			  alignItems: "center",
			  justifyContent: "center",
			}}
		  >
			{!isLoggingOut && (
			  <motion.img
				src={theme.palette.mode === 'dark' ? "/logo_white.png" : "/logo.png"}
				alt="Ростелеком"
				initial={{ scale: 0, opacity: 0 }}
				animate={{ 
				  scale: [0, 1.2, 1], 
				  opacity: 1 
				}}
				exit={{ scale: 0, opacity: 0 }}
				transition={{
				  duration: 0.8,
				  scale: {
					type: "spring",
					damping: 10,
					stiffness: 100,
				  }
				}}
				style={{ width: 200 }}
			  />
			)}
		  </motion.div>
		)}
      </AnimatePresence>

      {/* Основной контент */}
      <AnimatePresence>
        {showContent && !isLoggingOut && (
          <motion.div
            key="main-content"
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ 
              width: '100%', 
              height: '100vh', 
              display: 'flex', 
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* AppBar */}
            <motion.div variants={appBarAnimation}>
              <AppBar 
                position={isMobile ? "sticky" : "static"}
                elevation={2}
                sx={{
                  backgroundColor: '#1976d2 !important', // Голубой AppBar всегда
                  transition: 'background-color 0.3s ease',
                  top: 0,
                  zIndex: (theme) => theme.zIndex.drawer + 1,
                }}
              >
                <Toolbar>
                  <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}>
                    <img
                      src="/logo_white.png"
                      alt="Ростелеком"
                      style={{
                        height: 60,
                        marginRight: 16,
                        marginTop: -6,
                      }}
                    />
                    <Typography variant="h6">
                      Умный склад
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Tooltip title={wsConnected ? "WebSocket подключен" : "WebSocket отключен"}>
                      <IconButton color="inherit">{wsConnected ? <Wifi /> : <WifiOff />}</IconButton>
                    </Tooltip>

                    {exportState?.inProgress && (
                      <Tooltip
                        title={
                          <Box sx={{ minWidth: 220 }}>
                            <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                              {exportState.kind === 'pdf' ? 'Экспорт PDF' : 'Экспорт CSV'}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ flex: 1 }}>
                                <Box sx={{ height: 6, bgcolor: 'rgba(255,255,255,0.3)', borderRadius: 3 }}>
                                  <Box sx={{ height: 6, borderRadius: 3, bgcolor: 'secondary.main', width: `${exportState.progress ?? 10}%`, transition: 'width 0.3s' }} />
                                </Box>
                              </Box>
                              <Typography variant="caption">{Math.max(0, Math.min(100, exportState.progress ?? 10))}%</Typography>
                            </Box>
                            {typeof exportState.etaSeconds === 'number' && (
                              <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                                Осталось ~ {Math.ceil((exportState.etaSeconds || 0) / 60)} мин
                              </Typography>
                            )}
                          </Box>
                        }
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', mx: 1 }}>
                          <Badge variant="dot" color="secondary">
                            <TrendingUp />
                          </Badge>
                        </Box>
                      </Tooltip>
                    )}

                    <Tooltip title="Уведомления">
                          <IconButton color="inherit" onClick={() => setNotificationsDrawerOpen(true)}>
                            <Badge badgeContent={unreadCount} color="error">
                              <Notifications />
                            </Badge>
                          </IconButton>
                        </Tooltip>

                    {!isMobile && (
                      <>
                        

                        <Box sx={{ display: "flex", mx: 1 }}>
                          <Tooltip title="Текущий мониторинг">
                            <Button
                              color="inherit"
                              startIcon={<DashboardIcon />}
                              onClick={() => handleTabChange("dashboard")}
                              sx={getTabButtonStyle("dashboard")}
                              disabled={isAnimating}
                            >
                              Мониторинг
                            </Button>
                          </Tooltip>

                          <Tooltip title="Исторические данные">
                            <Button
                              color="inherit"
                              startIcon={<HistoryIcon />}
                              onClick={() => handleTabChange("history")}
                              sx={getTabButtonStyle("history")}
                              disabled={isAnimating}
                            >
                              История
                            </Button>
                          </Tooltip>
                        </Box>

                        {user?.role !== 'viewer' && (
                          <Tooltip title="Загрузить CSV">
                            <Button
                              color="inherit"
                              startIcon={<Upload />}
                              onClick={() => setUploadModalOpen(true)}
                              sx={{ mx: 0.5, minWidth: "auto" }}
                            >
                              CSV
                            </Button>
                          </Tooltip>
                        )}

                        <Tooltip title="Профиль">
                          <Button
                            color="inherit"
                            startIcon={<AccountCircle />}
                            onClick={() => handleTabChange('profile')}
                            sx={{
                              mx: 0.5,
                              minWidth: "auto",
                              px: 2,
                              borderRadius: 1,
                              backgroundColor: anchorEl ? "rgba(255, 255, 255, 0.16)" : "transparent",
                              "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.08)" },
                              transition: 'all 0.3s ease'
                            }}
                          >
                            <Typography variant="body2" sx={{ ml: 0.5 }}>{user?.name}</Typography>
                          </Button>
                        </Tooltip>
                      </>
                    )}
                  </Box>
                </Toolbar>
              </AppBar>
            </motion.div>

            {/* Контент страницы */}
            <motion.div 
              variants={contentAnimation}
              style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              <Box sx={{ 
                flex: 1, 
                position: "relative",
                overflowY: isMobile ? "auto" : "hidden",
                overflowX: "hidden",
                WebkitOverflowScrolling: "touch",
                minHeight: 0,
                width: "100%",
                height: isMobile ? "auto" : "100%",
                pb: isMobile ? '80px' : 0
              }}>
                {/* Dashboard Tab */}
                <Box sx={{ 
                  position: "absolute", 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  bottom: 0,
                  width: "100%",
                  transition: "transform 0.5s ease-in-out", 
                  transform: activeTab === "dashboard" ? "translateX(0)" : activeTab === 'history' ? "translateX(-100%)" : "translateX(-200%)",
                  overflowY: "auto",
                  overflowX: "hidden",
                  pb: isMobile ? '80px' : 0
                }}>
                  <Dashboard />
                </Box>

                {/* History Tab */}
                <Box sx={{ 
                  position: "absolute", 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  bottom: 0,
                  width: "100%",
                  transition: "transform 0.5s ease-in-out", 
                  transform: activeTab === "history" ? "translateX(0)" : activeTab === 'dashboard' ? "translateX(100%)" : "translateX(-100%)",
                  overflowY: "auto",
                  overflowX: "hidden",
                  pb: isMobile ? '80px' : 0
                }}>
                  <History />
                </Box>

                {/* Profile Tab */}
                <Box sx={{ 
                  position: "absolute", 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  bottom: 0,
                  width: "100%",
                  transition: "transform 0.5s ease-in-out", 
                  transform: activeTab === "profile" ? "translateX(0)" : activeTab === 'history' ? "translateX(100%)" : "translateX(200%)",
                  overflowY: "auto",
                  overflowX: "hidden",
                  pb: isMobile ? '80px' : 0
                }}>
                  <Profile />
                </Box>
              </Box>
            </motion.div>

            {/* Drawer уведомлений */}
			<Drawer 
			  anchor={isMobile ? "bottom" : "right"} 
			  open={notificationsDrawerOpen} 
			  onClose={() => setNotificationsDrawerOpen(false)}
			  PaperProps={isMobile ? {
				sx: { 
				  height: '80vh',
				  borderTopLeftRadius: 12,
				  borderTopRightRadius: 12,
				}
			  } : {}}
			>
			  <Box sx={{ 
				width: isMobile ? '100%' : 420, 
				p: 2,
				height: isMobile ? '100%' : 'auto'
			  }}>
				<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
				  <Typography variant="h6">
					Уведомления ({notifications.length})
				  </Typography>
				  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
					<Button size="small" disabled={notifications.length === 0} onClick={() => dispatch(clearAllNotifications())}>Очистить все</Button>
					{unreadCount > 0 && (
					  <Button size="small" onClick={handleMarkAllAsRead}>Прочитать все</Button>
					)}
					<IconButton onClick={() => setNotificationsDrawerOpen(false)}><Close /></IconButton>
				  </Box>
				</Box>

				<List sx={{ 
				  maxHeight: isMobile ? 'calc(80vh - 120px)' : '70vh', 
				  overflow: 'auto',
				  pb: isMobile ? 8 : 2 // Добавляем отступ снизу для мобильной навигации
				}}>
				  {notifications.map((notification) => (
					<ListItem key={notification.id} disablePadding sx={{ mb: 1 }}
					  secondaryAction={
						<IconButton edge="end" aria-label="delete" onClick={(e) => { e.stopPropagation(); dispatch(removeNotification(notification.id)); }}>
						  <Close />
						</IconButton>
					  }
					>
					  <ListItemButton
						onClick={() => handleNotificationClick(notification)}
						sx={{ 
						  borderLeft: isMobile ? 0 : 4,
						  borderTop: isMobile ? 4 : 0,
						  borderColor: getAlertColor(notification.priority),
						  backgroundColor: notification.read ? 'transparent' : 'action.hover',
						  py: 1.5,
						  borderRadius: isMobile ? 1 : 0
						}}
					  >
						<ListItemIcon sx={{ minWidth: 40 }}>{getAlertIcon(notification.type)}</ListItemIcon>
						<ListItemText
						  primary={
							<Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: 'wrap' }}>
							  <Typography variant="subtitle2" sx={{ mr: 0.5 }}>{notification.title}</Typography>
							  <Chip label={notification.priority} size="small" color={getAlertColor(notification.priority)} />
							</Box>
						  }
						  secondary={
							<Box>
							  <Typography variant="body2" sx={{ mb: 0.5 }}>{notification.message}</Typography>
							  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
								<Typography variant="caption" color="textSecondary">
								  {new Date(notification.timestamp).toLocaleString('ru-RU')}
								</Typography>
								{notification.action_required && (
								  <Chip label="Требует действий" size="small" color="error" variant="outlined" />
								)}
							  </Box>
							</Box>
						  }
						/>
					  </ListItemButton>
					</ListItem>
				  ))}
				  {notifications.length === 0 && (
					<ListItem>
					  <ListItemText primary="Нет уведомлений" secondary="Все системы работают нормально" sx={{ textAlign: "center", py: 2 }} />
					</ListItem>
				  )}
				</List>
			  </Box>
			</Drawer>

            {/* Bottom Navigation для мобильных */}
            {isMobile && (
              <Box sx={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1200, borderTop: '1px solid #ddd' }}>
                <BottomNavigation
                  showLabels
                  value={activeTab}
                  onChange={(e, newValue) => {
                    if (newValue === 'dashboard' || newValue === 'history' || newValue === 'profile') {
                      handleTabChange(newValue);
                    } else if (newValue === 'csv') {
                      setUploadModalOpen(true);
                    }
                  }}
                >
                  <BottomNavigationAction label="Мониторинг" value="dashboard" icon={<DashboardIcon />} />
                  <BottomNavigationAction label="История" value="history" icon={<HistoryIcon />} />
                  {user?.role !== 'viewer' && (
                    <BottomNavigationAction label="CSV" value="csv" icon={<Upload />} />
                  )}
                  <BottomNavigationAction label="Профиль" value="profile" icon={<AccountCircle />} />
                </BottomNavigation>
              </Box>
            )}

            {/* Убрали bottom sheet для профиля, теперь он как вкладка */}

            <UploadCSVModal open={uploadModalOpen} onClose={() => setUploadModalOpen(false)} onUploadSuccess={() => setUploadModalOpen(false)} />

          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  )
}

export default Main