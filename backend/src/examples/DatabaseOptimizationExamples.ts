// Примеры использования оптимизаций базы данных

import { pool } from '../config/database';
import { cacheManager, CacheKeys, CacheTTL } from '../config/redis';
import { optimizedHistoryRepository } from '../repositories/OptimizedHistoryRepository';
import { cachedDashboardService } from '../services/CachedDashboardService';
import { performanceMonitor } from '../monitoring/PerformanceMonitor';

export class DatabaseOptimizationExamples {
  
  // 1. ПРИМЕР: Использование оптимизированных индексов
  async demonstrateIndexOptimization() {
    console.log('🗂️ Index Optimization Examples:');
    
    // Запрос, который будет использовать новые индексы
    const query = `
      SELECT 
        ih.product_id,
        p.name,
        ih.quantity,
        ih.status,
        ih.scanned_at
      FROM inventory_history ih
      JOIN products p ON ih.product_id = p.id
      WHERE ih.scanned_at >= NOW() - INTERVAL '24 hours'
        AND ih.status = 'CRITICAL'
        AND ih.zone = 'A'
      ORDER BY ih.scanned_at DESC
      LIMIT 100
    `;

    const startTime = Date.now();
    const result = await pool.query(query);
    const executionTime = Date.now() - startTime;

    console.log(`✅ Query executed in ${executionTime}ms`);
    console.log(`📊 Returned ${result.rows.length} rows`);
    
    // Записываем метрики
    performanceMonitor.recordQuery(query, executionTime, result.rows.length);
  }

  // 2. ПРИМЕР: Кэширование dashboard данных
  async demonstrateCaching() {
    console.log('🚀 Caching Examples:');
    
    // Первый запрос - будет загружен из БД и закэширован
    console.log('📊 First request (cache miss):');
    const start1 = Date.now();
    const stats1 = await cachedDashboardService.getCachedDashboardStats();
    const time1 = Date.now() - start1;
    console.log(`⏱️ Time: ${time1}ms`, stats1);

    // Второй запрос - будет загружен из кэша
    console.log('📊 Second request (cache hit):');
    const start2 = Date.now();
    const stats2 = await cachedDashboardService.getCachedDashboardStats();
    const time2 = Date.now() - start2;
    console.log(`⏱️ Time: ${time2}ms`, stats2);

    console.log(`🚀 Speed improvement: ${Math.round((time1 / time2) * 100) / 100}x faster`);
  }

  // 3. ПРИМЕР: Оптимизированная пагинация
  async demonstratePaginationOptimization() {
    console.log('📄 Pagination Optimization Examples:');
    
    // Offset-based пагинация
    console.log('📄 Offset-based pagination:');
    const offsetStart = Date.now();
    const offsetResult = await optimizedHistoryRepository.getHistoryOptimized({
      page: '1',
      limit: '20',
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    });
    const offsetTime = Date.now() - offsetStart;
    console.log(`⏱️ Time: ${offsetTime}ms, Items: ${offsetResult.items.length}`);

    // Cursor-based пагинация
    console.log('📄 Cursor-based pagination:');
    const cursorStart = Date.now();
    const cursorResult = await optimizedHistoryRepository.getHistoryOptimized({
      limit: '20',
      cursor: undefined, // Начинаем с начала
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    });
    const cursorTime = Date.now() - cursorStart;
    console.log(`⏱️ Time: ${cursorTime}ms, Items: ${cursorResult.items.length}`);
    console.log(`📄 Has next page: ${cursorResult.pagination.hasNext}`);
    console.log(`📄 Next cursor: ${cursorResult.pagination.nextCursor}`);
  }

  // 4. ПРИМЕР: Мониторинг производительности
  async demonstratePerformanceMonitoring() {
    console.log('📊 Performance Monitoring Examples:');
    
    // Получаем статистику производительности
    const perfStats = performanceMonitor.getPerformanceStats();
    console.log('📈 Performance Stats:', perfStats);

    // Получаем статистику базы данных
    const dbStats = await performanceMonitor.getDatabaseStats();
    console.log('🗄️ Database Stats:', {
      totalConnections: dbStats.totalConnections,
      activeConnections: dbStats.activeConnections,
      cacheHitRatio: dbStats.cacheHitRatio
    });

    // Получаем рекомендации по оптимизации
    const recommendations = performanceMonitor.getOptimizationRecommendations();
    console.log('💡 Optimization Recommendations:', recommendations);
  }

