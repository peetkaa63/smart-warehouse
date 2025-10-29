import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://rtk.keep-pixel.ru:3000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Интерцептор для добавления токена к запросам
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔐 Adding token to request:', token.substring(0, 20) + '...');
    } else {
      console.warn('⚠️ No token found for request to:', config.url);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Интерцептор для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    const method = error.config?.method?.toUpperCase();
    const msg = error.message || error.response?.data?.message || error.response?.data?.error;
    
    console.error('🚨 API Error:', status, method, url, '-', msg);
    
    // Логируем детали ошибки для отладки
    if (error.response?.data) {
      console.error('🚨 Error details:', error.response.data);
    }
    
    if (status === 401) {
      console.log('🔐 Token expired, logging out...');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    if (status === 403) {
      console.log('🚫 Access forbidden - possible token issue');
    }
    
    return Promise.reject(error);
  }
);

// Dashboard API
export const dashboardAPI = {
  getCurrentData: () => {
    console.log('📊 Fetching dashboard data...');
    return api.get('/api/dashboard/current');
  },
  refreshData: () => api.post('/api/dashboard/refresh'),
};

// История данных
export const historyAPI = {
  getHistory: (params: any) => {
    console.log('📋 Fetching history data with params:', params);
    return api.get('/api/history', { params });
  },
  getStats: (params: any) => {
    console.log('📈 Fetching stats with params:', params);
    return api.get('/api/history/stats', { params });
  },
};

// Auth API
export const authAPI = {
  login: (email: string, password: string) => {
    console.log('🔐 Attempting login for:', email);
    return api.post('/api/auth/login', { email, password });
  },
};

// Upload API
export const uploadAPI = {
  uploadCSV: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return api.post('/api/upload/csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000 // 60 секунд для больших файлов
    });
  },

  downloadTemplate: () => {
    return api.get('/api/upload/template', {
      responseType: 'blob'
    });
  }
};

// Export API
export const exportAPI = {
  exportToExcel: (params: any) => {
    return api.get('/api/export/excel', {
      params: params,
      responseType: 'blob', // Важно для файлов
      timeout: 60000
    });
  },

  exportToPDF: (params: any) => {
    return api.get('/api/export/pdf', {
      params: params,
      responseType: 'blob',
      timeout: 120000
    });
  }
};

// api/index.ts - исправленная секция AI API
export const aiAPI = {
  // Получение прогнозов от AI
  getPredictions: async (periodDays: number = 7, categories: string[] = []) => {
    console.log('🤖 Fetching AI predictions for period:', periodDays, 'days');
    const response = await api.post('/api/ai/predict', { 
      period_days: periodDays,
      categories: categories
    });
    return response.data;
  },

  // Расширенная аналитика с фильтрами
  getAdvancedPredictions: async (filters: {
    period_days?: number;
    zones?: string[];
    categories?: string[];
    products?: string[];
  }) => {
    console.log('🔮 Fetching advanced AI predictions with filters:', filters);
    const response = await api.post('/api/ai/predict/advanced', filters);
    return response.data;
  },

  // История предыдущих прогнозов
  getPredictionHistory: async (limit: number = 10) => {
    console.log('📊 Fetching AI prediction history, limit:', limit);
    const response = await api.get('/api/ai/history', {
      params: { limit }
    });
    return response.data;
  },

  // Принудительное обновление прогнозов
  refreshPredictions: async (periodDays: number = 7) => {
    console.log('🔄 Force refreshing AI predictions');
    const response = await api.post('/api/ai/predict/refresh', {
      period_days: periodDays,
      force_refresh: true
    });
    return response.data;
  },

  // Статус AI сервиса
  getAIStatus: async () => {
    console.log('📡 Checking AI service status');
    const response = await api.get('/api/ai/status');
    return response.data;
  }
};

// Analytics API - исправленная версия
export const analyticsAPI = {
  // Данные для графиков трендов
  getTrendData: async (productIds: string[], periodDays: number = 30) => {
    console.log('📈 Fetching trend data for products:', productIds);
    const response = await api.get('/api/analytics/trend', {
      params: {
        product_ids: productIds.join(','),
        period_days: periodDays
      }
    });
    return response.data;
  },

  // Список товаров для аналитики
  getProducts: async (search?: string, limit: number = 100) => {
    console.log('🔍 Searching products:', search);
    const response = await api.get('/api/analytics/products', {
      params: { search, limit }
    });
    return response.data;
  },

  // Статистика по товарам
  getProductStats: async (productIds: string[], periodDays: number = 30) => {
    console.log('📊 Fetching product stats for:', productIds);
    const response = await api.get('/api/analytics/product-stats', {
      params: {
        product_ids: productIds.join(','),
        period_days: periodDays
      }
    });
    return response.data;
  },

  // Сводная статистика склада
  getWarehouseStats: async (periodDays: number = 7) => {
    console.log('🏭 Fetching warehouse stats for period:', periodDays);
    const response = await api.get('/api/analytics/warehouse-stats', {
      params: { period_days: periodDays }
    });
    return response.data;
  }
};

// Advanced Analytics API
export const advancedAnalyticsAPI = {
  // Расширенные тренды
  getEnhancedTrends: async (productIds: string[] = [], periodDays: number = 30) => {
    console.log('📈 Fetching enhanced trends for products:', productIds);
    const response = await api.get('/api/advancedAnalytics/trends', {
      params: {
        product_ids: productIds.join(','),
        period_days: periodDays
      }
    });
    const data = response.data;
    // Нормализуем контракт для модалки: ожидается { success, data }
    if (data && (Array.isArray(data.data) || Array.isArray(data))) {
      return { success: true, data: Array.isArray(data) ? data : data.data };
    }
    return { success: false, error: data?.error || data?.message || 'Unknown error', data: [] };
  },

  // Эффективность роботов
  getEfficiencyData: async (periodDays: number = 7) => {
    console.log('🤖 Fetching robot efficiency data for period:', periodDays);
    const response = await api.get('/api/advancedAnalytics/efficiency', {
      params: { period_days: periodDays }
    });
    const data = response.data;
    return { success: true, data };
  },

  // AI инсайты
  getAIInsights: async () => {
    console.log('🧠 Fetching AI insights...');
    const response = await api.get('/api/advancedAnalytics/ai-insights');
    const data = response.data;
    return { success: true, data };
  },

  // Уведомления
  getNotifications: async (limit: number = 20) => {
    console.log('🔔 Fetching notifications, limit:', limit);
    const response = await api.get('/api/advancedAnalytics/notifications', {
      params: { limit }
    });
    return response.data;
  }
};


// Robots API
export const robotsAPI = {
  sendData: (data: any) => api.post('/api/robots/data', data),
};

export default api;