# Комплексная система обработки ошибок - Примеры использования

## 🛡️ 1. React Error Boundary

### Использование в компонентах:
```tsx
import ErrorBoundary, { withErrorBoundary } from './components/ErrorBoundary';

// Оборачивание компонента в Error Boundary
const MyComponent = () => {
  // Ваш компонент
};

export default withErrorBoundary(MyComponent, {
  onError: (error, errorInfo) => {
    console.error('Component error:', error);
    // Отправка в систему мониторинга
  }
});

// Или прямое использование
<ErrorBoundary
  onError={(error, errorInfo) => {
    // Обработка ошибки
  }}
>
  <MyComponent />
</ErrorBoundary>
```

### Автоматическое восстановление:
```tsx
// Error Boundary автоматически предлагает:
// - Попробовать снова (до 3 попыток)
// - Перейти на главную
// - Сообщить об ошибке
// - Показать детали (в development режиме)
```

---

## 🛠️ 2. Express Error Middleware

### Настройка в app.ts:
```typescript
import { 
  errorHandler, 
  notFoundHandler, 
  requestIdMiddleware,
  requestLoggerMiddleware 
} from './middleware/errorMiddleware';

// Добавляем middleware в правильном порядке
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);

// Ваши routes
app.use('/api', routes);

// Обработка 404
app.use(notFoundHandler);

// Обработка ошибок (должен быть последним)
app.use(errorHandler);
```

### Создание ошибок в контроллерах:
```typescript
import { AppError } from '../errors/AppError';

// Валидация
if (!email || !password) {
  throw AppError.validation('Email и пароль обязательны');
}

// Не найдено
const user = await userRepository.findById(id);
if (!user) {
  throw AppError.notFound('Пользователь не найден');
}

// Неавторизован
if (!req.user) {
  throw AppError.unauthorized('Необходима авторизация');
}

// Запрещено
if (req.user.role !== 'admin') {
  throw AppError.forbidden('Недостаточно прав');
}

// Конфликт
if (await userRepository.findByEmail(email)) {
  throw AppError.conflict('Пользователь с таким email уже существует');
}

// Ошибка базы данных
try {
  await userRepository.create(userData);
} catch (error) {
  throw AppError.database('Ошибка создания пользователя', { originalError: error.message });
}

// Робот не найден
if (!robot) {
  throw AppError.robotNotFound(robotId);
}

// AI сервис недоступен
if (!aiService.isAvailable()) {
  throw AppError.aiServiceUnavailable('gemini');
}
```

### Структурированные ответы:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Ошибка валидации данных",
    "messageRu": "Ошибка валидации данных",
    "statusCode": 400,
    "severity": "LOW",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_123456789",
    "details": {
      "validationErrors": [
        {
          "field": "email",
          "message": "Некорректный формат email адреса",
          "value": "invalid-email"
        }
      ]
    }
  }
}
```

---

## 🔌 3. WebSocket обработка ошибок

### Frontend - использование хука:
```tsx
import { useEnhancedWebSocket } from './hooks/useEnhancedWebSocket';

const Dashboard = () => {
  const {
    connectionState,
    isConnected,
    isReconnecting,
    lastError,
    connect,
    disconnect,
    forceReconnect,
    subscribeToDashboard,
    subscribeToCriticalAlerts
  } = useEnhancedWebSocket({
    autoConnect: true,
    onError: (error) => {
      console.error('WebSocket error:', error);
    },
    onReconnecting: (info) => {
      console.log(`Reconnecting... ${info.attempt}/${info.maxReconnectAttempts}`);
    }
  });

  useEffect(() => {
    if (isConnected) {
      subscribeToDashboard();
      subscribeToCriticalAlerts();
    }
  }, [isConnected, subscribeToDashboard, subscribeToCriticalAlerts]);

  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      {isReconnecting && <div>Reconnecting...</div>}
      {lastError && <div>Error: {lastError.message}</div>}
    </div>
  );
};
```

### Backend - обработка ошибок:
```typescript
// В WebSocket сервере
socket.on('subscribe_dashboard', async () => {
  try {
    if (!socket.userId) {
      throw AppError.unauthorized('Необходима авторизация для подписки');
    }
    
    socket.join('dashboard');
    // Подписка успешна
    socket.emit('subscription_success', {
      type: 'dashboard',
      message: 'Подписка на dashboard активирована'
    });
  } catch (error) {
    socket.emit('subscription_error', {
      type: 'dashboard',
      message: error.message,
      code: error.code
    });
  }
});
```

---

## 🇷🇺 4. Русские сообщения об ошибках

### Использование утилит уведомлений:
```tsx
import { 
  showErrorNotification,
  showSuccessNotification,
  showWarningNotification,
  handleApiError,
  handleWebSocketError,
  showRobotNotification,
  showInventoryNotification
} from './utils/notificationUtils';

// Ошибка API
const handleLogin = async (credentials) => {
  try {
    await authService.login(credentials);
    showSuccessNotification(dispatch, 'Успешный вход в систему');
  } catch (error) {
    handleApiError(dispatch, error, 'Пользователь');
  }
};

