import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Stack,
  Chip,
  Divider,
  Collapse,
  IconButton
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Home as HomeIcon,
  BugReport as BugReportIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Отправляем ошибку в систему мониторинга
    this.logError(error, errorInfo);
    
    // Вызываем пользовательский обработчик
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    const errorData = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      retryCount: this.retryCount
    };

    // В реальном приложении здесь бы отправляли в систему мониторинга
    console.error('📊 Error logged:', errorData);
    
    // Сохраняем в localStorage для отладки
    const errors = JSON.parse(localStorage.getItem('app_errors') || '[]');
    errors.push(errorData);
    localStorage.setItem('app_errors', JSON.stringify(errors.slice(-10))); // Храним только последние 10
  };

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        showDetails: false
      });
    } else {
      // После максимального количества попыток перезагружаем страницу
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  private handleReportBug = () => {
    const errorData = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };

    // В реальном приложении здесь бы открывалась форма отправки бага
    const mailto = `mailto:support@smartwarehouse.ru?subject=Ошибка в приложении&body=${encodeURIComponent(JSON.stringify(errorData, null, 2))}`;
    window.open(mailto);
  };

  private toggleDetails = () => {
    this.setState(prev => ({
      showDetails: !prev.showDetails
    }));
  };

  private getErrorMessage = (error: Error): string => {
    // Маппинг технических ошибок на понятные пользователю сообщения
    const errorMessages: Record<string, string> = {
      'Network Error': 'Проблема с подключением к серверу. Проверьте интернет-соединение.',
      'Failed to fetch': 'Не удалось загрузить данные. Попробуйте обновить страницу.',
      'ChunkLoadError': 'Ошибка загрузки модуля. Попробуйте очистить кэш браузера.',
      'TypeError': 'Ошибка обработки данных. Обратитесь в поддержку.',
      'ReferenceError': 'Ошибка в коде приложения. Обратитесь в поддержку.',
      'SyntaxError': 'Ошибка синтаксиса. Обратитесь в поддержку.'
    };

    // Проверяем точное совпадение
    if (errorMessages[error.name]) {
      return errorMessages[error.name];
    }

    // Проверяем сообщение на ключевые слова
    const message = error.message.toLowerCase();
    if (message.includes('network') || message.includes('fetch')) {
      return 'Проблема с подключением к серверу. Проверьте интернет-соединение.';
    }
    if (message.includes('timeout')) {
      return 'Превышено время ожидания ответа сервера. Попробуйте позже.';
    }
    if (message.includes('unauthorized') || message.includes('401')) {
      return 'Сессия истекла. Пожалуйста, войдите в систему заново.';
    }
    if (message.includes('forbidden') || message.includes('403')) {
      return 'Недостаточно прав для выполнения операции.';
    }
    if (message.includes('not found') || message.includes('404')) {
      return 'Запрашиваемый ресурс не найден.';
    }
    if (message.includes('server') || message.includes('500')) {
      return 'Внутренняя ошибка сервера. Попробуйте позже.';
    }

    return 'Произошла неожиданная ошибка. Попробуйте обновить страницу.';
  };

  private getErrorSeverity = (error: Error): 'error' | 'warning' | 'info' => {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return 'warning'; // Проблемы с сетью - предупреждение
    }
    
    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return 'info'; // Проблемы с авторизацией - информация
    }
    
    return 'error'; // Остальные ошибки - критичные
  };

  render() {
    if (this.state.hasError) {
      const { error, errorId, showDetails } = this.state;
      const errorMessage = error ? this.getErrorMessage(error) : 'Произошла неизвестная ошибка';
      const severity = error ? this.getErrorSeverity(error) : 'error';
      const canRetry = this.retryCount < this.maxRetries;

      return (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <Box
              sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              }}
            >
              <Paper
                elevation={24}
                sx={{
                  maxWidth: 600,
                  width: '100%',
                  p: 4,
                  borderRadius: 3,
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <Stack spacing={3} alignItems="center">
                  {/* Иконка ошибки */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  >
                    <ErrorIcon 
                      sx={{ 
                        fontSize: 80, 
                        color: severity === 'error' ? 'error.main' : 
                               severity === 'warning' ? 'warning.main' : 'info.main'
                      }} 
                    />
                  </motion.div>

                  {/* Заголовок */}
                  <Typography variant="h4" component="h1" textAlign="center" fontWeight="bold">
                    Упс! Что-то пошло не так
                  </Typography>

                  {/* ID ошибки */}
                  <Chip
                    label={`ID ошибки: ${errorId}`}
                    size="small"
                    color="default"
                    variant="outlined"
                    icon={<BugReportIcon />}
                  />

                  {/* Сообщение об ошибке */}
                  <Alert severity={severity} sx={{ width: '100%' }}>
                    <AlertTitle>
                      {severity === 'error' ? 'Критическая ошибка' :
                       severity === 'warning' ? 'Предупреждение' : 'Информация'}
                    </AlertTitle>
                    {errorMessage}
                  </Alert>

                  {/* Кнопки действий */}
                  <Stack direction="row" spacing={2} flexWrap="wrap" justifyContent="center">
                    {canRetry && (
                      <Button
                        variant="contained"
                        startIcon={<RefreshIcon />}
                        onClick={this.handleRetry}
                        color="primary"
                        size="large"
                      >
                        Попробовать снова ({this.maxRetries - this.retryCount} попыток)
                      </Button>
                    )}
                    
                    <Button
                      variant="outlined"
                      startIcon={<HomeIcon />}
                      onClick={this.handleGoHome}
                      size="large"
                    >
                      На главную
                    </Button>
                    
                    <Button
                      variant="text"
                      startIcon={<BugReportIcon />}
                      onClick={this.handleReportBug}
                      size="large"
                    >
                      Сообщить об ошибке
                    </Button>
                  </Stack>

                  {/* Детали ошибки (для разработчиков) */}
                  {process.env.NODE_ENV === 'development' && error && (
                    <>
                      <Divider sx={{ width: '100%' }} />
                      
                      <Button
                        variant="text"
                        endIcon={showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        onClick={this.toggleDetails}
                        size="small"
                      >
                        {showDetails ? 'Скрыть детали' : 'Показать детали'}
                      </Button>

                      <Collapse in={showDetails}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 2,
                            width: '100%',
                            backgroundColor: 'grey.50',
                            maxHeight: 300,
                            overflow: 'auto'
                          }}
                        >
                          <Typography variant="subtitle2" gutterBottom>
                            Сообщение об ошибке:
                          </Typography>
                          <Typography variant="body2" component="pre" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                            {error.message}
                          </Typography>
                          
                          <Typography variant="subtitle2" gutterBottom>
                            Стек вызовов:
                          </Typography>
                          <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>
                            {error.stack}
                          </Typography>
                        </Paper>
                      </Collapse>
                    </>
                  )}
                </Stack>
              </Paper>
            </Box>
          </motion.div>
        </AnimatePresence>
      );
    }

    return this.props.children;
  }
}

// HOC для оборачивания компонентов в Error Boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

export default ErrorBoundary;

