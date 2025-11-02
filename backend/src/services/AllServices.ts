import { aiRepository, AIPrediction, HistoricalData } from '../repositories/AIRepository';
import { robotsRepository, RobotData, ScanResult } from '../repositories/RobotsRepository';
import { advancedAnalyticsRepository, AdvancedTrendData, EfficiencyData } from '../repositories/AdvancedAnalyticsRepository';
import { uploadRepository, exportRepository, UploadResult, ExportData } from '../repositories/UploadExportRepository';
import { aiService as baseAIService } from './ai/AIService';
import advancedAnalyticsServiceInstance from './advancedAnalyticsService';
import { pool } from '../config/database';

export class AIServiceWrapper {
  // Получение прогнозов AI с использованием Strategy pattern
  async getPredictions(periodDays: number = 7, categories: string[] = [], providerName?: string): Promise<any> {
    try {
      console.log('🤖 AI Service: Getting predictions for period:', periodDays, 'days');
      
      // Получаем исторические данные
      const historicalData = await aiRepository.getHistoricalData(periodDays);
      
      // Получаем текущие остатки
      const currentStock = await aiRepository.getCurrentStock();
      
      // Анализируем данные через выбранный AI провайдер
      const aiResponse = await baseAIService.getPredictions(historicalData, currentStock, periodDays, providerName);
      
      // Сохраняем прогнозы в БД
      if (aiResponse.predictions) {
        await aiRepository.savePredictions(aiResponse.predictions);
      }
      
      return aiResponse;
    } catch (error: any) {
      console.error('❌ AI Service error:', error);
      throw new Error('Failed to get AI predictions: ' + error.message);
    }
  }

  // Получение расширенных прогнозов
  async getAdvancedPredictions(filters: {
    period_days?: number;
    zones?: string[];
    categories?: string[];
    products?: string[];
    provider?: string;
  }): Promise<any> {
    try {
      console.log('🔮 AI Service: Getting advanced predictions with filters:', filters);
      
      const periodDays = filters.period_days || 7;
      const historicalData = await aiRepository.getHistoricalData(periodDays);
      const currentStock = await aiRepository.getCurrentStock();
      
      // Фильтруем данные по зонам/категориям/товарам если нужно
      let filteredHistorical = historicalData;
      let filteredCurrent = currentStock;
      
      if (filters.products && filters.products.length > 0) {
        filteredHistorical = historicalData.filter(item => 
          filters.products!.includes(item.product_id)
        );
        filteredCurrent = currentStock.filter(item => 
          filters.products!.includes(item.product_id)
        );
      }
      
      // Используем Strategy pattern для выбора AI провайдера
      const aiResponse = await baseAIService.getPredictions(
        filteredHistorical, 
        filteredCurrent, 
        7,
        filters.provider
      );
      
      if (aiResponse.predictions) {
        await aiRepository.savePredictions(aiResponse.predictions);
      }
      
      return aiResponse;
    } catch (error: any) {
      console.error('❌ AI Service advanced predictions error:', error);
      throw new Error('Failed to get advanced AI predictions: ' + error.message);
    }
  }

  // Получение доступных AI провайдеров
  getAvailableProviders(): string[] {
    return aiService.getAvailableProviders();
  }

  // Получение информации о провайдерах
  getProvidersInfo(): any[] {
    return aiService.getProvidersInfo();
  }

  // Установка провайдера по умолчанию
  setDefaultProvider(providerName: string): boolean {
    return aiService.setDefaultProvider(providerName);
  }

  // Получение текущего провайдера
  getCurrentProvider(): string {
    return aiService.getCurrentProvider();
  }

  // Получение истории прогнозов
  async getPredictionHistory(limit: number = 10): Promise<AIPrediction[]> {
    try {
      return await aiRepository.getPredictionHistory(limit);
    } catch (error: any) {
      console.error('❌ AI Service prediction history error:', error);
      throw new Error('Failed to get prediction history: ' + error.message);
    }
  }

  // Принудительное обновление прогнозов
  async refreshPredictions(periodDays: number = 7): Promise<any> {
    try {
      console.log('🔄 AI Service: Force refreshing predictions');
      
      // Очищаем старые прогнозы
      await aiRepository.cleanupOldPredictions();
      
      // Получаем новые прогнозы
      return await this.getPredictions(periodDays);
    } catch (error: any) {
      console.error('❌ AI Service refresh error:', error);
      throw new Error('Failed to refresh predictions: ' + error.message);
    }
  }

