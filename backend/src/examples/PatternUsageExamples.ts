// Примеры использования паттернов проектирования в Smart Warehouse

import { userRepository } from '../repositories/UserRepository';
import { aiService } from '../services/AllServices';
import { notificationManager } from '../sockets/websocket';

// ============================================================================
// 1. REPOSITORY PATTERN - Улучшенный доступ к базе данных
// ============================================================================

export class RepositoryPatternExamples {
  // Использование базового репозитория
  async demonstrateRepositoryPattern() {
    console.log('📚 Repository Pattern Examples:');
    
    // Создание пользователя через репозиторий
    const newUser = await userRepository.create({
      email: 'test@example.com',
      name: 'Test User',
      role: 'operator',
      password_hash: 'hashed_password'
    });
    console.log('✅ User created:', newUser);

    // Поиск пользователя по email
    const foundUser = await userRepository.findByEmail('test@example.com');
    console.log('✅ User found by email:', foundUser);

    // Поиск пользователей по роли
    const operators = await userRepository.findByRole('operator');
    console.log('✅ Operators found:', operators);

    // Обновление пользователя
    const updatedUser = await userRepository.update(newUser.id, {
      name: 'Updated Test User'
    });
    console.log('✅ User updated:', updatedUser);

    // Удаление пользователя
    const deleted = await userRepository.delete(newUser.id);
    console.log('✅ User deleted:', deleted);
  }
}

// ============================================================================
// 2. FACTORY PATTERN - Создание различных типов роботов
// ============================================================================

export class FactoryPatternExamples {
  // Создание роботов через фабрику
  async demonstrateFactoryPattern() {
    console.log('🏭 Factory Pattern Examples:');
    
    const apiUrl = 'http://localhost:3000';
    
    // Создание одного робота определенного типа (заглушка)
    const scanningRobot = { robot_id: 'SCAN-001', type: 'scanning' };
    console.log('✅ Scanning robot created:', scanningRobot.robot_id);

    const transportRobot = { robot_id: 'TRANS-001', type: 'transport' };
    console.log('✅ Transport robot created:', transportRobot.robot_id);

    const inspectionRobot = { robot_id: 'INSP-001', type: 'inspection' };
    console.log('✅ Inspection robot created:', inspectionRobot.robot_id);

    // Создание флота роботов через конфигурацию (заглушка)
    const robotConfigs = [
      { type: 'scanning', id: 'SCAN', count: 3 },
      { type: 'transport', id: 'TRANS', count: 2 },
      { type: 'inspection', id: 'INSP', count: 1 }
    ];

    const robotFleet = robotConfigs.flatMap(config => 
      Array.from({ length: config.count }, (_, i) => ({
        robot_id: `${config.id}-${String(i + 1).padStart(3, '0')}`,
        type: config.type
      }))
    );
    console.log('✅ Robot fleet created:', robotFleet.length, 'robots');

    // Получение доступных типов роботов (заглушка)
    const availableTypes = ['scanning', 'transport', 'inspection'];
    console.log('✅ Available robot types:', availableTypes);

    // Демонстрация разных типов роботов
    robotFleet.forEach((robot: any) => {
      const scanData = {
        product_id: `PROD-${Math.floor(Math.random() * 1000)}`,
        quantity: Math.floor(Math.random() * 50),
        status: 'OK'
      };
      console.log(`🤖 ${robot.robot_id} (${robot.type}) scan data:`, scanData);
    });
  }
}

// ============================================================================
// 3. OBSERVER PATTERN - WebSocket уведомления
// ============================================================================

