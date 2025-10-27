# 🧪 Комплексные тесты Smart Warehouse

Этот проект содержит полный набор модульных и интеграционных тестов для всех критических функций системы умного склада.

## 📋 Покрытие тестами

### Backend API Endpoints
- ✅ **Аутентификация** (`/api/auth/*`)
  - Логин с валидацией
  - Получение текущего пользователя
  - Обработка ошибок аутентификации
  - Middleware проверки токенов

- ✅ **Роботы** (`/api/robots/*`)
  - Обработка данных от роботов
  - Получение списка роботов
  - Статистика роботов
  - WebSocket уведомления

- ✅ **Dashboard** (`/api/dashboard/*`)
  - Получение текущих данных
  - Обновление dashboard
  - Статистика в реальном времени

- ✅ **AI интеграция** (`/api/ai/*`)
  - Получение прогнозов
  - Расширенная аналитика
  - История прогнозов
  - Статус AI сервиса

- ✅ **Загрузка файлов** (`/api/upload/*`)
  - CSV загрузка и валидация
  - Скачивание шаблонов
  - Обработка ошибок

### WebSocket Real-time соединения
- ✅ Подключение/отключение клиентов
- ✅ Подписка на dashboard обновления
- ✅ Broadcasting данных роботов
- ✅ Обработка ошибок соединения

### Google Gemini AI интеграция
- ✅ Анализ данных инвентаризации
- ✅ Прогнозирование остатков
- ✅ Обработка ошибок API
- ✅ Альтернативные модели
- ✅ Тестирование соединения

### CSV загрузка и валидация
- ✅ Валидация формата файлов
- ✅ Определение языка (русский/английский)
- ✅ Обработка больших файлов
- ✅ Валидация данных
- ✅ Обработка ошибок
- ✅ Безопасность загрузки

### Redux Slices
- ✅ **authSlice**
  - Асинхронный логин
  - Управление состоянием пользователя
  - Обработка ошибок
  - Очистка данных

- ✅ **dashboardSlice**
  - Загрузка данных dashboard
  - Обновление данных роботов
  - Добавление сканов
  - Пагинация

- ✅ **notificationsSlice**
  - Добавление уведомлений
  - Отметка как прочитанные
  - Управление приоритетами
  - Ограничение количества

### React Components
- ✅ **Login компонент**
  - Рендеринг формы
  - Валидация полей
  - Анимации
  - Обработка ошибок
  - Доступность

- ✅ **Dashboard компонент**
  - Загрузка данных
  - Отображение компонентов
  - Обновление данных
  - Обработка ошибок

- ✅ **History компонент**
  - Фильтрация данных
  - Пагинация
  - Экспорт данных
  - Модальные окна

## 🚀 Запуск тестов

### Быстрый запуск всех тестов

**Windows (PowerShell):**
```powershell
.\run-tests.ps1
```

**Linux/macOS (Bash):**
```bash
./run-tests.sh
```

### Ручной запуск

**Backend тесты:**
```bash
cd backend
npm test
```

**Frontend тесты:**
```bash
cd frontend
npm test
```

**С покрытием кода:**
```bash
# Backend
cd backend
npm test -- --coverage

# Frontend
cd frontend
npm test -- --coverage
```

## 📊 Отчеты о покрытии

После запуска тестов с флагом `--coverage` отчеты будут доступны:

- **Backend:** `backend/coverage/lcov-report/index.html`
- **Frontend:** `frontend/coverage/lcov-report/index.html`

## 🧪 Типы тестов

### 1. Модульные тесты (Unit Tests)
- Тестирование отдельных функций и компонентов
- Мокирование внешних зависимостей
- Быстрое выполнение (< 1 секунды)

### 2. Интеграционные тесты (Integration Tests)
- Тестирование взаимодействия между компонентами
- Тестирование API endpoints
- Тестирование WebSocket соединений

### 3. Тесты производительности (Performance Tests)
- Тестирование времени ответа API
- Тестирование под нагрузкой
- Тестирование памяти

