import { AppDispatch } from '../store';
import { showNotification } from '../store/slices/notificationSlice';

// Типы уведомлений
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

// Интерфейс для создания уведомлений
export interface CreateNotificationOptions {
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
  }>;
}

// Русские сообщения для различных типов ошибок
export const ERROR_MESSAGES_RU = {
  // Сетевые ошибки
  NETWORK_ERROR: 'Проблема с подключением к серверу. Проверьте интернет-соединение.',
  TIMEOUT_ERROR: 'Превышено время ожидания ответа сервера. Попробуйте позже.',
  CONNECTION_REFUSED: 'Сервер недоступен. Попробуйте позже.',
  
  // Ошибки авторизации
  UNAUTHORIZED: 'Сессия истекла. Пожалуйста, войдите в систему заново.',
  FORBIDDEN: 'Недостаточно прав для выполнения операции.',
  TOKEN_EXPIRED: 'Токен авторизации истек. Войдите в систему заново.',
  
  // Ошибки валидации
  VALIDATION_ERROR: 'Ошибка валидации данных. Проверьте введенные значения.',
  REQUIRED_FIELD: 'Обязательное поле не заполнено.',
  INVALID_EMAIL: 'Некорректный формат email адреса.',
  WEAK_PASSWORD: 'Пароль слишком простой. Используйте буквы, цифры и специальные символы.',
  
  // Ошибки роботов
  ROBOT_NOT_FOUND: 'Робот не найден.',
  ROBOT_OFFLINE: 'Робот находится в офлайн режиме.',
  ROBOT_BATTERY_LOW: 'У робота низкий уровень заряда батареи.',
  ROBOT_STUCK: 'Робот застрял и не может продолжить работу.',
  ROBOT_MAINTENANCE: 'Робот требует технического обслуживания.',
  
  // Ошибки инвентаризации
  PRODUCT_NOT_FOUND: 'Товар не найден.',
  INSUFFICIENT_STOCK: 'Недостаточно товара на складе.',
  INVENTORY_SCAN_FAILED: 'Ошибка сканирования инвентаря.',
  ZONE_ACCESS_DENIED: 'Нет доступа к указанной зоне склада.',
  
  // Ошибки AI
  AI_SERVICE_UNAVAILABLE: 'Сервис искусственного интеллекта недоступен.',
  AI_PREDICTION_FAILED: 'Не удалось получить прогноз от ИИ.',
  AI_INSUFFICIENT_DATA: 'Недостаточно данных для создания прогноза.',
  
  // Ошибки файлов
  FILE_UPLOAD_ERROR: 'Ошибка загрузки файла.',
  FILE_FORMAT_ERROR: 'Неподдерживаемый формат файла.',
  FILE_SIZE_EXCEEDED: 'Размер файла превышает допустимый лимит.',
  FILE_CORRUPTED: 'Файл поврежден и не может быть обработан.',
  
  // WebSocket ошибки
  WEBSOCKET_CONNECTION_ERROR: 'Ошибка подключения к WebSocket.',
  WEBSOCKET_AUTHENTICATION_ERROR: 'Ошибка авторизации WebSocket соединения.',
  WEBSOCKET_RECONNECTING: 'Переподключение к серверу...',
  
  // Общие ошибки
  INTERNAL_ERROR: 'Внутренняя ошибка сервера. Попробуйте позже.',
  UNKNOWN_ERROR: 'Произошла неизвестная ошибка. Обратитесь в поддержку.',
  SERVICE_UNAVAILABLE: 'Сервис временно недоступен. Попробуйте позже.',
  RATE_LIMIT_EXCEEDED: 'Превышен лимит запросов. Попробуйте позже.'
};

// Сообщения успеха
export const SUCCESS_MESSAGES_RU = {
  LOGIN_SUCCESS: 'Успешный вход в систему.',
  LOGOUT_SUCCESS: 'Вы вышли из системы.',
  DATA_SAVED: 'Данные успешно сохранены.',
  DATA_UPDATED: 'Данные успешно обновлены.',
  DATA_DELETED: 'Данные успешно удалены.',
  FILE_UPLOADED: 'Файл успешно загружен.',
  ROBOT_COMMAND_SENT: 'Команда роботу отправлена.',
  INVENTORY_SCAN_COMPLETED: 'Сканирование инвентаря завершено.',
  AI_PREDICTION_GENERATED: 'Прогноз ИИ успешно создан.',
  WEBSOCKET_CONNECTED: 'Подключение к серверу установлено.',
  NOTIFICATION_SENT: 'Уведомление отправлено.'
};

