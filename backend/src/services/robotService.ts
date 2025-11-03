import { Server } from 'socket.io';
import { pool } from '../config/database';
import { NotificationManager, NotificationEventType } from '../sockets/NotificationObserver';
import { taskQueueService } from './TaskQueueService';

export class RobotService {
  public io: Server; // Сделали публичным
  private notificationManager?: NotificationManager;

  constructor(io: Server, notificationManager?: NotificationManager) {
    this.io = io;
    this.notificationManager = notificationManager;
  }

  // Метод для установки менеджера уведомлений
  setNotificationManager(notificationManager: NotificationManager): void {
    this.notificationManager = notificationManager;
  }

  // ... остальные методы без изменений
  async getCurrentRobots() {
    try {
      const result = await pool.query(`
        SELECT 
          id, status, battery_level, last_update,
          current_zone, current_row, current_shelf
        FROM robots 
        ORDER BY id
      `);
      
      console.log(`📊 Fetched ${result.rows.length} robots from database`);
      
      // Логируем позиции роботов для отладки
      result.rows.forEach(robot => {
        console.log(`🤖 ${robot.id}: ${robot.current_zone}-${robot.current_row}-${robot.current_shelf}, battery: ${robot.battery_level}%`);
      });
      
      return result.rows;
    } catch (error) {
      console.error('Error fetching robots:', error);
      return [];
    }
  }

  async getRecentScans(limit = 20) {
    try {
      const result = await pool.query(`
        SELECT 
          ih.scanned_at as time,
          ih.robot_id,
          ih.zone as zone,
          COALESCE(p.name, 'Товар ' || ih.product_id) as product_name,
          ih.product_id,
          COALESCE(ih.quantity, 0) as quantity,
          COALESCE(ih.status, 'OK') as status
        FROM inventory_history ih
        LEFT JOIN products p ON ih.product_id = p.id
        WHERE ih.scanned_at IS NOT NULL 
          AND ih.robot_id IS NOT NULL
          AND ih.quantity IS NOT NULL
        ORDER BY ih.scanned_at DESC
        LIMIT $1
      `, [limit]);
      
      // Нормализуем данные
      return result.rows.map((row: any) => ({
        time: row.time ? new Date(row.time).toISOString() : null,
        robot_id: row.robot_id || null,
        zone: row.zone || null,
        product_name: row.product_name || null,
        product_id: row.product_id || null,
        quantity: Number(row.quantity) || 0,
        status: row.status || 'OK'
      }));
    } catch (error) {
      console.error('Error fetching recent scans:', error);
      return [];
    }
  }

  async getDashboardStats() {
    try {
      // Считаем активными только тех, у кого статус 'active' И в очереди есть задачи
      const robotsResult = await pool.query(`SELECT id, status FROM robots`);
      const allRobots = robotsResult.rows || [];
      const activeRobots = allRobots.reduce((acc: number, r: any) => {
        if (r.status === 'active') {
          try {
            const q = taskQueueService.getTasks(r.id);
            if (q.length > 0) return acc + 1;
          } catch {}
        }
        return acc;
      }, 0);

      const totalRobots = allRobots.length;

      const todayScansResult = await pool.query(`
        SELECT COUNT(*) as count 
        FROM inventory_history 
        WHERE DATE(scanned_at) = CURRENT_DATE
      `);
      const scannedToday = parseInt(todayScansResult.rows[0].count);

      const criticalStockResult = await pool.query(`
        SELECT COUNT(DISTINCT product_id) as count 
        FROM inventory_history 
        WHERE status = 'CRITICAL' 
        AND scanned_at > NOW() - INTERVAL '1 hour'
      `);
      const criticalStock = parseInt(criticalStockResult.rows[0].count);

      const avgBatteryResult = await pool.query(`
        SELECT AVG(battery_level) as avg FROM robots WHERE status != 'offline'
      `);
      const avgBattery = Math.round(parseFloat(avgBatteryResult.rows[0].avg) || 0);

      return {
        activeRobots,
        totalRobots,
        scannedToday,
        criticalStock,
        avgBattery
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        activeRobots: 0,
        totalRobots: 0,
        scannedToday: 0,
        criticalStock: 0,
        avgBattery: 0
      };
    }
  }

  async broadcastDashboardUpdate() {
    try {
      const [robots, recentScans, statistics] = await Promise.all([
        this.getCurrentRobots(),
        this.getRecentScans(),
        this.getDashboardStats()
      ]);

      const dashboardData = {
        robots,
        recentScans,
        statistics,
        timestamp: new Date().toISOString()
      };

      this.io.to('dashboard').emit('dashboard_update', dashboardData);
      console.log('📊 Dashboard update broadcasted');
    } catch (error) {
      console.error('Error broadcasting dashboard update:', error);
    }
  }

