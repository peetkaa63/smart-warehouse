// components/AIPredictions.tsx - полностью обновленная версия
import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  CircularProgress,
  Chip,
  Alert,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Snackbar,
  Collapse,
  Fade
} from '@mui/material';
import { 
  Refresh, 
  Warning, 
  Info, 
  ExpandMore,
  TrendingUp,
  SmartToy
} from '@mui/icons-material';
import { aiAPI } from '../services/api';
import { useSpring, animated } from '@react-spring/web';

interface AIPrediction {
  product_id: string;
  product_name: string;
  current_stock: number;
  days_until_stockout: number | null;
  recommended_order_quantity: number;
  confidence_score: number;
  reasoning?: string;
  risk_level?: 'HIGH' | 'MEDIUM' | 'LOW';
  prediction_date?: string;
  zone?: string;
  row_number?: number;
  shelf_number?: number;
}

interface AIResponse {
  predictions: AIPrediction[];
  period_days: number;
  analysis_summary?: string;
  generated_at: string;
  ai_model?: string;
  note?: string;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
  isFallback?: boolean;
  fallbackReason?: string;
}

const AIPredictions: React.FC = () => {
  const [predictions, setPredictions] = useState<AIPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState<number>(7);
  const [aiModel, setAiModel] = useState<string>('AI Service');
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [aiError, setAiError] = useState<string | null>(null);
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  // Animations
  const contentAnimation = useSpring({
    height: !loading ? 'auto' : 0,
    opacity: !loading ? 1 : 0,
    config: { tension: 200, friction: 20 }
  });
  const AnimatedBox = animated(Box as any);

  // Меню для дополнительных опций
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const loadPredictions = async (forceRefresh: boolean = false) => {
    setLoading(true);
    setError(null);
    setAiError(null);
    setIsFallbackMode(false);
    
    try {
      console.log('🔄 Loading AI predictions...');
      
      let response: AIResponse;
      
      if (forceRefresh) {
        response = await aiAPI.refreshPredictions(periodDays);
      } else {
        response = await aiAPI.getPredictions(periodDays);
      }

      console.log('✅ AI predictions loaded:', response.predictions?.length);
      
      // Нормализация полей предсказаний на клиенте
      const normalized = (response.predictions || []).map((p: any) => ({
        product_id: p.product_id,
        product_name: p.product_name || p.name || p.productId || 'Товар',
        // Используем реальные данные из ответа, если они есть
        current_stock: Number(p.current_stock) || Number(p.stock) || Number(p.currentStock) || 0,
        days_until_stockout: (p.days_until_stockout !== undefined && p.days_until_stockout !== null 
          ? Number(p.days_until_stockout) 
          : (p.daysUntilStockout !== undefined && p.daysUntilStockout !== null ? Number(p.daysUntilStockout) : (p.days !== undefined && p.days !== null ? Number(p.days) : null))) as number | null,
        recommended_order_quantity: Number(p.recommended_order_quantity) || Number(p.recommended_order) || Number(p.recommended) || 0,
        confidence_score: typeof p.confidence_score === 'number' 
          ? p.confidence_score 
          : (typeof p.confidence === 'number' ? p.confidence : 0),
        reasoning: p.reasoning || '',
        risk_level: p.risk_level || p.risk || undefined,
        prediction_date: p.prediction_date || p.date || undefined,
        // Информация о месте пополнения (если есть)
        zone: p.zone,
        row_number: p.row_number,
        shelf_number: p.shelf_number
      }));

      setPredictions(normalized);
      setLastUpdated(new Date());
      
      // Определяем модель AI и статус
      if (response.isFallback) {
        setIsFallbackMode(true);
        setAiModel('Fallback System');
        setAiError(response.fallbackReason || 'Используется резервная система');
        
        if (response.error) {
          setAiError(`${response.error.message}: ${response.error.details || ''}`);
        }
        
        setSnackbar({ 
          open: true, 
          message: `Fallback режим: ${response.fallbackReason || 'AI недоступен'}` 
        });
      } else {
        setAiModel(response.ai_model || 'AI Service');
        setIsFallbackMode(false);
        setAiError(null);
        
        if (response.note) {
          setSnackbar({ open: true, message: response.note });
        }
      }

    } catch (err: any) {
      console.error('❌ Error loading AI predictions:', err);
      setError(err.response?.data?.error || 'Ошибка загрузки прогнозов');
      setSnackbar({ open: true, message: 'Используются резервные прогнозы' });
      
      // Fallback - загружаем историю последних прогнозов
      try {
        const history = await aiAPI.getPredictionHistory(5);
        if (history && history.length > 0) {
          setPredictions(history);
          setAiModel('Historical Data');
          setIsFallbackMode(true);
          setAiError('AI сервис недоступен, используются исторические данные');
        }
      } catch (historyError) {
        console.error('Failed to load prediction history:', historyError);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPredictions();
    
    // Автообновление каждые 30 минут
    const interval = setInterval(() => loadPredictions(), 30 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodDays]);

  const handlePeriodChange = (event: any) => {
    setPeriodDays(event.target.value);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleForceRefresh = () => {
    handleMenuClose();
    loadPredictions(true);
  };

  const handleViewHistory = async () => {
    handleMenuClose();
    try {
      const history = await aiAPI.getPredictionHistory(10);
      setPredictions(history);
      setAiModel('Prediction History');
    } catch (err) {
      console.error('Error loading history:', err);
    }
  };

  const getRiskColor = (risk?: string) => {
    switch (risk) {
      case 'HIGH': return 'error';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'success';
      default: return 'default';
    }
  };

  const getStockoutColor = (days: number | null) => {
    if (days === null) return 'default';
    if (days <= 2) return 'error';
    if (days <= 5) return 'warning';
    return 'success';
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'warning';
    return 'error';
  };

  const getStockoutText = (days: number | null) => {
    if (days === null) return 'Не определено';
    if (days <= 0) return 'ЗАКОНЧИЛСЯ';
    if (days <= 2) return `${days} дн. ⚠️`;
    if (days <= 5) return `${days} дн.`;
    return `${days} дн. ✅`;
  };

  return (
    <Paper sx={{ 
      p: 3, 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      transition: 'height 0.3s ease-in-out',
      minHeight: loading ? '300px' : 'auto'
    }}>
      {/* Заголовок с управлением */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SmartToy color={isFallbackMode ? "warning" : "primary"} />
          <Typography variant="h6" component="h2">
            Прогноз ИИ
          </Typography>
          <Chip 
            label={aiModel}
            size="small"
            variant={isFallbackMode ? "filled" : "outlined"}
            color={isFallbackMode ? "warning" : "primary"}
            icon={isFallbackMode ? <Warning /> : undefined}
          />
          {isFallbackMode && (
            <Chip 
              label="Fallback"
              size="small"
              color="warning"
              variant="outlined"
            />
          )}
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Период</InputLabel>
            <Select
              value={periodDays}
              onChange={handlePeriodChange}
              label="Период"
              disabled={loading}
            >
              <MenuItem value={7}>7 дней</MenuItem>
              <MenuItem value={14}>14 дней</MenuItem>
              <MenuItem value={30}>30 дней</MenuItem>
            </Select>
          </FormControl>

          {lastUpdated && (
            <Typography variant="caption" color="textSecondary" sx={{ mx: 1 }}>
              {lastUpdated.toLocaleTimeString('ru-RU')}
            </Typography>
          )}

          <Button
            variant="outlined"
            size="small"
            startIcon={<Refresh />}
            onClick={() => loadPredictions()}
            disabled={loading}
          >
            Обновить
          </Button>

          <IconButton
            size="small"
            onClick={handleMenuOpen}
            disabled={loading}
          >
            <ExpandMore />
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleForceRefresh}>
              <Refresh fontSize="small" sx={{ mr: 1 }} />
              Принудительное обновление
            </MenuItem>
            <MenuItem onClick={handleViewHistory}>
              <TrendingUp fontSize="small" sx={{ mr: 1 }} />
              История прогнозов
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Сообщения об ошибках */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Сообщения об ошибках AI */}
      {aiError && (
        <Alert 
          severity={isFallbackMode ? "warning" : "error"} 
          sx={{ mb: 2 }} 
          onClose={() => setAiError(null)}
          icon={<SmartToy />}
        >
          <Typography variant="subtitle2" gutterBottom>
            {isFallbackMode ? 'Fallback режим активен' : 'Ошибка AI сервиса'}
          </Typography>
          <Typography variant="body2">
            {aiError}
          </Typography>
          {isFallbackMode && (
            <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
              Используются локальные алгоритмы вместо AI для генерации прогнозов
            </Typography>
          )}
        </Alert>
      )}

      {/* Прогресс загрузки с анимацией */}
      <Collapse in={loading} timeout={300}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          py: 4, 
          flexGrow: 1,
          minHeight: '200px'
        }}>
          <Fade in={loading} timeout={400}>
            <Box textAlign="center">
              <CircularProgress size={40} />
              <Typography variant="body2" sx={{ mt: 1 }}>
                AI анализирует данные...
              </Typography>
            </Box>
          </Fade>
        </Box>
      </Collapse>

      {/* Контент прогнозов с анимацией */}
      <AnimatedBox style={{ ...contentAnimation, overflow: 'hidden' }}>
        <Collapse in={!loading} timeout={300}>
          <Fade in={!loading} timeout={400}>
            <Box sx={{ flexGrow: 1, opacity: loading ? 0 : 1, transition: 'opacity 0.3s ease-in-out' }}>
              {predictions.length === 0 ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                Нет данных для прогноза. Загрузите исторические данные через CSV.
              </Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {predictions.slice(0, 5).map((prediction, index) => (
                <Paper 
                  key={`${prediction.product_id}-${index}`} 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    borderLeft: 4, 
                    borderColor: getStockoutColor(prediction.days_until_stockout),
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: 1,
                      transform: 'translateY(-1px)'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ flex: 1 }}>
                      {prediction.product_name}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Chip 
                        label={getStockoutText(prediction.days_until_stockout)}
                        color={getStockoutColor(prediction.days_until_stockout)}
                        size="small"
                        variant="filled"
                      />
                      <Chip 
                        label={`${Math.round(prediction.confidence_score * 100)}%`}
                        color={getConfidenceColor(prediction.confidence_score)}
                        variant="outlined"
                        size="small"
                      />
                    </Box>
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1, mb: 1 }}>
                    <Typography variant="body2">
                      📦 Текущий остаток: <strong>{prediction.current_stock} шт.</strong>
                    </Typography>
                    <Typography variant="body2">
                      🛒 Рекомендуемый заказ: <strong>{prediction.recommended_order_quantity} шт.</strong>
                    </Typography>
                  </Box>

                  {(prediction.zone || prediction.row_number || prediction.shelf_number) && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="textSecondary">
                        📍 Рекомендация пополнения: 
                        <strong>
                          {prediction.zone ? ` Зона ${prediction.zone}` : ''}
                          {prediction.row_number ? `, Ряд ${prediction.row_number}` : ''}
                          {prediction.shelf_number ? `, Полка ${prediction.shelf_number}` : ''}
                        </strong>
                      </Typography>
                    </Box>
                  )}

                  {prediction.reasoning && (
                    <Tooltip title={prediction.reasoning} arrow>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mt: 1 }}>
                        <Info fontSize="small" color="action" sx={{ mt: 0.2 }} />
                        <Typography variant="caption" color="textSecondary">
                          {prediction.reasoning}
                        </Typography>
                      </Box>
                    </Tooltip>
                  )}

                  {prediction.risk_level && prediction.risk_level === 'HIGH' && (
                    <Alert severity="warning" sx={{ mt: 1, py: 0.5 }} icon={<Warning />}>
                      <Typography variant="caption" fontWeight="bold">
                        Высокий риск дефицита! Рекомендуется срочный заказ.
                      </Typography>
                    </Alert>
                  )}
                </Paper>
              ))}
              </Box>
            )}
            </Box>
          </Fade>
        </Collapse>
      </AnimatedBox>

      {/* Футер с информацией */}
      <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="textSecondary">
          💡 {isFallbackMode ? 'Локальные алгоритмы' : 'AI'} анализирует исторические данные и прогнозирует остатки на {periodDays} дней
          {lastUpdated && ` • Обновлено: ${lastUpdated.toLocaleString('ru-RU')}`}
          {isFallbackMode && ' • Fallback режим'}
        </Typography>
      </Box>

      {/* Snackbar для уведомлений */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Paper>
  );
};

export default AIPredictions;