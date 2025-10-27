// Интерфейс для AI провайдеров (Strategy pattern)

export interface AIAnalysisRequest {
  historicalData: any[];
  currentStock: any[];
  periodDays?: number;
  filters?: {
    zones?: string[];
    categories?: string[];
    products?: string[];
  };
}

export interface AIAnalysisResponse {
  predictions?: any[];
  insights?: any[];
  recommendations?: any[];
  confidence?: number;
  provider: string;
  timestamp: string;
}

export interface IAIProvider {
  // Инициализация провайдера
  initialize(): Promise<boolean>;
  
  // Проверка доступности провайдера
  isAvailable(): boolean;
  
  // Анализ данных инвентаризации
  analyzeInventoryData(request: AIAnalysisRequest): Promise<AIAnalysisResponse>;
  
  // Получение прогнозов
  getPredictions(request: AIAnalysisRequest): Promise<AIAnalysisResponse>;
  
  // Получение рекомендаций
  getRecommendations(request: AIAnalysisRequest): Promise<AIAnalysisResponse>;
  
  // Получение названия провайдера
  getProviderName(): string;
}