  // Получение статуса AI сервиса
  async getAIStatus(): Promise<{ predictions_count: number; last_prediction: string | null; gemini_status: any }> {
    try {
      const dbStatus = await aiRepository.getAIStatus();
      const geminiStatus = { status: 'active', provider: 'gemini' };
      
      return {
        predictions_count: dbStatus.predictions_count,
        last_prediction: dbStatus.last_prediction,
        gemini_status: geminiStatus
      };
    } catch (error: any) {
      console.error('❌ AI Service status error:', error);
      throw new Error('Failed to get AI status: ' + error.message);
    }
  }
}

export class RobotsService {
  /**
   * Обрабатывает телеметрию робота и результаты сканирования.
   *
   * Почему так:
   * - Нормализуем заряд до целого: downstream‑логика уведомлений и дашборда использует дискретные пороги (10/20%).
   * - Определяем `status` из батареи, а не только из телеметрии: это даёт консистентный UX (робот с 15% считается «требует зарядки»).
   * - Сначала публикуем уведомления о низком заряде: сигнал важнее, чем запись истории; оператор видит проблему сразу, даже если БД задерживается.
   * - Логика отправки уведомлений дублируется через NotificationManager и прямой emit: это снижает риск «тишины» на фронтенде при расхождениях подписок.
   * - Сканирования сохраняются батчем: уменьшаем накладные расходы на вставки и упрощаем аудит.
   */
  async processRobotData(robotData: {
    robot_id: string;
    timestamp: string;
    location: { zone: string; row: number; shelf: number };
    scan_results: Array<{
      product_id: string;
      product_name?: string;
      quantity: number;
      status?: string;
    }>;
    battery_level: number;
  }): Promise<{ success: boolean; message: string; processed_scans: number }> {
    try {
      console.log(`🤖 Robots Service: Processing data from robot ${robotData.robot_id}`);
      
      // Нормализуем уровень батареи в диапазон 0..100
      const batteryLevelIntRaw = Math.round(Number(robotData.battery_level));
      const batteryLevelInt = Math.min(100, Math.max(0, batteryLevelIntRaw));

      // Не переопределяем статус, если робот поставлен на паузу внешней командой
      let status = batteryLevelInt > 20 ? 'active' : 'charging';
      try {
        const current = await pool.query('SELECT status FROM robots WHERE id = $1', [robotData.robot_id]);
        const currentStatus = current.rows?.[0]?.status;
        if (currentStatus === 'paused' || currentStatus === 'offline') {
          status = currentStatus;
        }
      } catch {}
      
      // Проверяем уровень батареи и отправляем уведомление если нужно
      if (batteryLevelInt <= 20 && batteryLevelInt >= 0) {
        console.log(`🔋 LOW BATTERY ALERT: Robot ${robotData.robot_id} has ${batteryLevelInt}% battery`);
        
        // Импортируем robotService и notificationManager динамически
        try {
          const { robotService, notificationManager } = await import('../sockets/websocket');
          
          // Отправляем уведомление через NotificationManager
          if (notificationManager) {
            console.log(`📢 Sending battery low notification via NotificationManager`);
            notificationManager.notifyRobotBatteryLow(robotData.robot_id, batteryLevelInt);
          }
          
          // Также отправляем напрямую через socket для тестирования
          if (robotService && robotService.io) {
            console.log(`📡 Emitting battery alert via WebSocket`);
            robotService.io.emit('critical_alert', {
              type: 'robot_battery_low',
              data: {
                robotId: robotData.robot_id,
                batteryLevel: batteryLevelInt,
                timestamp: new Date().toISOString()
              }
            });
            
            // Отправляем и как системное уведомление
            robotService.io.emit('system_notification', {
              type: 'LOW_BATTERY',
              robot_id: robotData.robot_id,
              title: `🔋 НИЗКИЙ ЗАРЯД: ${robotData.robot_id}`,
              message: `Уровень заряда: ${batteryLevelInt}%. Рекомендуется зарядка.`,
              priority: 'MEDIUM',
              action_required: batteryLevelInt < 10
            });
          }
        } catch (importError) {
          console.error('Error importing socket services:', importError);
        }
      }
      
      // Обновляем данные робота
      await robotsRepository.updateRobot({
        id: robotData.robot_id,
        status,
        battery_level: batteryLevelInt,
        last_update: new Date(robotData.timestamp),
        current_zone: robotData.location.zone,
        current_row: robotData.location.row,
        current_shelf: robotData.location.shelf
      });
      
      // Сохраняем результаты сканирования
      const scanResults: ScanResult[] = robotData.scan_results.map(scan => ({
        robot_id: robotData.robot_id,
        product_id: scan.product_id,
        quantity: scan.quantity,
        zone: robotData.location.zone,
        row_number: robotData.location.row,
        shelf_number: robotData.location.shelf,
        status: (scan.status && scan.status.length > 0)
          ? scan.status
          : (Number(scan.quantity) < 5 ? 'CRITICAL' : 'OK'),
        scanned_at: new Date(robotData.timestamp)
      }));
      
      await robotsRepository.saveScanResults(scanResults);

      // Отправляем критические уведомления для quantity < 5
      for (const scan of scanResults) {
        if (scan.status === 'CRITICAL') {
          try {
            const { robotService } = await import('../sockets/websocket');
            if (robotService && robotService.io) {
              robotService.io.emit('critical_alert', {
                type: 'critical_stock',
                data: {
                  productId: scan.product_id,
                  quantity: scan.quantity,
                  zone: scan.zone,
                  row: scan.row_number,
                  shelf: scan.shelf_number,
                  timestamp: new Date().toISOString()
                }
              });
              robotService.io.emit('inventory_alert', {
                productId: scan.product_id,
                quantity: scan.quantity,
                status: 'CRITICAL',
                zone: scan.zone,
                row: scan.row_number,
                shelf: scan.shelf_number,
                critical: true
              });
            }
          } catch (e) {
            console.error('❌ Error emitting critical stock notification:', e);
          }
        }
      }
      
      console.log(`✅ Robots Service: Processed ${scanResults.length} scans from robot ${robotData.robot_id}`);
      
      return {
        success: true,
        message: `Successfully processed ${scanResults.length} scans`,
        processed_scans: scanResults.length
      };
    } catch (error: any) {
      console.error('❌ Robots Service error:', error);
      throw new Error('Failed to process robot data: ' + error.message);
    }
  }

