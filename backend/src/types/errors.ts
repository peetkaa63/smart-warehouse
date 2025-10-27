// Типы ошибок для структурированной обработки

export enum ErrorCode {
  // Общие ошибки
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  BAD_REQUEST = 'BAD_REQUEST',
  
  // Аутентификация
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  
  // База данных
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  DATABASE_QUERY_ERROR = 'DATABASE_QUERY_ERROR',
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  DUPLICATE_RECORD = 'DUPLICATE_RECORD',
  
  // WebSocket
  WEBSOCKET_CONNECTION_ERROR = 'WEBSOCKET_CONNECTION_ERROR',
  WEBSOCKET_AUTHENTICATION_ERROR = 'WEBSOCKET_AUTHENTICATION_ERROR',
  
  // Роботы
  ROBOT_NOT_FOUND = 'ROBOT_NOT_FOUND',
  ROBOT_OFFLINE = 'ROBOT_OFFLINE',
  ROBOT_COMMAND_FAILED = 'ROBOT_COMMAND_FAILED',
  
  // Инвентаризация
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  INVENTORY_SCAN_FAILED = 'INVENTORY_SCAN_FAILED',
  
  // AI
  AI_SERVICE_UNAVAILABLE = 'AI_SERVICE_UNAVAILABLE',
  AI_PREDICTION_FAILED = 'AI_PREDICTION_FAILED',
  
  // Файлы
  FILE_UPLOAD_ERROR = 'FILE_UPLOAD_ERROR',
  FILE_FORMAT_ERROR = 'FILE_FORMAT_ERROR',
  FILE_SIZE_EXCEEDED = 'FILE_SIZE_EXCEEDED',
  
  // Внешние сервисы
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  API_RATE_LIMIT_EXCEEDED = 'API_RATE_LIMIT_EXCEEDED',
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface AppError extends Error {
  code: ErrorCode;
  statusCode: number;
  severity: ErrorSeverity;
  details?: any;
  timestamp: Date;
  requestId?: string;
  userId?: string;
  isOperational: boolean;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    messageRu: string;
    statusCode: number;
    severity: ErrorSeverity;
    timestamp: string;
    requestId?: string;
    details?: any;
    stack?: string;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ErrorLog {
  errorId: string;
  code: ErrorCode;
  message: string;
  stack?: string;
  requestId?: string;
  userId?: string;
  url?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  timestamp: Date;
  severity: ErrorSeverity;
  details?: any;
}

