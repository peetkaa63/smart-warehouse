import { Server } from 'socket.io';
import { RobotService } from '../services/robotService';
import { 
  NotificationManager, 
  DashboardObserver, 
  CriticalAlertsObserver,
  RobotObserver,
  NotificationEventType 
} from './NotificationObserver';
import { getTransportMode } from '../services/TransportMode';
import { TaskQueueService } from '../services/TaskQueueService';

let robotService: RobotService;
let notificationManager: NotificationManager;
let taskQueueService: TaskQueueService;

/**
 * Инициализирует Socket.IO слой и регистрирует обработчики подписок.
 *
 * Почему так:
 * - Используем комнату `dashboard` для разгрузки широковещания: только подписанные клиенты получают обновления.
 * - Наблюдатели (Observer pattern) инкапсулируют правила маршрутизации уведомлений: это облегчает эволюцию типов событий без каскада if/else.
 * - Мгновенно отправляем актуальное состояние при подписке: сокращаем «холодный старт» клиента и устраняем гонки после reconnection.
 */
export const setupWebSocket = (io: Server) => {
  robotService = new RobotService(io);
  notificationManager = new NotificationManager(io);
  taskQueueService = new TaskQueueService(io);

  io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);

    // Создаем наблюдателей для этого клиента
    const dashboardObserver = new DashboardObserver(socket.id, socket);
    const criticalAlertsObserver = new CriticalAlertsObserver(socket.id, socket);
    const robotObserver = new RobotObserver(socket.id, socket);

    // Подписка на обновления dashboard
    // Почему: отдельный канал подписки, чтобы не слать всем полный поток.
    socket.on('subscribe_dashboard', async () => {
      socket.join('dashboard');
      notificationManager.subscribe(dashboardObserver);
      console.log(`📊 Client ${socket.id} subscribed to dashboard`);
      
      // Отправляем текущее состояние при подключении
      await robotService.broadcastDashboardUpdate();
    });

    // Подписка на критические уведомления
    // Почему: критические события отделены, чтобы UI мог управлять частотой/уровнем шума.
    socket.on('subscribe_critical_alerts', () => {
      socket.join('critical_alerts');
      notificationManager.subscribe(criticalAlertsObserver);
      console.log(`🚨 Client ${socket.id} subscribed to critical alerts`);
    });

    // Подписка на уведомления роботов
    // Почему: роботы могут иметь собственных потребителей (диагностика, карты), отделяем от общей ленты.
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

    // Прием данных роботов через сокет (альтернатива HTTP POST)
    socket.on('robot_data', async (payload) => {
      try {
        if (getTransportMode() !== 'socket') return;
        await robotService.processRobotData(payload);
      } catch (e) {
        console.error('❌ robot_data handler error:', e);
      }
    });

    // Запрос задач роботов
    socket.on('request_robot_tasks', async () => {
      const tasks = await taskQueueService.getAllTasks();
      socket.emit('robot_tasks_update', tasks);
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