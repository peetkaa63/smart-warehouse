import { pool } from '../config/database';
import { robotService } from '../sockets/websocket';

class NotificationAnalyzerService {
  
  // Анализ данных после получения от робота
  async analyzeRobotData(robotData: any, scanResults: any[]) {
    console.log('🔍 Analyzing robot data for notifications...');
    
    const notifications = [];
    
    // 1. Анализ состояния робота
    const robotNotifications = await this.analyzeRobotStatus(robotData);
    notifications.push(...robotNotifications);
    
    // 2. Анализ инвентаризации
    const inventoryNotifications = await this.analyzeInventory(scanResults, robotData.location);
    notifications.push(...inventoryNotifications);
    
    // 3. Анализ эффективности
    const efficiencyNotifications = await this.analyzeEfficiency(robotData);
    notifications.push(...efficiencyNotifications);
    
    // Отправляем уведомления через WebSocket
    if (notifications.length > 0 && robotService) {
      notifications.forEach(notification => {
        robotService.io.emit('system_notification', notification);
      });
    }
    
    return notifications;
  }
  
  // Анализ состояния робота
  private async analyzeRobotStatus(robotData: any) {
    const notifications = [];
    const batteryLevel = Math.round(Number(robotData.battery_level));
    
    // Низкий заряд батареи
    if (batteryLevel < 20) {
      notifications.push({
        type: 'LOW_BATTERY',
        robot_id: robotData.robot_id,
        title: `🔋 НИЗКИЙ ЗАРЯД: ${robotData.robot_id}`,
        message: `Уровень заряда: ${batteryLevel}%. Рекомендуется зарядка.`,
        priority: 'MEDIUM',
        action_required: batteryLevel < 10
      });
    }
    
    // Робот offline (не обновлялся более 5 минут)
    const lastUpdate = new Date(robotData.timestamp);
    const now = new Date();
    const minutesSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
    
    if (minutesSinceUpdate > 5) {
      notifications.push({
        type: 'ROBOT_OFFLINE',
        robot_id: robotData.robot_id,
        title: `❌ РОБОТ ОТКЛЮЧЕН: ${robotData.robot_id}`,
        message: `Неактивен более ${Math.round(minutesSinceUpdate)} минут`,
        priority: 'HIGH',
        action_required: true
      });
    }
    
    return notifications;
  }
  
  // Анализ инвентаризации
  private async analyzeInventory(scanResults: any[], location: any) {
    const notifications = [];
    
    for (const scan of scanResults) {
      // Критические остатки
      if (scan.status === 'CRITICAL') {
        // Получаем информацию о товаре
        const productInfo = await pool.query(
          'SELECT name FROM products WHERE id = $1',
          [scan.product_id]
        );
        
        const productName = productInfo.rows[0]?.name || scan.product_id;
        
        notifications.push({
          type: 'CRITICAL_STOCK',
          product_id: scan.product_id,
          product_name: productName,
          title: `🚨 КРИТИЧЕСКИЙ ОСТАТОК: ${productName}`,
          message: `Зона ${location.zone}. Текущий запас: ${scan.quantity} шт.`,
          priority: 'HIGH',
          zone: location.zone,
          action_required: true
        });
      }
      
      // Низкие остатки
      if (scan.status === 'LOW_STOCK') {
        const productInfo = await pool.query(
          'SELECT name FROM products WHERE id = $1',
          [scan.product_id]
        );
        
        const productName = productInfo.rows[0]?.name || scan.product_id;
        
        notifications.push({
          type: 'LOW_STOCK',
          product_id: scan.product_id,
          product_name: productName,
          title: `⚠️ НИЗКИЙ ЗАПАС: ${productName}`,
          message: `Зона ${location.zone}. Текущий запас: ${scan.quantity} шт.`,
          priority: 'MEDIUM',
          zone: location.zone,
          action_required: false
        });
      }
    }
    
    return notifications;
  }
  