  // Новый метод для обработки данных от роботов с уведомлениями
  async processRobotData(robotData: any) {
    try {
      const { robot_id, status, battery_level, scan_results } = robotData;

      // Обновляем данные робота в БД
      await this.updateRobotStatus(robot_id, status, battery_level);

      // Обрабатываем результаты сканирования
      if (scan_results && scan_results.length > 0) {
        await this.processScanResults(robot_id, scan_results);
        
        // Уведомляем о завершении сканирования
        if (this.notificationManager) {
          this.notificationManager.notifyScanCompleted(robot_id, scan_results);
        }
      }

      // Проверяем уровень батареи
      if (battery_level < 20 && this.notificationManager) {
        this.notificationManager.notifyRobotBatteryLow(robot_id, battery_level);
      }

      // Обновляем dashboard
      await this.broadcastDashboardUpdate();

    } catch (error) {
      console.error('Error processing robot data:', error);
    }
  }

  private async updateRobotStatus(robotId: string, status: string, batteryLevel: number) {
    // Проверяем критический уровень батареи
    if (batteryLevel < 20 && status !== 'offline') {
      // Получаем текущую позицию робота для навигации на карте
      const posResult = await pool.query(
        `SELECT current_zone, current_row, current_shelf FROM robots WHERE id = $1`,
        [robotId]
      );
      const pos = posResult.rows[0] || {};

      // Отправляем критическое уведомление о низком заряде с позицией
      this.io.emit('critical_alert', {
        type: 'robot_battery_low',
        data: {
          robotId: robotId,
          batteryLevel: batteryLevel,
          zone: pos.current_zone,
          row: pos.current_row,
          shelf: pos.current_shelf,
          timestamp: new Date().toISOString()
        }
      });
      
      // Также отправляем через NotificationManager
      if (this.notificationManager) {
        this.notificationManager.notifyRobotBatteryLow(robotId, batteryLevel);
      }
    }
    // Если оффлайн или очень низкий заряд — переносим задачи на самого заряженного активного робота
    if (status === 'offline' || batteryLevel < 10) {
      try {
        const candidates = await pool.query(`SELECT id FROM robots WHERE status = 'active' ORDER BY battery_level DESC LIMIT 1`);
        const target = candidates.rows?.[0]?.id;
        if (target && target !== robotId) {
          taskQueueService.moveTasks(robotId, target);
          this.io.emit('task_reassigned', { from: robotId, to: target, reason: status === 'offline' ? 'offline' : 'low_battery', timestamp: new Date().toISOString() });
        }
      } catch {}
    }
    
    // Здесь можно добавить логику для отслеживания изменений статуса
    // и отправки уведомлений при необходимости
    console.log(`🤖 Robot ${robotId} status: ${status}, battery: ${batteryLevel}%`);
  }

  private async processScanResults(robotId: string, scanResults: any[]) {
    for (const result of scanResults) {
      // Антидублирование — если есть точно такой же скан за последние 20 сек, пропускаем
      const exists = await pool.query(
        `SELECT 1 FROM inventory_history
         WHERE robot_id = $1 AND product_id = $2 AND zone = $3 AND row_number = $4 AND shelf_number = $5
         AND ABS(EXTRACT(EPOCH FROM (scanned_at - $6))) < 20`,
        [robotId, result.product_id, result.zone, result.row_number, result.shelf_number, result.scanned_at || new Date()]
      );
      if ((exists.rowCount || 0) > 0) continue;
      // Проверяем критические уровни запасов
      if (result.status === 'CRITICAL' || Number(result.quantity) < 5) {
        // Отправляем через NotificationManager (для подписанных клиентов)
        if (this.notificationManager) {
          this.notificationManager.notifyCriticalStock(
            result.product_id,
            result.product_name,
            result.quantity
          );
        }
        
        // Также отправляем напрямую через WebSocket для всех клиентов
        this.io.emit('critical_alert', {
          type: 'critical_stock',
          data: {
            productId: result.product_id,
            productName: result.product_name,
            quantity: result.quantity,
            robotId: robotId,
            zone: result.zone,
            row: result.row_number,
            shelf: result.shelf_number,
            timestamp: new Date().toISOString()
          }
        });
        
        // Отправляем как inventory_alert для совместимости
        this.io.emit('inventory_alert', {
          productId: result.product_id,
          productName: result.product_name,
          quantity: result.quantity,
          status: 'CRITICAL',
          robotId: robotId,
          critical: true,
          zone: result.zone || 'Unknown',
          row: result.row_number,
          shelf: result.shelf_number
        });
      }

      // Уведомляем об обновлении инвентаря
      if (this.notificationManager) {
        this.notificationManager.notifyInventoryUpdate(
          result.product_id,
          result.quantity,
          result.status
        );
      }
      
      // Отправляем обычное уведомление об инвентаре
      this.io.emit('inventory_alert', {
        productId: result.product_id,
        productName: result.product_name,
        quantity: result.quantity,
        status: result.status,
        robotId: robotId,
        critical: result.status === 'CRITICAL',
        zone: result.zone || 'Unknown'
      });
    }
  }
}