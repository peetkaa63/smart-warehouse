# Применение паттернов проектирования в Smart Warehouse

В этом документе показано, как в проекте Smart Warehouse применены четыре ключевых паттерна проектирования для улучшения архитектуры и поддерживаемости кода.

## 🏗️ 1. Repository Pattern - Доступ к базе данных

### Проблема
- Прямое использование `pool.query` в каждом репозитории
- Дублирование логики подключения к БД
- Отсутствие единого интерфейса для всех репозиториев

### Решение
Создан базовый класс `BaseRepository` с общими CRUD операциями:

```typescript
// backend/src/repositories/BaseRepository.ts
export abstract class BaseRepository<T> implements IBaseRepository<T> {
  protected tableName: string;
  protected primaryKey: string = 'id';

  // Общие методы для работы с БД
  protected async query(text: string, params?: any[]): Promise<any>
  async findById(id: number | string): Promise<T | null>
  async findAll(): Promise<T[]>
  async create(entity: Partial<T>): Promise<T>
  async update(id: number | string, entity: Partial<T>): Promise<T | null>
  async delete(id: number | string): Promise<boolean>
}
```

### Улучшенный UserRepository
```typescript
export class UserRepository extends BaseRepository<User> implements IUserRepository {
  constructor() {
    super('users', 'id');
  }

  // Специфичные методы для пользователей
  async findByEmail(email: string): Promise<User | null>
  async findByRole(role: string): Promise<User[]>
}
```

### Преимущества
- ✅ Единообразный интерфейс для всех репозиториев
- ✅ Переиспользование общей логики
- ✅ Легкое тестирование с моками
- ✅ Централизованная обработка ошибок БД

---

## 🏭 2. Factory Pattern - Эмуляторы роботов

### Проблема
- Один класс `RobotEmulator` для всех типов роботов
- Сложность добавления новых типов роботов
- Отсутствие гибкости в конфигурации

### Решение
Создана фабрика для создания различных типов роботов:

```python
# robot_emulator/robot_factory.py
class RobotFactory:
    ROBOT_TYPES = {
        'scanning': ScanningRobot,
        'transport': TransportRobot,
        'inspection': InspectionRobot
    }
    
    @staticmethod
    def create_robot(robot_type: str, robot_id: str, api_url: str) -> RobotInterface:
        if robot_type not in RobotFactory.ROBOT_TYPES:
            raise ValueError(f"Unknown robot type: {robot_type}")
        
        robot_class = RobotFactory.ROBOT_TYPES[robot_type]
        return robot_class(robot_id, api_url)
    
    @staticmethod
    def create_robot_fleet(robot_configs: list, api_url: str) -> list:
        # Создание флота роботов на основе конфигурации
```

### Специализированные роботы
```python
class ScanningRobot(BaseRobot):
    """Робот для сканирования товаров"""
    def generate_scan_data(self) -> list:
        # Логика сканирования

class TransportRobot(BaseRobot):
    """Робот для транспортировки товаров"""
    def generate_scan_data(self) -> list:
        # Логика транспортировки

class InspectionRobot(BaseRobot):
    """Робот для инспекции качества"""
    def generate_scan_data(self) -> list:
        # Логика инспекции
```

### Использование
```python
# Создание одного робота
robot = RobotFactory.create_robot('scanning', 'SCAN-001', api_url)

# Создание флота роботов
robot_configs = [
    {'type': 'scanning', 'id': 'SCAN', 'count': 3},
    {'type': 'transport', 'id': 'TRANS', 'count': 2},
    {'type': 'inspection', 'id': 'INSP', 'count': 1}
]
robots = RobotFactory.create_robot_fleet(robot_configs, api_url)
```

### Преимущества
- ✅ Легкое добавление новых типов роботов
- ✅ Гибкая конфигурация флота роботов
- ✅ Инкапсуляция логики создания объектов
- ✅ Расширяемость без изменения существующего кода

---

## 👀 3. Observer Pattern - WebSocket уведомления

### Проблема
- Прямая отправка уведомлений через Socket.IO
- Сложность управления подписками
- Отсутствие типизации событий

### Решение
Создана система уведомлений с Observer pattern:

```typescript
// backend/src/sockets/NotificationObserver.ts
export interface NotificationObserver {
  update(eventType: string, data: any): void;
  getObserverId(): string;
}

export class NotificationManager implements NotificationSubject {
  private observers: Map<string, NotificationObserver> = new Map();
  
  subscribe(observer: NotificationObserver): void
  unsubscribe(observerId: string): void
  notify(eventType: string, data: any): void
}
```

### Специализированные наблюдатели
```typescript
export class DashboardObserver extends WebSocketObserver {
  update(eventType: string, data: any): void {
    if (this.socket.rooms.has('dashboard')) {
      this.socket.emit('notification', { type: eventType, data });
    }
  }
}

export class CriticalAlertsObserver extends WebSocketObserver {
  update(eventType: string, data: any): void {
    const criticalEvents = [
      NotificationEventType.CRITICAL_STOCK,
      NotificationEventType.ROBOT_BATTERY_LOW,
      NotificationEventType.SYSTEM_ALERT
    ];
    
    if (criticalEvents.includes(eventType as NotificationEventType)) {
      this.socket.emit('critical_alert', { type: eventType, data });
    }
  }
}
```

### Типизированные события
```typescript
export enum NotificationEventType {
  ROBOT_STATUS_CHANGE = 'robot_status_change',
  INVENTORY_UPDATE = 'inventory_update',
  CRITICAL_STOCK = 'critical_stock',
  ROBOT_BATTERY_LOW = 'robot_battery_low',
  SCAN_COMPLETED = 'scan_completed',
  SYSTEM_ALERT = 'system_alert'
}
```