  // Анализ эффективности работы
  private async analyzeEfficiency(robotData: any) {
    const notifications = [];
    
    // Анализируем эффективность за последние 24 часа
    const efficiencyResult = await pool.query(`
      SELECT 
        COUNT(*) as total_scans,
        COUNT(DISTINCT product_id) as unique_products
      FROM inventory_history 
      WHERE robot_id = $1 
        AND scanned_at >= NOW() - INTERVAL '24 hours'
    `, [robotData.robot_id]);
    
    const stats = efficiencyResult.rows[0];
    
    // Низкая эффективность (менее 10 сканирований в час)
    const scansPerHour = stats.total_scans / 24;
    if (scansPerHour < 10) {
      notifications.push({
        type: 'LOW_EFFICIENCY',
        robot_id: robotData.robot_id,
        title: `📉 НИЗКАЯ ЭФФЕКТИВНОСТЬ: ${robotData.robot_id}`,
        message: `Всего ${stats.total_scans} сканирований за 24 часа (${Math.round(scansPerHour)}/час)`,
        priority: 'LOW',
        action_required: false
      });
    }
    
    return notifications;
  }
  
  // Периодический анализ для AI прогнозов
  async performPeriodicAnalysis() {
    console.log('🧠 Performing periodic analysis for predictions...');
    
    const notifications = [];
    
    // Анализ товаров с риском дефицита
    const stockoutRisk = await this.analyzeStockoutRisk();
    notifications.push(...stockoutRisk);
    
    // Анализ эффективности склада
    const warehouseEfficiency = await this.analyzeWarehouseEfficiency();
    notifications.push(...warehouseEfficiency);
    
    return notifications;
  }
  
  // Анализ риска дефицита
  private async analyzeStockoutRisk() {
    const notifications = [];
    
    // Товары с критическими остатками
    const criticalProducts = await pool.query(`
      SELECT DISTINCT ON (product_id)
        product_id,
        p.name as product_name,
        quantity,
        zone
      FROM inventory_history ih
      LEFT JOIN products p ON ih.product_id = p.id
      WHERE status = 'CRITICAL'
      ORDER BY product_id, scanned_at DESC
      LIMIT 10
    `);
    
    for (const product of criticalProducts.rows) {
      notifications.push({
        type: 'STOCKOUT_RISK',
        product_id: product.product_id,
        product_name: product.product_name,
        title: `📊 ВЫСОКИЙ РИСК ДЕФИЦИТА: ${product.product_name}`,
        message: `Критический остаток в зоне ${product.zone}. Текущий запас: ${product.quantity} шт.`,
        priority: 'HIGH',
        zone: product.zone,
        action_required: true
      });
    }
    
    return notifications;
  }
  
  // Анализ эффективности склада
  private async analyzeWarehouseEfficiency() {
    const notifications = [];
    
    // Анализ зон с низкой активностью
    const inactiveZones = await pool.query(`
      SELECT 
        zone,
        COUNT(*) as scan_count,
        MAX(scanned_at) as last_scan
      FROM inventory_history 
      WHERE scanned_at >= NOW() - INTERVAL '24 hours'
      GROUP BY zone
      HAVING COUNT(*) < 5
    `);
    
    for (const zone of inactiveZones.rows) {
      const hoursSinceLastScan = Math.round(
        (new Date().getTime() - new Date(zone.last_scan).getTime()) / (1000 * 60 * 60)
      );
      
      notifications.push({
        type: 'INACTIVE_ZONE',
        zone: zone.zone,
        title: `📭 НИЗКАЯ АКТИВНОСТЬ: Зона ${zone.zone}`,
        message: `Всего ${zone.scan_count} сканирований за 24 часа. Последнее: ${hoursSinceLastScan} часов назад`,
        priority: 'LOW',
        action_required: false
      });
    }
    
    return notifications;
  }
}

export default new NotificationAnalyzerService();