// Предупреждения
export const WARNING_MESSAGES_RU = {
  LOW_BATTERY: 'Низкий уровень заряда батареи у робота.',
  CRITICAL_STOCK: 'Критически низкий уровень запасов.',
  MAINTENANCE_REQUIRED: 'Требуется техническое обслуживание.',
  DATA_OUTDATED: 'Данные устарели. Обновите страницу.',
  CONNECTION_UNSTABLE: 'Нестабильное соединение с сервером.',
  STORAGE_LOW: 'Заканчивается место на сервере.',
  PERFORMANCE_ISSUE: 'Обнаружены проблемы с производительностью.'
};

// Информационные сообщения
export const INFO_MESSAGES_RU = {
  SYSTEM_UPDATE: 'Система обновляется. Некоторые функции могут быть недоступны.',
  MAINTENANCE_SCHEDULED: 'Запланировано техническое обслуживание.',
  NEW_FEATURES: 'Доступны новые функции.',
  DATA_SYNC: 'Синхронизация данных с сервером.',
  BACKUP_CREATED: 'Резервная копия создана.',
  REPORT_GENERATED: 'Отчет сгенерирован.'
};

// Функция для создания уведомления
export const createNotification = (
  dispatch: AppDispatch,
  options: CreateNotificationOptions
): void => {
  dispatch(showNotification(options));
};

// Функция для создания уведомления об ошибке
export const showErrorNotification = (
  dispatch: AppDispatch,
  message: string,
  title: string = 'Ошибка',
  duration: number = 5000
): void => {
  createNotification(dispatch, {
    type: 'error',
    title,
    message,
    duration,
    persistent: false
  });
};

// Функция для создания уведомления об успехе
export const showSuccessNotification = (
  dispatch: AppDispatch,
  message: string,
  title: string = 'Успешно',
  duration: number = 3000
): void => {
  createNotification(dispatch, {
    type: 'success',
    title,
    message,
    duration
  });
};

// Функция для создания предупреждения
export const showWarningNotification = (
  dispatch: AppDispatch,
  message: string,
  title: string = 'Предупреждение',
  duration: number = 4000
): void => {
  createNotification(dispatch, {
    type: 'warning',
    title,
    message,
    duration
  });
};

// Функция для создания информационного уведомления
export const showInfoNotification = (
  dispatch: AppDispatch,
  message: string,
  title: string = 'Информация',
  duration: number = 3000
): void => {
  createNotification(dispatch, {
    type: 'info',
    title,
    message,
    duration
  });
};

// Функция для обработки ошибок API
export const handleApiError = (
  dispatch: AppDispatch,
  error: any,
  context?: string
): void => {
  let message = ERROR_MESSAGES_RU.UNKNOWN_ERROR;
  let title = 'Ошибка';

  if (error.response) {
    // Ошибка с ответом сервера
    const status = error.response.status;
    const errorData = error.response.data;

    switch (status) {
      case 400:
        message = errorData?.error?.messageRu || ERROR_MESSAGES_RU.VALIDATION_ERROR;
        title = 'Ошибка валидации';
        break;
      case 401:
        message = ERROR_MESSAGES_RU.UNAUTHORIZED;
        title = 'Ошибка авторизации';
        break;
      case 403:
        message = ERROR_MESSAGES_RU.FORBIDDEN;
        title = 'Доступ запрещен';
        break;
      case 404:
        message = context ? `${context} не найден` : 'Ресурс не найден';
        title = 'Не найдено';
        break;
      case 408:
        message = ERROR_MESSAGES_RU.TIMEOUT_ERROR;
        title = 'Превышено время ожидания';
        break;
      case 429:
        message = ERROR_MESSAGES_RU.RATE_LIMIT_EXCEEDED;
        title = 'Слишком много запросов';
        break;
      case 500:
        message = ERROR_MESSAGES_RU.INTERNAL_ERROR;
        title = 'Ошибка сервера';
        break;
      case 503:
        message = ERROR_MESSAGES_RU.SERVICE_UNAVAILABLE;
        title = 'Сервис недоступен';
        break;
      default:
        message = errorData?.error?.messageRu || ERROR_MESSAGES_RU.UNKNOWN_ERROR;
        title = 'Ошибка сервера';
    }
  } else if (error.request) {
    // Ошибка сети
    message = ERROR_MESSAGES_RU.NETWORK_ERROR;
    title = 'Ошибка сети';
  } else {
    // Другая ошибка
    message = error.message || ERROR_MESSAGES_RU.UNKNOWN_ERROR;
  }

  showErrorNotification(dispatch, message, title);
};