export class ObserverPatternExamples {
  // Демонстрация системы уведомлений
  async demonstrateObserverPattern() {
    console.log('👀 Observer Pattern Examples:');
    
    if (!notificationManager) {
      console.log('⚠️ Notification manager not available');
      return;
    }

    // Отправка различных типов уведомлений
    notificationManager.notifyRobotStatusChange('RB-001', 'idle', 'active');
    console.log('✅ Robot status change notification sent');

    notificationManager.notifyInventoryUpdate('PROD-001', 50, 'OK');
    console.log('✅ Inventory update notification sent');

    notificationManager.notifyCriticalStock('PROD-002', 'Critical Product', 5);
    console.log('✅ Critical stock notification sent');

    notificationManager.notifyRobotBatteryLow('RB-001', 15);
    console.log('✅ Low battery notification sent');

    notificationManager.notifyScanCompleted('RB-001', [
      { product_id: 'PROD-001', quantity: 25, status: 'OK' }
    ]);
    console.log('✅ Scan completed notification sent');

    notificationManager.notifySystemAlert('System maintenance scheduled', 'MEDIUM');
    console.log('✅ System alert notification sent');
  }
}

// ============================================================================
// 4. STRATEGY PATTERN - Различные AI провайдеры
// ============================================================================

export class StrategyPatternExamples {
  // Демонстрация различных AI провайдеров
  async demonstrateStrategyPattern() {
    console.log('🧠 Strategy Pattern Examples:');
    
    // Получение информации о доступных провайдерах
    const availableProviders = aiService.getAvailableProviders();
    console.log('✅ Available AI providers:', availableProviders);

    const providersInfo = aiService.getProvidersInfo();
    console.log('✅ Providers info:', providersInfo);

    const currentProvider = aiService.getCurrentProvider();
    console.log('✅ Current provider:', currentProvider);

    // Тестовые данные
    const historicalData = [
      { product_id: 'PROD-001', quantity: 100, status: 'OK', scanned_at: new Date() },
      { product_id: 'PROD-002', quantity: 5, status: 'CRITICAL', scanned_at: new Date() }
    ];

    const currentStock = [
      { product_id: 'PROD-001', product_name: 'Product 1', current_stock: 100 },
      { product_id: 'PROD-002', product_name: 'Product 2', current_stock: 5 }
    ];

    // Анализ с текущим провайдером
    console.log('🔍 Analyzing with current provider...');
    const analysisResult = await aiService.getPredictions(7, [], 'gemini');
    console.log('✅ Analysis result:', analysisResult);

    // Анализ с конкретным провайдером (если доступен)
    if (availableProviders.includes('gemini')) {
      console.log('🔍 Analyzing with Gemini provider...');
      const geminiResult = await aiService.getPredictions(7, [], 'gemini');
      console.log('✅ Gemini analysis result:', geminiResult);
    }

    if (availableProviders.includes('local')) {
      console.log('🔍 Analyzing with Local AI provider...');
      const localResult = await aiService.getPredictions(7, [], 'local');
      console.log('✅ Local AI analysis result:', localResult);
    }

    // Смена провайдера по умолчанию
    if (availableProviders.includes('local')) {
      const switched = aiService.setDefaultProvider('local');
      console.log('✅ Provider switched to local:', switched);
    }

    // Получение рекомендаций
    console.log('💡 Getting recommendations...');
    const recommendations = await aiService.getAdvancedPredictions({
      period_days: 7,
      provider: 'local'
    });
    console.log('✅ Recommendations:', recommendations);
  }
}

// ============================================================================
// 5. ИНТЕГРИРОВАННЫЙ ПРИМЕР - Использование всех паттернов вместе
// ============================================================================

export class IntegratedExample {
  // Комплексный пример использования всех паттернов
  async demonstrateAllPatterns() {
    console.log('🚀 Integrated Example - All Patterns Together:');
    
    try {
      // 1. Repository Pattern - работа с данными
      const repositoryExample = new RepositoryPatternExamples();
      await repositoryExample.demonstrateRepositoryPattern();

      // 2. Factory Pattern - создание роботов
      const factoryExample = new FactoryPatternExamples();
      await factoryExample.demonstrateFactoryPattern();

      // 3. Observer Pattern - уведомления
      const observerExample = new ObserverPatternExamples();
      await observerExample.demonstrateObserverPattern();

      // 4. Strategy Pattern - AI анализ
      const strategyExample = new StrategyPatternExamples();
      await strategyExample.demonstrateStrategyPattern();

      console.log('✅ All patterns demonstrated successfully!');
      
    } catch (error) {
      console.error('❌ Error in integrated example:', error);
    }
  }
}

// Экспорт для использования в других частях приложения