// WebSocket ошибка
useEffect(() => {
  socketService.onError((error) => {
    handleWebSocketError(dispatch, error);
  });
}, []);

// Уведомление о роботе
const handleRobotUpdate = (robot) => {
  if (robot.batteryLevel < 20) {
    showRobotNotification(dispatch, robot.id, 'low_battery', robot.batteryLevel);
  }
};

// Уведомление об инвентаризации
const handleInventoryUpdate = (product) => {
  if (product.status === 'CRITICAL') {
    showInventoryNotification(dispatch, product.name, product.quantity, product.status);
  }
};
```

### Кастомные уведомления:
```tsx
import { createNotification } from './utils/notificationUtils';

// Уведомление с действиями
createNotification(dispatch, {
  type: 'error',
  title: 'Критический алерт',
  message: 'Робот RB-001 застрял в зоне A',
  duration: 0, // Не исчезает автоматически
  persistent: true,
  actions: [
    {
      label: 'Отправить команду',
      action: () => sendRobotCommand('RB-001', 'unstick'),
      variant: 'primary'
    },
    {
      label: 'Вызвать техника',
      action: () => callMaintenance('RB-001'),
      variant: 'danger'
    }
  ]
});
```

---

## 📊 5. Мониторинг и логирование

### Автоматическое логирование:
```typescript
// Все ошибки автоматически логируются с:
// - Request ID
// - User ID
// - Timestamp
// - Severity level
// - Stack trace
// - Request details

console.error('🚨 [HIGH] VALIDATION_ERROR');
console.error('📊 Request ID: req_123456789');
console.error('👤 User ID: user_456');
console.error('🌐 POST /api/users');
console.error('💬 Ошибка валидации данных');
```

### Отправка в систему мониторинга:
```typescript
// В production ошибки отправляются в:
// - Sentry
// - DataDog
// - LogRocket
// - Или другую систему мониторинга

if (process.env.NODE_ENV === 'production') {
  // Отправка в систему мониторинга
  monitoringService.captureException(error, {
    tags: {
      component: 'WebSocket',
      userId: socket.userId,
      requestId: socket.requestId
    },
    extra: {
      connectionState: connectionState,
      subscriptions: clientSubscriptions.get(socket.id)
    }
  });
}
```

---

## 🔧 6. Настройка и конфигурация

### Environment переменные:
```bash
# .env
NODE_ENV=production
LOG_LEVEL=error
SENTRY_DSN=your_sentry_dsn
REDIS_URL=redis://localhost:6379
WEBSOCKET_RECONNECT_ATTEMPTS=5
WEBSOCKET_RECONNECT_DELAY=1000
```

### Настройка Error Boundary:
```tsx
// В index.tsx
<ErrorBoundary
  onError={(error, errorInfo) => {
    // Отправка в систему мониторинга
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        }
      });
    }
  }}
>
  <App />
</ErrorBoundary>
```

### Настройка WebSocket:
```typescript
// В EnhancedSocketService
const socketService = new EnhancedSocketService({
  url: process.env.REACT_APP_WS_URL || 'http://localhost:3000',
  options: {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: parseInt(process.env.REACT_APP_WS_RECONNECT_ATTEMPTS || '5'),
    reconnectionDelay: parseInt(process.env.REACT_APP_WS_RECONNECT_DELAY || '1000'),
    reconnectionDelayMax: 10000,
    timeout: 20000
  }
});
```

---

## 🎯 7. Лучшие практики

### 1. Всегда используйте типизированные ошибки:
```typescript
// ❌ Плохо
throw new Error('User not found');

// ✅ Хорошо
throw AppError.notFound('Пользователь не найден', requestId);
```

### 2. Логируйте контекст ошибки:
```typescript
// ✅ Хорошо
throw AppError.database('Ошибка создания пользователя', {
  userId: user.id,
  email: user.email,
  originalError: error.message
});
```

### 3. Показывайте понятные сообщения пользователю:
```typescript
// ❌ Плохо
showErrorNotification(dispatch, 'Database connection failed');

// ✅ Хорошо
showErrorNotification(dispatch, 'Не удалось сохранить данные. Попробуйте позже.');
```

### 4. Используйте разные уровни серьезности:
```typescript
// Критическая ошибка - требует немедленного внимания
throw AppError.internal('Database connection lost', undefined, undefined, ErrorSeverity.CRITICAL);

// Предупреждение - можно продолжить работу
throw AppError.validation('Некорректный email', undefined, undefined, ErrorSeverity.LOW);
```

### 5. Обрабатывайте ошибки на разных уровнях:
```typescript
// Компонент - показывает уведомление
try {
  await apiCall();
} catch (error) {
  showErrorNotification(dispatch, 'Не удалось загрузить данные');
}

// Error Boundary - ловит необработанные ошибки
<ErrorBoundary onError={handleComponentError}>
  <Component />
</ErrorBoundary>

// Express middleware - обрабатывает все ошибки API
app.use(errorHandler);
```

Эта система обеспечивает комплексную обработку ошибок на всех уровнях приложения с понятными сообщениями на русском языке.