  // 5. ПРИМЕР: Сравнение производительности запросов
  async demonstrateQueryComparison() {
    console.log('⚡ Query Performance Comparison:');
    
    // Старый способ - множественные запросы
    console.log('🐌 Old way - multiple queries:');
    const oldStart = Date.now();
    
    const [robots, scans, stats] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM robots WHERE status = \'active\''),
      pool.query('SELECT COUNT(*) as count FROM inventory_history WHERE DATE(scanned_at) = CURRENT_DATE'),
      pool.query('SELECT AVG(battery_level) as avg FROM robots WHERE status != \'offline\'')
    ]);
    
    const oldTime = Date.now() - oldStart;
    console.log(`⏱️ Time: ${oldTime}ms`);

    // Новый способ - объединенный запрос
    console.log('🚀 New way - single optimized query:');
    const newStart = Date.now();
    
    const optimizedQuery = `
      WITH robot_stats AS (
        SELECT 
          COUNT(*) as total_robots,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_robots,
          ROUND(AVG(CASE WHEN status != 'offline' THEN battery_level END)) as avg_battery
        FROM robots
      ),
      scan_stats AS (
        SELECT 
          COUNT(*) as scanned_today
        FROM inventory_history
        WHERE DATE(scanned_at) = CURRENT_DATE
      )
      SELECT 
        rs.total_robots,
        rs.active_robots,
        rs.avg_battery,
        ss.scanned_today
      FROM robot_stats rs, scan_stats ss
    `;
    
    const newResult = await pool.query(optimizedQuery);
    const newTime = Date.now() - newStart;
    console.log(`⏱️ Time: ${newTime}ms`);
    
    console.log(`🚀 Performance improvement: ${Math.round((oldTime / newTime) * 100) / 100}x faster`);
  }

  // 6. ПРИМЕР: Управление кэшем
  async demonstrateCacheManagement() {
    console.log('🗑️ Cache Management Examples:');
    
    // Установка значения в кэш
    await cacheManager.set('test:key', { message: 'Hello from cache!' }, 60);
    console.log('✅ Value cached');

    // Получение значения из кэша
    const cachedValue = await cacheManager.get('test:key');
    console.log('📖 Cached value:', cachedValue);

    // Проверка существования ключа
    const exists = await cacheManager.exists('test:key');
    console.log('🔍 Key exists:', exists);

    // Инвалидация кэша
    await cachedDashboardService.invalidateDashboardCache();
    console.log('🗑️ Dashboard cache invalidated');

    // Очистка по паттерну
    await cacheManager.delPattern('test:*');
    console.log('🗑️ Test keys cleared');
  }

  // 7. ПРИМЕР: Анализ медленных запросов
  async demonstrateSlowQueryAnalysis() {
    console.log('🐌 Slow Query Analysis:');
    
    // Выполняем несколько запросов разной сложности
    const queries = [
      'SELECT COUNT(*) FROM inventory_history',
      'SELECT * FROM inventory_history ORDER BY scanned_at DESC LIMIT 10',
      'SELECT p.name, COUNT(*) FROM inventory_history ih JOIN products p ON ih.product_id = p.id GROUP BY p.name'
    ];

    for (const query of queries) {
      const start = Date.now();
      await pool.query(query);
      const time = Date.now() - start;
      
      performanceMonitor.recordQuery(query, time, 0);
      console.log(`⏱️ Query time: ${time}ms`);
    }

    // Получаем медленные запросы через публичный метод
    const dbStats = await performanceMonitor.getDatabaseStats();
    console.log('🐌 Slow queries:', dbStats.slowQueries);
  }

  // 8. ПРИМЕР: Комплексная оптимизация
  async demonstrateComprehensiveOptimization() {
    console.log('🚀 Comprehensive Optimization Example:');
    
    // 1. Кэшированное получение данных
    const dashboardData = await cachedDashboardService.getCachedDashboardStats();
    console.log('📊 Dashboard data (cached):', dashboardData);

    // 2. Оптимизированная пагинация
    const historyData = await optimizedHistoryRepository.getHistoryOptimized({
      page: '1',
      limit: '50',
      from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    });
    console.log('📄 History data (optimized):', historyData.pagination);

    // 3. Мониторинг производительности
    const perfStats = performanceMonitor.getPerformanceStats();
    console.log('📈 Performance stats:', perfStats);

    // 4. Рекомендации по оптимизации
    const recommendations = performanceMonitor.getOptimizationRecommendations();
    console.log('💡 Recommendations:', recommendations);
  }

  // Запуск всех примеров
  async runAllExamples() {
    console.log('🚀 Running Database Optimization Examples...\n');
    
    try {
      await this.demonstrateIndexOptimization();
      console.log('\n' + '='.repeat(50) + '\n');
      
      await this.demonstrateCaching();
      console.log('\n' + '='.repeat(50) + '\n');
      
      await this.demonstratePaginationOptimization();
      console.log('\n' + '='.repeat(50) + '\n');
      
      await this.demonstratePerformanceMonitoring();
      console.log('\n' + '='.repeat(50) + '\n');
      
      await this.demonstrateQueryComparison();
      console.log('\n' + '='.repeat(50) + '\n');
      
      await this.demonstrateCacheManagement();
      console.log('\n' + '='.repeat(50) + '\n');
      
      await this.demonstrateSlowQueryAnalysis();
      console.log('\n' + '='.repeat(50) + '\n');
      
      await this.demonstrateComprehensiveOptimization();
      
      console.log('\n✅ All examples completed successfully!');
      
    } catch (error) {
      console.error('❌ Error running examples:', error);
    }
  }
}

// Экспорт для использования
export const databaseOptimizationExamples = new DatabaseOptimizationExamples();