  // Получение всех роботов
  async getAllRobots(): Promise<RobotData[]> {
    try {
      return await robotsRepository.getAllRobots();
    } catch (error: any) {
      console.error('❌ Robots Service get all robots error:', error);
      throw new Error('Failed to get robots: ' + error.message);
    }
  }

  // Получение статистики роботов
  async getRobotsStats(): Promise<{
    total_robots: number;
    active_robots: number;
    charging_robots: number;
    avg_battery_level: number;
  }> {
    try {
      return await robotsRepository.getRobotsStats();
    } catch (error: any) {
      console.error('❌ Robots Service stats error:', error);
      throw new Error('Failed to get robots stats: ' + error.message);
    }
  }
}

export class AdvancedAnalyticsService {
  // Получение расширенных трендов
  async getEnhancedTrends(productIds: string[] = [], periodDays: number = 30): Promise<AdvancedTrendData> {
    try {
      console.log('📈 Advanced Analytics Service: Getting enhanced trends');
      
      // Если не указаны товары, берем топ-5 по активности
      if (productIds.length === 0) {
        productIds = await advancedAnalyticsRepository.getTopProducts(5);
      }
      
      return await advancedAnalyticsRepository.getEnhancedTrends(productIds, periodDays);
    } catch (error: any) {
      console.error('❌ Advanced Analytics Service trends error:', error);
      throw new Error('Failed to get enhanced trends: ' + error.message);
    }
  }

  // Получение данных об эффективности
  async getEfficiencyData(periodDays: number = 7): Promise<EfficiencyData[]> {
    try {
      return await advancedAnalyticsRepository.getEfficiencyData(periodDays);
    } catch (error: any) {
      console.error('❌ Advanced Analytics Service efficiency error:', error);
      throw new Error('Failed to get efficiency data: ' + error.message);
    }
  }