### Использование
```typescript
// Отправка уведомлений
notificationManager.notifyRobotStatusChange('RB-001', 'idle', 'active');
notificationManager.notifyCriticalStock('PROD-001', 'Product Name', 5);
notificationManager.notifySystemAlert('Maintenance scheduled', 'MEDIUM');
```

### Преимущества
- ✅ Слабая связанность между компонентами
- ✅ Легкое добавление новых типов уведомлений
- ✅ Типизированные события
- ✅ Гибкая система подписок

---

## 🧠 4. Strategy Pattern - AI провайдеры

### Проблема
- Жестко привязан к Gemini AI
- Сложность добавления новых AI провайдеров
- Отсутствие fallback механизма

### Решение
Создана система AI провайдеров с Strategy pattern:

```typescript
// backend/src/services/ai/IAIProvider.ts
export interface IAIProvider {
  initialize(): Promise<boolean>;
  isAvailable(): boolean;
  analyzeInventoryData(request: AIAnalysisRequest): Promise<AIAnalysisResponse>;
  getPredictions(request: AIAnalysisRequest): Promise<AIAnalysisResponse>;
  getRecommendations(request: AIAnalysisRequest): Promise<AIAnalysisResponse>;
  getProviderName(): string;
}
```

### Реализации провайдеров
```typescript
export class GeminiAIProvider implements IAIProvider {
  // Реализация для Gemini AI
}

export class OpenAIProvider implements IAIProvider {
  // Реализация для OpenAI
}

export class LocalAIProvider implements IAIProvider {
  // Локальная реализация с простыми алгоритмами
}
```

### AI Service с автоматическим выбором провайдера
```typescript
export class AIService {
  private providers: Map<string, IAIProvider> = new Map();
  private defaultProvider: string = 'gemini';
  private fallbackProvider: string = 'local';

  async analyzeInventoryData(
    historicalData: any[], 
    currentStock: any[], 
    providerName?: string
  ): Promise<AIAnalysisResponse> {
    return await this.executeWithProvider(
      'analyzeInventoryData',
      request,
      providerName
    );
  }
}
```

### Использование
```typescript
// Анализ с текущим провайдером
const result = await aiService.analyzeInventoryData(historicalData, currentStock);

// Анализ с конкретным провайдером
const geminiResult = await aiService.analyzeInventoryData(
  historicalData, 
  currentStock, 
  'gemini'
);

// Смена провайдера по умолчанию
aiService.setDefaultProvider('local');

// Получение информации о провайдерах
const providers = aiService.getAvailableProviders();
const info = aiService.getProvidersInfo();
```

### Преимущества
- ✅ Легкое добавление новых AI провайдеров
- ✅ Автоматический fallback при недоступности
- ✅ Возможность выбора провайдера во время выполнения
- ✅ Единый интерфейс для всех провайдеров

---

## 🚀 Интегрированное использование

### Пример использования всех паттернов вместе
```typescript
// 1. Repository Pattern - работа с данными
const user = await userRepository.findByEmail('admin@example.com');

// 2. Factory Pattern - создание роботов
const robots = RobotFactory.create_robot_fleet(configs, apiUrl);

// 3. Observer Pattern - уведомления
notificationManager.notifyRobotStatusChange('RB-001', 'idle', 'active');

// 4. Strategy Pattern - AI анализ
const analysis = await aiService.analyzeInventoryData(data, stock, 'gemini');
```

## 📁 Структура файлов

```
backend/src/
├── repositories/
│   ├── BaseRepository.ts          # Базовый репозиторий
│   └── UserRepository.ts          # Улучшенный репозиторий пользователей
├── sockets/
│   ├── NotificationObserver.ts    # Observer pattern для уведомлений
│   └── websocket.ts              # Обновленный WebSocket сервер
├── services/
│   ├── ai/
│   │   ├── IAIProvider.ts        # Интерфейс AI провайдеров
│   │   ├── GeminiAIProvider.ts   # Gemini AI провайдер
│   │   ├── OpenAIProvider.ts     # OpenAI провайдер
│   │   ├── LocalAIProvider.ts    # Локальный AI провайдер
│   │   └── AIService.ts          # AI сервис с Strategy pattern
│   └── AllServices.ts            # Обновленный сервис
├── examples/
│   └── PatternUsageExamples.ts   # Примеры использования
└── robot_emulator/
    ├── robot_factory.py          # Factory pattern для роботов
    └── emulator_with_factory.py  # Обновленный эмулятор
```

## 🎯 Результаты применения паттернов

### До применения паттернов
- ❌ Дублирование кода в репозиториях
- ❌ Один тип роботов
- ❌ Прямые WebSocket уведомления
- ❌ Жесткая привязка к Gemini AI

### После применения паттернов
- ✅ Единообразный доступ к данным
- ✅ Гибкая система роботов
- ✅ Типизированная система уведомлений
- ✅ Множественные AI провайдеры с fallback

## 🔧 Настройка и использование

1. **Repository Pattern**: Наследуйте от `BaseRepository` для новых репозиториев
2. **Factory Pattern**: Добавьте новые типы роботов в `RobotFactory.ROBOT_TYPES`
3. **Observer Pattern**: Создайте новые наблюдатели, наследующие от `WebSocketObserver`
4. **Strategy Pattern**: Реализуйте `IAIProvider` для новых AI провайдеров

Все паттерны интегрированы в существующую архитектуру без нарушения обратной совместимости.

