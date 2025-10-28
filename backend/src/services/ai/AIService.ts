import { IAIProvider, AIAnalysisRequest, AIAnalysisResponse } from './IAIProvider';
import { GeminiAIProvider } from './GeminiAIProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { LocalAIProvider } from './LocalAIProvider';

export class AIService {
  private providers: Map<string, IAIProvider> = new Map();
  private defaultProvider: string = 'gemini';
  private fallbackProvider: string = 'local';

  constructor() {
    this.initializeProviders();
  }

  private async initializeProviders(): Promise<void> {
    // Инициализируем все доступные провайдеры
    const geminiProvider = new GeminiAIProvider();
    const openaiProvider = new OpenAIProvider();
    const localProvider = new LocalAIProvider();

    // Пытаемся инициализировать каждого провайдера
    const geminiAvailable = await geminiProvider.initialize();
    const openaiAvailable = await openaiProvider.initialize();
    const localAvailable = await localProvider.initialize();

    // Добавляем только доступные провайдеры
    if (geminiAvailable) {
      this.providers.set('gemini', geminiProvider);
      console.log('✅ Gemini AI provider registered');
    }

    if (openaiAvailable) {
      this.providers.set('openai', openaiProvider);
      console.log('✅ OpenAI provider registered');
    }

    if (localAvailable) {
      this.providers.set('local', localProvider);
      console.log('✅ Local AI provider registered');
    }

    // Устанавливаем fallback провайдер
    if (!this.providers.has(this.defaultProvider)) {
      this.defaultProvider = this.fallbackProvider;
    }

    console.log(`🤖 AI Service initialized with ${this.providers.size} providers`);
    console.log(`🎯 Default provider: ${this.defaultProvider}`);
  }

  // Получение списка доступных провайдеров
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  // Установка провайдера по умолчанию
  setDefaultProvider(providerName: string): boolean {
    if (this.providers.has(providerName)) {
      this.defaultProvider = providerName;
      console.log(`🎯 Default AI provider changed to: ${providerName}`);
      return true;
    }
    console.warn(`⚠️ Provider ${providerName} not available`);
    return false;
  }

  // Получение текущего провайдера по умолчанию
  getCurrentProvider(): string {
    return this.defaultProvider;
  }

  /**
   * Анализ данных инвентаризации.
   *
   * Почему так:
   * - Оставляем сервис ответственным за выбор провайдера и ретраи, чтобы контроллеры были тонкими.
   * - Унифицированный контракт `AIAnalysisRequest` даёт стабильный API поверх разных моделей.
   */
  async analyzeInventoryData(
    historicalData: any[], 
    currentStock: any[], 
    providerName?: string
  ): Promise<AIAnalysisResponse> {
    const request: AIAnalysisRequest = {
      historicalData,
      currentStock,
      periodDays: 30
    };

    return await this.executeWithProvider(
      'analyzeInventoryData',
      request,
      providerName
    );
  }

  /**
   * Получение прогнозов запасов/спроса.
   *
   * Почему так:
   * - Strategy pattern минимизирует vendor‑lock; легко добавить «rule‑based» локальный фоллбек.
   */
  async getPredictions(
    historicalData: any[], 
    currentStock: any[], 
    periodDays: number = 7,
    providerName?: string
  ): Promise<AIAnalysisResponse> {
    const request: AIAnalysisRequest = {
      historicalData,
      currentStock,
      periodDays
    };

    return await this.executeWithProvider(
      'getPredictions',
      request,
      providerName
    );
  }

  /**
   * Получение рекомендаций по действиям (перезаказ, перераскладка).
   *
   * Почему так:
   * - Разделяем рекомендации от прогнозов: разные SLA и источники данных.
   */
  async getRecommendations(
    historicalData: any[], 
    currentStock: any[], 
    filters?: any,
    providerName?: string
  ): Promise<AIAnalysisResponse> {
    const request: AIAnalysisRequest = {
      historicalData,
      currentStock,
      filters
    };

    return await this.executeWithProvider(
      'getRecommendations',
      request,
      providerName
    );
  }

  /**
   * Выполняет метод провайдера с учётом доступности и ошибок.
   *
   * Почему так: централизованный контроль деградации (fallback) даёт предсказуемость под нагрузкой.
   */
  private async executeWithProvider(
    method: keyof IAIProvider,
    request: AIAnalysisRequest,
    providerName?: string
  ): Promise<AIAnalysisResponse> {
    const targetProvider = providerName || this.defaultProvider;
    const provider = this.providers.get(targetProvider);

    if (!provider) {
      console.error(`❌ Provider ${targetProvider} not found`);
      return this.getFallbackResponse();
    }

    if (!provider.isAvailable()) {
      console.warn(`⚠️ Provider ${targetProvider} is not available, trying fallback`);
      return await this.executeWithFallback(method, request);
    }

    try {
      console.log(`🤖 Using ${provider.getProviderName()} for ${method}`);
      const result = await (provider[method] as Function)(request);
      return result;
    } catch (error) {
      console.error(`❌ Error with ${provider.getProviderName()}:`, error);
      return await this.executeWithFallback(method, request);
    }
  }

  /**
   * Выполнение через fallback‑провайдера при недоступности основного.
   *
   * Почему так: бизнес‑ценность — лучше вернуть «приблизительный» ответ, чем упасть.
   */
  private async executeWithFallback(
    method: keyof IAIProvider,
    request: AIAnalysisRequest
  ): Promise<AIAnalysisResponse> {
    const fallbackProvider = this.providers.get(this.fallbackProvider);
    
    if (!fallbackProvider) {
      console.error('❌ No fallback provider available');
      return this.getFallbackResponse();
    }

    try {
      console.log(`🔄 Using fallback provider ${fallbackProvider.getProviderName()}`);
      const result = await (fallbackProvider[method] as Function)(request);
      return result;
    } catch (error) {
      console.error(`❌ Fallback provider error:`, error);
      return this.getFallbackResponse();
    }
  }

  // Получение информации о провайдерах
  getProvidersInfo(): any[] {
    return Array.from(this.providers.entries()).map(([name, provider]) => ({
      name,
      displayName: provider.getProviderName(),
      available: provider.isAvailable(),
      isDefault: name === this.defaultProvider
    }));
  }

  private getFallbackResponse(): AIAnalysisResponse {
    return {
      predictions: [],
      insights: [],
      recommendations: [],
      confidence: 0,
      provider: 'none',
      timestamp: new Date().toISOString(),
      isFallback: true,
      fallbackReason: 'Все AI провайдеры недоступны'
    };
  }
}

// Экспортируем singleton instance
export const aiService = new AIService();