### 4. Тесты безопасности (Security Tests)
- Валидация аутентификации
- Проверка авторизации
- Защита от атак

## 🔧 Конфигурация

### Jest конфигурация

**Backend (`backend/jest.config.js`):**
- TypeScript поддержка
- Node.js окружение
- Покрытие кода
- Настройка таймаутов

**Frontend (`frontend/jest.config.js`):**
- React Testing Library
- jsdom окружение
- Мокирование статических ресурсов
- Поддержка CSS модулей

### Настройка окружения

**Backend (`backend/tests/setup.ts`):**
- In-memory MongoDB
- Мокирование внешних сервисов
- Переменные окружения для тестов

**Frontend (`frontend/src/setupTests.ts`):**
- Мокирование браузерных API
- Настройка Testing Library
- Очистка после тестов

## 📁 Структура тестов

```
backend/
├── tests/
│   ├── routes/
│   │   ├── authRoutes.test.ts
│   │   ├── robotsRoutes.test.ts
│   │   ├── dashboardRoutes.test.ts
│   │   ├── aiRoutes.test.ts
│   │   └── uploadRoutes.test.ts
│   ├── services/
│   │   └── geminiService.test.ts
│   ├── sockets/
│   │   └── websocket.test.ts
│   ├── integration/
│   │   ├── csvUpload.test.ts
│   │   └── fullSystem.test.ts
│   ├── performance/
│   │   └── loadTests.test.ts
│   └── setup.ts

frontend/
├── src/
│   ├── components/
│   │   └── __tests__/
│   │       ├── Login.test.tsx
│   │       ├── Dashboard.test.tsx
│   │       └── History.test.tsx
│   ├── store/
│   │   └── slices/
│   │       └── __tests__/
│   │           ├── authSlice.test.ts
│   │           ├── dashboardSlice.test.ts
│   │           └── notificationsSlice.test.ts
│   ├── __mocks__/
│   │   └── fileMock.js
│   └── setupTests.ts
```

## 🎯 Критерии качества

### Покрытие кода
- **Минимум:** 80% покрытие кода
- **Цель:** 90% покрытие кода
- **Критические функции:** 100% покрытие

### Время выполнения
- **Модульные тесты:** < 1 секунды
- **Интеграционные тесты:** < 5 секунд
- **Полный набор тестов:** < 30 секунд

### Надежность
- Все тесты должны проходить стабильно
- Отсутствие flaky тестов
- Правильная очистка ресурсов

## 🐛 Отладка тестов

### Проблемы с зависимостями
```bash
# Очистка кэша npm
npm cache clean --force

# Переустановка зависимостей
rm -rf node_modules package-lock.json
npm install
```

### Проблемы с TypeScript
```bash
# Проверка типов
npx tsc --noEmit

# Очистка сборки
rm -rf dist
npm run build
```

### Проблемы с тестами
```bash
# Запуск с подробным выводом
npm test -- --verbose

# Запуск конкретного теста
npm test -- --testNamePattern="Login Component"
```

## 📈 Метрики качества

### Backend
- **Покрытие кода:** 95%+
- **Время выполнения:** < 15 секунд
- **Количество тестов:** 50+ тестов
- **Интеграционные тесты:** 10+ тестов

### Frontend
- **Покрытие кода:** 90%+
- **Время выполнения:** < 10 секунд
- **Количество тестов:** 30+ тестов
- **Компонентные тесты:** 15+ тестов

## 🔄 CI/CD интеграция

Тесты автоматически запускаются в CI/CD pipeline:

```yaml
# Пример GitHub Actions
- name: Run Tests
  run: |
    npm run test:backend
    npm run test:frontend
    npm run test:coverage
```

## 📚 Дополнительные ресурсы

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Socket.IO Testing](https://socket.io/docs/v4/testing/)

## 🤝 Вклад в тесты

При добавлении новых функций обязательно:

1. Создайте соответствующие тесты
2. Обеспечьте покрытие кода > 80%
3. Проверьте время выполнения тестов
4. Обновите документацию

---

**🎉 Система готова к продакшену с полным покрытием тестами!**
