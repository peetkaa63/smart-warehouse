import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { ErrorCode, ErrorSeverity, ErrorResponse, ErrorLog } from '../types/errors';
import { getErrorMessageRu, getSpecificErrorMessageRu } from '../errors/ErrorMessages';
import { v4 as uuidv4 } from 'uuid';

// Интерфейс для расширенного Request с информацией об ошибках
interface ErrorRequest extends Request {
  requestId?: string;
  userId?: string;
  startTime?: number;
}

// Логирование ошибок
const logError = (error: AppError, req: ErrorRequest): void => {
  const errorLog: ErrorLog = {
    errorId: uuidv4(),
    code: error.code,
    message: error.message,
    stack: error.stack,
    requestId: req.requestId,
    userId: req.userId,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    timestamp: new Date(),
    severity: error.severity,
    details: error.details
  };

  // Логируем в консоль с цветовой кодировкой
  const severityColors = {
    [ErrorSeverity.LOW]: '\x1b[36m',     // Cyan
    [ErrorSeverity.MEDIUM]: '\x1b[33m',  // Yellow
    [ErrorSeverity.HIGH]: '\x1b[31m',    // Red
    [ErrorSeverity.CRITICAL]: '\x1b[35m' // Magenta
  };

  const color = severityColors[error.severity] || '\x1b[0m';
  const reset = '\x1b[0m';

  console.error(`${color}🚨 [${error.severity}] ${error.code}${reset}`);
  console.error(`${color}📊 Request ID: ${errorLog.requestId}${reset}`);
  console.error(`${color}👤 User ID: ${errorLog.userId || 'N/A'}${reset}`);
  console.error(`${color}🌐 ${req.method} ${req.url}${reset}`);
  console.error(`${color}💬 ${error.message}${reset}`);
  
  if (error.details) {
    console.error(`${color}📋 Details: ${JSON.stringify(error.details, null, 2)}${reset}`);
  }

  // В production здесь бы отправляли в систему мониторинга
  if (process.env.NODE_ENV === 'production') {
    // Sentry, DataDog, или другая система мониторинга
    console.log('📤 Sending error to monitoring system:', errorLog.errorId);
  }
};

// Обработка ошибок валидации
const handleValidationError = (error: any, req: ErrorRequest): AppError => {
  const details = error.errors || error.details || [];
  const validationErrors = Array.isArray(details) 
    ? details.map((err: any) => ({
        field: err.path || err.field || 'unknown',
        message: err.message || 'Validation error',
        value: err.value
      }))
    : [];

  return AppError.validation(
    'Ошибка валидации данных',
    { validationErrors },
    req.requestId
  );
};

// Обработка ошибок JWT
const handleJWTError = (req: ErrorRequest): AppError => {
  return AppError.unauthorized('Недействительный токен авторизации', req.requestId);
};

// Обработка ошибок истечения JWT
const handleJWTExpiredError = (req: ErrorRequest): AppError => {
  return AppError.unauthorized('Токен авторизации истек', req.requestId);
};

// Обработка ошибок базы данных
const handleDatabaseError = (error: any, req: ErrorRequest): AppError => {
  let message = 'Ошибка базы данных';
  let details: any = {};

  if (error.code === '23505') { // Unique violation
    message = 'Запись с такими данными уже существует';
    details = { constraint: error.constraint };
  } else if (error.code === '23503') { // Foreign key violation
    message = 'Нарушение целостности данных';
    details = { constraint: error.constraint };
  } else if (error.code === '23502') { // Not null violation
    message = 'Обязательное поле не заполнено';
    details = { column: error.column };
  } else if (error.code === '42P01') { // Undefined table
    message = 'Таблица не найдена';
  } else if (error.code === '42703') { // Undefined column
    message = 'Колонка не найдена';
  }

  return AppError.database(message, details, req.requestId);
};

// Обработка ошибок WebSocket
const handleWebSocketError = (error: any, req: ErrorRequest): AppError => {
  return AppError.websocketConnection(
    'Ошибка WebSocket соединения',
    { originalError: error.message },
    req.requestId
  );
};

// Основной error middleware
export const errorHandler = (
  error: any,
  req: ErrorRequest,
  res: Response,
  next: NextFunction
): void => {
  let appError: AppError;

  // Если это уже AppError, используем его
  if (error instanceof AppError) {
    appError = error;
  } else {
    // Преобразуем другие ошибки в AppError
    switch (error.name) {
      case 'ValidationError':
      case 'CastError':
        appError = handleValidationError(error, req);
        break;
      
      case 'JsonWebTokenError':
        appError = handleJWTError(req);
        break;
      
      case 'TokenExpiredError':
        appError = handleJWTExpiredError(req);
        break;
      
      case 'SequelizeValidationError':
      case 'SequelizeUniqueConstraintError':
      case 'SequelizeForeignKeyConstraintError':
        appError = handleValidationError(error, req);
        break;
      
      case 'SequelizeDatabaseError':
        appError = handleDatabaseError(error, req);
        break;
      
      case 'WebSocketError':
        appError = handleWebSocketError(error, req);
        break;
      
      default:
        // Неизвестная ошибка
        appError = AppError.internal(
          error.message || 'Внутренняя ошибка сервера',
          { originalError: error.name },
          req.requestId
        );
    }
  }

  // Логируем ошибку
  logError(appError, req);

  // Формируем ответ
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      messageRu: getErrorMessageRu(appError.code, appError.details),
      statusCode: appError.statusCode,
      severity: appError.severity,
      timestamp: appError.timestamp.toISOString(),
      requestId: appError.requestId,
      details: appError.details,
      stack: process.env.NODE_ENV === 'development' ? appError.stack : undefined
    }
  };

  // Отправляем ответ
  res.status(appError.statusCode).json(errorResponse);
};

// Middleware для обработки 404 ошибок
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = AppError.notFound(
    `Маршрут ${req.method} ${req.url} не найден`,
    (req as ErrorRequest).requestId
  );

  next(error);
};

// Middleware для обработки необработанных промисов
export const unhandledRejectionHandler = (reason: any, promise: Promise<any>): void => {
  console.error('🚨 Unhandled Promise Rejection:', reason);
  
  // В production здесь бы отправляли в систему мониторинга
  if (process.env.NODE_ENV === 'production') {
    // Логирование в систему мониторинга
  }
};

// Middleware для обработки необработанных исключений
export const uncaughtExceptionHandler = (error: Error): void => {
  console.error('🚨 Uncaught Exception:', error);
  
  // В production здесь бы отправляли в систему мониторинга
  if (process.env.NODE_ENV === 'production') {
    // Логирование в систему мониторинга
  }
  
  // Завершаем процесс
  process.exit(1);
};

// Middleware для добавления request ID
export const requestIdMiddleware = (req: ErrorRequest, res: Response, next: NextFunction): void => {
  req.requestId = uuidv4();
  req.startTime = Date.now();
  
  // Добавляем request ID в заголовки ответа
    res.setHeader('X-Request-ID', req.requestId || '');
  
  next();
};

// Middleware для логирования запросов
export const requestLoggerMiddleware = (req: ErrorRequest, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusColor = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
    const reset = '\x1b[0m';
    
    console.log(
      `${statusColor}${req.method} ${req.url} ${res.statusCode}${reset} - ` +
      `${duration}ms - ${req.requestId}`
    );
  });
  
  next();
};