  // Получение AI инсайтов
  async getAIInsights(): Promise<any> {
    try {
      console.log('🧠 Advanced Analytics Service: Getting AI insights');
      
      const inventoryData = await advancedAnalyticsRepository.getWarehouseStatsForAI();
      const robotData = await robotsRepository.getAllRobots();
      const recentScans = await advancedAnalyticsRepository.getWarehouseStatsForAI();
      
      return await advancedAnalyticsServiceInstance.generateAIInsights(
        [inventoryData], 
        robotData, 
        recentScans
      );
    } catch (error: any) {
      console.error('❌ Advanced Analytics Service AI insights error:', error);
      throw new Error('Failed to get AI insights: ' + error.message);
    }
  }

  // Получение уведомлений
  async getNotifications(limit: number = 20): Promise<any[]> {
    try {
      return await advancedAnalyticsRepository.getNotifications(limit);
    } catch (error: any) {
      console.error('❌ Advanced Analytics Service notifications error:', error);
      throw new Error('Failed to get notifications: ' + error.message);
    }
  }
}

export class UploadService {
  // Обработка загрузки CSV файла
  async processCSVUpload(csvData: any[]): Promise<any> {
    try {
      console.log('📤 Upload Service: Processing CSV upload with', csvData.length, 'rows');
      
      const errors: Array<{row: number | string; error: string; data: any}> = [];
      let processedRows = 0;
      let importedRows = 0;
      let duplicateRows = 0;
      const summary = {
        totalProcessed: 0,
        imported: 0,
        duplicates: 0,
        errors: 0,
        total_products: 0,
        total_quantity: 0,
        zones_updated: new Set<string>()
      };
      
	  // Генерируем robot_id для импорта если его нет в CSV
      const importRobotId = 'IMPORT-ROBOT-' + Date.now();
      
      // Проверяем, нужен ли importRobotId, и создаем его заранее
      let importRobotNeeded = false;
      for (const row of csvData) {
        const robotId = row.robot_id || row.robotId || null;
        if (!robotId || robotId.trim() === '') {
          importRobotNeeded = true;
          break;
        }
      }
      
      // Создаем импорт-робота заранее, если он нужен
      if (importRobotNeeded) {
        const importRobotExists = await uploadRepository.checkRobotExists(importRobotId);
        if (!importRobotExists) {
          await uploadRepository.createRobot({
            id: importRobotId,
            status: 'active',
            battery_level: 100,
            current_zone: 'A',
            current_row: 1,
            current_shelf: 1
          });
          console.log(`✅ Created import robot: ${importRobotId}`);
        }
      }
	  
      for (const row of csvData) {
        try {
          processedRows++;
          
          // Нормализуем названия полей (поддержка альтернативных форматов CSV)
          const normalizedRow = {
            robot_id: row.robot_id || row.robotId || null,
            product_id: row.product_id || row.productId || '',
            product_name: row.product_name || row.productName || '',
            quantity: row.quantity || row.qty || 0,
            zone: row.zone || row.zone_id || 'A',
            row_number: row.row_number || row.row || row.rowNumber || 1,
            shelf_number: row.shelf_number || row.shelf || row.shelfNumber || 1,
            scanned_at: row.scanned_at || row.date || row.scannedAt || new Date(),
            status: row.status || 'OK',
            category: row.category || 'Unknown'
          };
          
          const scannedAt = new Date(normalizedRow.scanned_at);
          
          // Определяем, какой robot_id использовать
          const robotIdForScan = normalizedRow.robot_id && normalizedRow.robot_id.trim() !== '' 
            ? normalizedRow.robot_id 
            : importRobotId;
          
          // Проверяем существование робота и создаем если нужно
          const robotExists = await uploadRepository.checkRobotExists(robotIdForScan);
          if (!robotExists) {
            await uploadRepository.createRobot({
              id: robotIdForScan,
              status: 'active',
              battery_level: 100,
              current_zone: normalizedRow.zone || 'A',
              current_row: parseInt(String(normalizedRow.row_number)) || 1,
              current_shelf: parseInt(String(normalizedRow.shelf_number)) || 1
            });
            console.log(`✅ Created robot: ${robotIdForScan}`);
          }
          
          // Генерируем product_id если его нет в CSV или он пустой
          let productId = (normalizedRow.product_id || '').trim();
          if (!productId || productId === '') {
            // Генерируем уникальный ID на основе product_name и timestamp
            const nameBase = (normalizedRow.product_name || 'PROD')
              .replace(/[^a-zA-Z0-9А-Яа-я]/g, '')
              .toUpperCase()
              .substring(0, 10) || 'PROD';
            productId = `${nameBase}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
            console.log(`⚠️ Generated product_id for product: "${normalizedRow.product_name}" -> "${productId}"`);
          }
          
          // Проверяем существование продукта
          const productExists = await uploadRepository.checkProductExists(productId);
          if (!productExists) {
            await uploadRepository.createProduct({
              id: productId,
              name: normalizedRow.product_name || `Product ${productId}`,
              category: normalizedRow.category || 'Unknown',
              min_stock: row.min_stock || 10,
              optimal_stock: row.optimal_stock || 50
            });
            summary.total_products++;
          }
          
          // Проверяем на дубликаты
          const isDuplicate = await uploadRepository.checkDuplicateScan({
            robot_id: robotIdForScan,
            product_id: productId,
            scanned_at: scannedAt
          });
          
          if (isDuplicate) {
            duplicateRows++;
            continue; // Пропускаем дубликат
          }
          
          // Сохраняем данные сканирования
          await uploadRepository.saveScanData({
            robot_id: robotIdForScan,
            product_id: productId,
            quantity: parseInt(String(normalizedRow.quantity)) || 0,
            zone: normalizedRow.zone || 'A',
            row_number: parseInt(String(normalizedRow.row_number)) || 1,
            shelf_number: parseInt(String(normalizedRow.shelf_number)) || 1,
            status: normalizedRow.status || 'OK',
            scanned_at: scannedAt
          });
          
          importedRows++;
          summary.total_quantity += parseInt(String(normalizedRow.quantity)) || 0;
          if (normalizedRow.zone) {
            summary.zones_updated.add(normalizedRow.zone);
          }
        } catch (rowError: any) {
          errors.push({
            row: processedRows,
            error: rowError.message,
            data: row
          });
        }
      }
      
      summary.totalProcessed = processedRows;
      summary.imported = importedRows;
      summary.duplicates = duplicateRows;
      summary.errors = errors.length;
      
      return {
        success: errors.length === 0,
        processed_rows: processedRows,
        errors: errors,
        summary: {
          totalProcessed: summary.totalProcessed,
          imported: summary.imported,
          errors: summary.errors,
          duplicates: summary.duplicates,
          total_products: summary.total_products,
          total_quantity: summary.total_quantity,
          zones_updated: Array.from(summary.zones_updated)
        },
        message: duplicateRows > 0 
          ? `Обработано ${processedRows} строк, импортировано ${importedRows}, найдено дубликатов: ${duplicateRows}` 
          : `Обработано ${processedRows} строк успешно`
      };
    } catch (error: any) {
      console.error('❌ Upload Service error:', error);
      throw new Error('Failed to process CSV upload: ' + error.message);
    }
  }
}

export class ExportService {
  // Экспорт данных в Excel
  async exportToExcel(filters: any): Promise<ExportData> {
    try {
      console.log('📊 Export Service: Exporting to Excel with filters:', filters);
      
      const data = await exportRepository.getExportData(filters);
      const stats = await exportRepository.getExportStats(filters);
      
      return {
        data: [...data, { stats }], // Добавляем статистику в конец
        filename: `inventory_export_${new Date().toISOString().split('T')[0]}.xlsx`,
        format: 'excel'
      };
    } catch (error: any) {
      console.error('❌ Export Service Excel error:', error);
      throw new Error('Failed to export to Excel: ' + error.message);
    }
  }

  // Экспорт данных в PDF
  async exportToPDF(filters: any): Promise<ExportData> {
    try {
      console.log('📄 Export Service: Exporting to PDF with filters:', filters);
      
      const data = await exportRepository.getExportData(filters);
      const stats = await exportRepository.getExportStats(filters);
      
      return {
        data: [...data, { stats }],
        filename: `inventory_report_${new Date().toISOString().split('T')[0]}.pdf`,
        format: 'pdf'
      };
    } catch (error: any) {
      console.error('❌ Export Service PDF error:', error);
      throw new Error('Failed to export to PDF: ' + error.message);
    }
  }
}

// Экспортируем экземпляры сервисов
export const aiService = new AIServiceWrapper();
export const robotsService = new RobotsService();
export const advancedAnalyticsServiceNew = new AdvancedAnalyticsService();
export const uploadService = new UploadService();
export const exportService = new ExportService();