// Функция для обработки ошибок WebSocket
export const handleWebSocketError = (
  dispatch: AppDispatch,
  error: any
): void => {
  let message = ERROR_MESSAGES_RU.WEBSOCKET_CONNECTION_ERROR;
  let title = 'Ошибка WebSocket';

  switch (error.type) {
    case 'connection':
      message = ERROR_MESSAGES_RU.WEBSOCKET_CONNECTION_ERROR;
      break;
    case 'authentication':
      message = ERROR_MESSAGES_RU.WEBSOCKET_AUTHENTICATION_ERROR;
      title = 'Ошибка авторизации WebSocket';
      break;
    case 'data':
      message = 'Ошибка обработки данных WebSocket';
      break;
    case 'timeout':
      message = ERROR_MESSAGES_RU.TIMEOUT_ERROR;
      break;
    default:
      message = error.message || ERROR_MESSAGES_RU.WEBSOCKET_CONNECTION_ERROR;
  }

  showErrorNotification(dispatch, message, title);
};

// Функция для создания уведомления о переподключении
export const showReconnectingNotification = (
  dispatch: AppDispatch,
  attempt: number,
  maxAttempts: number
): void => {
  const message = `Переподключение к серверу... (${attempt}/${maxAttempts})`;
  
  createNotification(dispatch, {
    type: 'warning',
    title: 'Переподключение',
    message,
    duration: 0, // Не исчезает автоматически
    persistent: true
  });
};

// Функция для создания уведомления о критическом алерте
export const showCriticalAlert = (
  dispatch: AppDispatch,
  message: string,
  title: string = 'Критический алерт',
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
  }>
): void => {
  createNotification(dispatch, {
    type: 'error',
    title,
    message,
    duration: 0, // Не исчезает автоматически
    persistent: true,
    actions
  });
};

// Функция для создания уведомления о роботе
export const showRobotNotification = (
  dispatch: AppDispatch,
  robotId: string,
  status: string,
  batteryLevel?: number
): void => {
  let message = '';
  let type: NotificationType = 'info';
  let title = `Робот ${robotId}`;

  switch (status) {
    case 'offline':
      message = 'Робот отключился';
      type = 'warning';
      break;
    case 'online':
      message = 'Робот подключился';
      type = 'success';
      break;
    case 'low_battery':
      message = `Низкий уровень заряда батареи (${batteryLevel}%)`;
      type = 'warning';
      break;
    case 'maintenance':
      message = 'Робот требует технического обслуживания';
      type = 'warning';
      break;
    case 'stuck':
      message = 'Робот застрял и не может продолжить работу';
      type = 'error';
      break;
    default:
      message = `Статус робота изменился: ${status}`;
  }

  createNotification(dispatch, {
    type,
    title,
    message,
    duration: type === 'error' ? 10000 : 5000
  });
};

// Функция для создания уведомления об инвентаризации
export const showInventoryNotification = (
  dispatch: AppDispatch,
  productName: string,
  quantity: number,
  status: string
): void => {
  let message = '';
  let type: NotificationType = 'info';
  let title = 'Инвентаризация';

  switch (status) {
    case 'CRITICAL':
      message = `Критически низкий уровень запасов: ${productName} (${quantity} шт.)`;
      type = 'error';
      break;
    case 'LOW_STOCK':
      message = `Низкий уровень запасов: ${productName} (${quantity} шт.)`;
      type = 'warning';
      break;
    case 'OK':
      message = `Нормальный уровень запасов: ${productName} (${quantity} шт.)`;
      type = 'success';
      break;
    default:
      message = `Обновление запасов: ${productName} (${quantity} шт.)`;
  }

  createNotification(dispatch, {
    type,
    title,
    message,
    duration: type === 'error' ? 10000 : 5000
  });
};

