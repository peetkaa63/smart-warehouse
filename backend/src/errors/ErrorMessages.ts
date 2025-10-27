import { ErrorCode } from '../types/errors';

// Маппинг кодов ошибок на русские сообщения
export const ERROR_MESSAGES_RU: Record<ErrorCode, string> = {
  // Общие ошибки
  [ErrorCode.INTERNAL_SERVER_ERROR]: 'Внутренняя ошибка сервера. Попробуйте позже.',
  [ErrorCode.VALIDATION_ERROR]: 'Ошибка валидации данных.',
  [ErrorCode.UNAUTHORIZED]: 'Необходима авторизация.',
  [ErrorCode.FORBIDDEN]: 'Доступ запрещен.',
  [ErrorCode.NOT_FOUND]: 'Ресурс не найден.',
  [ErrorCode.CONFLICT]: 'Конфликт данных.',
  [ErrorCode.BAD_REQUEST]: 'Некорректный запрос.',
  
  // Аутентификация
  [ErrorCode.INVALID_CREDENTIALS]: 'Неверный email или пароль.',
  [ErrorCode.TOKEN_EXPIRED]: 'Токен авторизации истек. Войдите в систему заново.',
  [ErrorCode.TOKEN_INVALID]: 'Недействительный токен авторизации.',
  [ErrorCode.ACCOUNT_LOCKED]: 'Аккаунт заблокирован. Обратитесь к администратору.',
  
  // База данных
  [ErrorCode.DATABASE_CONNECTION_ERROR]: 'Ошибка подключения к базе данных.',
  [ErrorCode.DATABASE_QUERY_ERROR]: 'Ошибка выполнения запроса к базе данных.',
  [ErrorCode.RECORD_NOT_FOUND]: 'Запись не найдена в базе данных.',
  [ErrorCode.DUPLICATE_RECORD]: 'Запись с такими данными уже существует.',
  
  // WebSocket
  [ErrorCode.WEBSOCKET_CONNECTION_ERROR]: 'Ошибка подключения к WebSocket.',
  [ErrorCode.WEBSOCKET_AUTHENTICATION_ERROR]: 'Ошибка авторизации WebSocket соединения.',
  
  // Роботы
  [ErrorCode.ROBOT_NOT_FOUND]: 'Робот не найден.',
  [ErrorCode.ROBOT_OFFLINE]: 'Робот находится в офлайн режиме.',
  [ErrorCode.ROBOT_COMMAND_FAILED]: 'Не удалось выполнить команду робота.',
  
  // Инвентаризация
  [ErrorCode.PRODUCT_NOT_FOUND]: 'Товар не найден.',
  [ErrorCode.INSUFFICIENT_STOCK]: 'Недостаточно товара на складе.',
  [ErrorCode.INVENTORY_SCAN_FAILED]: 'Ошибка сканирования инвентаря.',
  
  // AI
  [ErrorCode.AI_SERVICE_UNAVAILABLE]: 'Сервис искусственного интеллекта недоступен.',
  [ErrorCode.AI_PREDICTION_FAILED]: 'Не удалось получить прогноз от ИИ.',
  
  // Файлы
  [ErrorCode.FILE_UPLOAD_ERROR]: 'Ошибка загрузки файла.',
  [ErrorCode.FILE_FORMAT_ERROR]: 'Неподдерживаемый формат файла.',
  [ErrorCode.FILE_SIZE_EXCEEDED]: 'Размер файла превышает допустимый лимит.',
  
  // Внешние сервисы
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'Ошибка внешнего сервиса.',
  [ErrorCode.API_RATE_LIMIT_EXCEEDED]: 'Превышен лимит запросов к API.',
};

// Дополнительные сообщения для конкретных случаев
export const SPECIFIC_ERROR_MESSAGES_RU: Record<string, string> = {
  // Валидация
  'email_required': 'Email обязателен для заполнения.',
  'email_invalid': 'Некорректный формат email адреса.',
  'password_required': 'Пароль обязателен для заполнения.',
  'password_too_short': 'Пароль должен содержать минимум 8 символов.',
  'password_weak': 'Пароль слишком простой. Используйте буквы, цифры и специальные символы.',
  
  // Роботы
  'robot_battery_low': 'У робота низкий уровень заряда батареи.',
  'robot_stuck': 'Робот застрял и не может продолжить работу.',
  'robot_maintenance_required': 'Робот требует технического обслуживания.',
  
  // Инвентаризация
  'inventory_count_mismatch': 'Несоответствие количества товара в системе и на складе.',
  'product_expired': 'Товар с истекшим сроком годности обнаружен.',
  'zone_access_denied': 'Нет доступа к указанной зоне склада.',
  
  // AI
  'ai_prediction_insufficient_data': 'Недостаточно данных для создания прогноза.',
  'ai_model_loading_failed': 'Не удалось загрузить модель ИИ.',
  
  // Файлы
  'csv_format_error': 'Ошибка формата CSV файла.',
  'excel_format_error': 'Ошибка формата Excel файла.',
  'file_corrupted': 'Файл поврежден и не может быть обработан.',
  
  // Сеть
  'network_timeout': 'Превышено время ожидания ответа сервера.',
  'network_unavailable': 'Сетевое соединение недоступно.',
  'server_overloaded': 'Сервер перегружен. Попробуйте позже.',
};

// Функция для получения русского сообщения об ошибке
export function getErrorMessageRu(errorCode: ErrorCode, context?: any): string {
  let message = ERROR_MESSAGES_RU[errorCode] || 'Неизвестная ошибка.';
  
  // Добавляем контекстную информацию
  if (context) {
    if (context.robotId) {
      message = message.replace('Робот', `Робот ${context.robotId}`);
    }
    if (context.productId) {
      message = message.replace('Товар', `Товар ${context.productId}`);
    }
    if (context.zone) {
      message = message.replace('зону', `зону ${context.zone}`);
    }
  }
  
  return message;
}

// Функция для получения специфического сообщения
export function getSpecificErrorMessageRu(key: string, context?: any): string {
  let message = SPECIFIC_ERROR_MESSAGES_RU[key] || 'Неизвестная ошибка.';
  
  // Добавляем контекстную информацию
  if (context) {
    Object.keys(context).forEach(key => {
      const placeholder = `{${key}}`;
      if (message.includes(placeholder)) {
        message = message.replace(placeholder, context[key]);
      }
    });
  }
  
  return message;
}

// Функция для комбинирования сообщений
export function combineErrorMessages(baseMessage: string, additionalInfo?: string): string {
  if (!additionalInfo) return baseMessage;
  return `${baseMessage} ${additionalInfo}`;
}

