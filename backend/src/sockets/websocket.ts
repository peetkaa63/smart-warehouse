import { Server } from 'socket.io';
import { RobotService } from '../services/robotService';
import { 
  NotificationManager, 
  DashboardObserver, 
  CriticalAlertsObserver,
  RobotObserver,
  NotificationEventType 
} from './NotificationObserver';

let robotService: RobotService;
let notificationManager: NotificationManager;

export const setupWebSocket = (io: Server) => {
  robotService = new RobotService(io);
  notificationManager = new NotificationManager(io);

  io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);

    // Создаем наблюдателей для этого клиента
    const dashboardObserver = new DashboardObserver(socket.id, socket);
    const criticalAlertsObserver = new CriticalAlertsObserver(socket.id, socket);
    const robotObserver = new RobotObserver(socket.id, socket);

    // Подписка на обновления dashboard
    socket.on('subscribe_dashboard', async () => {
      socket.join('dashboard');
      notificationManager.subscribe(dashboardObserver);
      console.log(`📊 Client ${socket.id} subscribed to dashboard`);
      
      // Отправляем текущее состояние при подключении
      await robotService.broadcastDashboardUpdate();
    });

    // Подписка на критические уведомления
    socket.on('subscribe_critical_alerts', () => {
      socket.join('critical_alerts');
      notificationManager.subscribe(criticalAlertsObserver);
      console.log(`🚨 Client ${socket.id} subscribed to critical alerts`);
    });

    // Подписка на уведомления роботов
    socket.on('subscribe_robot_updates', () => {
      socket.join('robots');
      notificationManager.subscribe(robotObserver);
      console.log(`🤖 Client ${socket.id} subscribed to robot updates`);
    });

    // Запрос обновления dashboard
    socket.on('request_dashboard_update', async () => {
      console.log(`📊 Client ${socket.id} requested dashboard update`);
      await robotService.broadcastDashboardUpdate();
    });

    // Обработка отключения клиента
    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected:', socket.id);
      
      // Отписываем всех наблюдателей этого клиента
      notificationManager.unsubscribe(dashboardObserver.getObserverId());
      notificationManager.unsubscribe(criticalAlertsObserver.getObserverId());
      notificationManager.unsubscribe(robotObserver.getObserverId());
    });
  });

  // Периодические обновления каждые 10 секунд (как fallback)
  setInterval(async () => {
    await robotService.broadcastDashboardUpdate();
  }, 10000);
};

// Экспортируем менеджер уведомлений для использования в других сервисах
export { robotService, notificationManager };