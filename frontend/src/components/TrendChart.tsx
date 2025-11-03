// components/TrendChart.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  OutlinedInput,
  Alert,
  Autocomplete,
  TextField
} from '@mui/material';
import { Refresh, TrendingUp } from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { analyticsAPI } from '../services/api';
import { useSpring, animated } from '@react-spring/web';

interface TrendChartProps {}

interface ChartData {
  date: string;
  [key: string]: number | string;
}

interface Product {
  id: string;
  name: string;
  category?: string;
  min_stock?: number;
  optimal_stock?: number;
}

const TrendChart: React.FC<TrendChartProps> = () => {
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [period, setPeriod] = useState<string>('7');
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any[]>([]);

  // Animations
  const chartAnimation = useSpring({
    height: loading ? 0 : 'auto',
    opacity: loading ? 0 : 1,
    config: { tension: 200, friction: 20 }
  });
  const loadingAnimation = useSpring({
    height: loading ? 'auto' : 0,
    opacity: loading ? 1 : 0,
    config: { tension: 200, friction: 20 }
  });

  // Загрузка списка товаров
  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const response = await analyticsAPI.getProducts('', 100);
      setProducts(response.products);
      
      // Автоматически выбираем первые 2 товара для демонстрации
      if (response.products.length >= 2) {
        setSelectedProducts(response.products.slice(0, 2));
      }
    } catch (error) {
      console.error('Error loading products:', error);
      setError('Ошибка при загрузке списка товаров');
    } finally {
      setLoadingProducts(false);
    }
  };

  // Загрузка данных для графика
  const loadChartData = async () => {
    if (selectedProducts.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const productIds = selectedProducts.map(p => p.id);
      
      const [trendResponse, statsResponse] = await Promise.all([
        analyticsAPI.getTrendData(productIds, parseInt(period)),
        analyticsAPI.getProductStats(productIds, parseInt(period))
      ]);

      setChartData(trendResponse.data);
      setStats(statsResponse.stats);

    } catch (error) {
      console.error('Error loading chart data:', error);
      setError('Ошибка при загрузке данных графика');
      // Fallback на mock данные если API недоступно
      setChartData(generateMockChartData());
    } finally {
      setLoading(false);
    }
  };

  // Mock данные на случай если API недоступно
  const generateMockChartData = (): ChartData[] => {
    const data: ChartData[] = [];
    const today = new Date();

    for (let i = parseInt(period); i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayData: ChartData = { date: dateStr };

      selectedProducts.forEach((product, index) => {
        const baseValue = Math.random() * 100 + 20;
        const trend = Math.sin(i * 0.5) * 10;
        dayData[product.name] = Math.max(0, Math.round(baseValue + trend));
      });

      data.push(dayData);
    }

    return data;
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedProducts.length > 0) {
      loadChartData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProducts, period]);

  const handleProductChange = (event: any, newValue: Product[]) => {
    setSelectedProducts(newValue);
  };

  const handlePeriodChange = (event: any) => {
    setPeriod(event.target.value);
  };

  const handleRefresh = () => {
    loadChartData();
  };

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];

  const getProductStat = (productId: string) => {
    return stats.find(stat => stat.product_id === productId);
  };

  return (
    <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h3" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUp color="primary" />
          График трендов остатков
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Период</InputLabel>
            <Select 
              value={period} 
              onChange={handlePeriodChange} 
              label="Период"
            >
              <MenuItem value="7">7 дней</MenuItem>
              <MenuItem value="14">14 дней</MenuItem>
              <MenuItem value="30">30 дней</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Обновить график">
            <IconButton 
              size="small" 
              onClick={handleRefresh}
              disabled={loading}
            >
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Выбор товаров */}
      <Box sx={{ mb: 2 }}>
        <Autocomplete
          multiple
          options={products}
          value={selectedProducts}
          onChange={handleProductChange}
          getOptionLabel={(option) => `${option.name} (${option.id})`}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          loading={loadingProducts}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Выберите товары для анализа"
              placeholder="Начните вводить название товара..."
            />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                label={option.name}
                {...getTagProps({ index })}
                size="small"
              />
            ))
          }
        />
      </Box>

      <>
        <animated.div style={{ ...loadingAnimation, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
            <Box textAlign="center">
              <CircularProgress size={40} />
              <Typography variant="body1" sx={{ mt: 2 }}>
                Загрузка данных графика...
              </Typography>
            </Box>
          </Box>
        </animated.div>
        <animated.div style={{ ...chartAnimation, overflow: 'hidden' }}>
          {chartData.length > 0 && selectedProducts.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date"
                    tickFormatter={(value) => new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                  />
                  <YAxis />
                  <RechartsTooltip 
                    formatter={(value: number) => [`${value} шт.`, 'Количество']}
                    labelFormatter={(label) => `Дата: ${new Date(label).toLocaleDateString('ru-RU')}`}
                  />
                  <Legend />
                  {selectedProducts.map((product, index) => (
                    <Line
                      key={product.id}
                      type="monotone"
                      dataKey={product.name}
                      stroke={colors[index % colors.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>

              {/* Статистика по товарам */}
              <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1 }}>
                {selectedProducts.map((product, index) => {
                  const stat = getProductStat(product.id);
                  const currentStock = chartData.length > 0 ? 
                    chartData[chartData.length - 1][product.name] as number : 0;
                  
                  return (
                    <Paper key={product.id} sx={{ p: 1.5, textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                        <Box 
                          sx={{ 
                            width: 10, 
                            height: 10, 
                            backgroundColor: colors[index % colors.length], 
                            borderRadius: '50%',
                            mr: 1 
                          }} 
                        />
                        <Typography variant="subtitle2" noWrap fontSize="0.8rem">
                          {product.name}
                        </Typography>
                      </Box>
                      <Typography variant="h6" color="primary" fontSize="1rem">
                        {currentStock} шт.
                      </Typography>
                      {stat && (
                        <Typography variant="caption" color="textSecondary" display="block">
                          Среднее: {Math.round(stat.avg_quantity)} шт.
                        </Typography>
                      )}
                      {product.min_stock && (
                        <Typography variant="caption" color="textSecondary" display="block">
                          Мин: {product.min_stock} шт.
                        </Typography>
                      )}
                    </Paper>
                  );
                })}
              </Box>
            </>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
              <Box textAlign="center">
                <TrendingUp sx={{ fontSize: 48, color: 'text.secondary', mb: 1, opacity: 0.5 }} />
                <Typography variant="body1" color="textSecondary">
                  {loadingProducts ? 'Загрузка списка товаров...' : 'Выберите товары для построения графика'}
                </Typography>
              </Box>
            </Box>
          )}
        </animated.div>
      </>
    </Paper>
  );
};

export default TrendChart;