import { ErrorCode, ErrorSeverity, AppError as IAppError } from '../types/errors';

export class AppError extends Error implements IAppError {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly severity: ErrorSeverity;
  public readonly details?: any;
  public readonly timestamp: Date;
  public readonly requestId?: string;
  public readonly userId?: string;
  public readonly isOperational: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    details?: any,
    requestId?: string,
    userId?: string,
    isOperational: boolean = true
  ) {
    super(message);
    
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.severity = severity;
    this.details = details;
    this.timestamp = new Date();
    this.requestId = requestId;
    this.userId = userId;
    this.isOperational = isOperational;

    // Сохраняем оригинальный стек вызовов
    Error.captureStackTrace(this, this.constructor);
  }

  // Статические методы для создания типизированных ошибок
  static validation(message: string, details?: any, requestId?: string): AppError {
    return new AppError(
      ErrorCode.VALIDATION_ERROR,
      message,
      400,
      ErrorSeverity.LOW,
      details,
      requestId
    );
  }

  static unauthorized(message: string = 'Unauthorized', requestId?: string): AppError {
    return new AppError(
      ErrorCode.UNAUTHORIZED,
      message,
      401,
      ErrorSeverity.MEDIUM,
      undefined,
      requestId
    );
  }

  static forbidden(message: string = 'Forbidden', requestId?: string): AppError {
    return new AppError(
      ErrorCode.FORBIDDEN,
      message,
      403,
      ErrorSeverity.MEDIUM,
      undefined,
      requestId
    );
  }

  static notFound(message: string = 'Resource not found', requestId?: string): AppError {
    return new AppError(
      ErrorCode.NOT_FOUND,
      message,
      404,
      ErrorSeverity.LOW,
      undefined,
      requestId
    );
  }

  static conflict(message: string, details?: any, requestId?: string): AppError {
    return new AppError(
      ErrorCode.CONFLICT,
      message,
      409,
      ErrorSeverity.MEDIUM,
      details,
      requestId
    );
  }

  static database(message: string, details?: any, requestId?: string): AppError {
    return new AppError(
      ErrorCode.DATABASE_QUERY_ERROR,
      message,
      500,
      ErrorSeverity.HIGH,
      details,
      requestId
    );
  }

  static internal(message: string = 'Internal server error', details?: any, requestId?: string): AppError {
    return new AppError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      message,
      500,
      ErrorSeverity.CRITICAL,
      details,
      requestId,
      undefined,
      false
    );
  }

  static robotNotFound(robotId: string, requestId?: string): AppError {
    return new AppError(
      ErrorCode.ROBOT_NOT_FOUND,
      `Robot with ID ${robotId} not found`,
      404,
      ErrorSeverity.MEDIUM,
      { robotId },
      requestId
    );
  }

  static robotOffline(robotId: string, requestId?: string): AppError {
    return new AppError(
      ErrorCode.ROBOT_OFFLINE,
      `Robot ${robotId} is offline`,
      400,
      ErrorSeverity.MEDIUM,
      { robotId },
      requestId
    );
  }

  static productNotFound(productId: string, requestId?: string): AppError {
    return new AppError(
      ErrorCode.PRODUCT_NOT_FOUND,
      `Product with ID ${productId} not found`,
      404,
      ErrorSeverity.LOW,
      { productId },
      requestId
    );
  }

  static aiServiceUnavailable(service: string, requestId?: string): AppError {
    return new AppError(
      ErrorCode.AI_SERVICE_UNAVAILABLE,
      `AI service ${service} is unavailable`,
      503,
      ErrorSeverity.HIGH,
      { service },
      requestId
    );
  }

  static websocketConnection(message: string, details?: any, requestId?: string): AppError {
    return new AppError(
      ErrorCode.WEBSOCKET_CONNECTION_ERROR,
      message,
      500,
      ErrorSeverity.HIGH,
      details,
      requestId
    );
  }

  // Метод для сериализации ошибки
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      severity: this.severity,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      requestId: this.requestId,
      userId: this.userId,
      isOperational: this.isOperational,
      stack: this.stack
    };
  }
}

