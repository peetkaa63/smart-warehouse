import { GoogleGenAI } from "@google/genai";
import { IAIProvider, AIAnalysisRequest, AIAnalysisResponse } from './IAIProvider';

export class GeminiAIProvider implements IAIProvider {
  private ai: GoogleGenAI | null = null;
  private isInitialized: boolean = false;
  private providerName = 'Gemini';

  async initialize(): Promise<boolean> {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn('⚠️ GEMINI_API_KEY not found in environment variables');
        return false;
      }
      
      this.ai = new GoogleGenAI({ apiKey: apiKey });
      this.isInitialized = true;
      console.log('✅ Gemini AI provider initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Gemini AI:', error);
      this.isInitialized = false;
      return false;
    }
  }

  isAvailable(): boolean {
    return this.isInitialized && this.ai !== null;
  }

  getProviderName(): string {
    return this.providerName;
  }

  async analyzeInventoryData(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    if (!this.isAvailable()) {
      return this.getFallbackResponse('Gemini AI недоступен - отсутствует API ключ');
    }

    try {
      const prompt = this.buildAnalysisPrompt(request);
      
      const response = await this.ai!.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
      
      const responseText = response.text || '';
      const parsedResponse = this.parseAIResponse(responseText, request);
      
      return {
        ...parsedResponse,
        provider: this.providerName,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('❌ Gemini AI analysis error:', error);
      return this.getErrorResponse(error);
    }
  }

  async getPredictions(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    if (!this.isAvailable()) {
      return this.getFallbackResponse('Gemini AI недоступен - отсутствует API ключ');
    }

    try {
      const prompt = this.buildPredictionPrompt(request);
      
      const response = await this.ai!.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
      
      const responseText = response.text || '';
      const parsedResponse = this.parseAIResponse(responseText, request);
      
      return {
        ...parsedResponse,
        provider: this.providerName,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('❌ Gemini AI prediction error:', error);
      return this.getErrorResponse(error);
    }
  }

  async getRecommendations(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    if (!this.isAvailable()) {
      return this.getFallbackResponse('Gemini AI недоступен - отсутствует API ключ');
    }

    try {
      const prompt = this.buildRecommendationPrompt(request);
      
      const response = await this.ai!.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
      
      const responseText = response.text || '';
      const parsedResponse = this.parseAIResponse(responseText, request);
      
      return {
        ...parsedResponse,
        provider: this.providerName,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('❌ Gemini AI recommendation error:', error);
      return this.getErrorResponse(error);
    }
  }

  private limitDataSize(data: any[], maxItems: number = 10, maxSize: number = 20000): string {
    const limited = data.slice(0, maxItems);
    let result = JSON.stringify(limited, null, 2);
    
    // Дополнительно ограничиваем по размеру символов
    if (result.length > maxSize) {
      result = result.substring(0, maxSize);
      result = result.substring(0, result.lastIndexOf(']') + 1);
    }
    
    return result;
  }

  private buildAnalysisPrompt(request: AIAnalysisRequest): string {
    // Ограничиваем данные для предотвращения превышения токенов
    const historicalDataJson = this.limitDataSize(request.historicalData || [], 10, 30000);
    const currentStockJson = this.limitDataSize(request.currentStock || [], 8, 20000);
    
    return `
Ты - AI аналитик склада. Проанализируй данные склада и предоставь детальный анализ НА РУССКОМ ЯЗЫКЕ.

ВАЖНО: Все советы, описания, title, description должны быть написаны НА РУССКОМ ЯЗЫКЕ.
Данные (JSON) оставляй в оригинальном виде.

ИСТОРИЧЕСКИЕ ДАННЫЕ (${request.periodDays || 30} дней):
${historicalDataJson}

ТЕКУЩИЕ ОСТАТКИ:
${currentStockJson}

ПРОАНАЛИЗИРУЙ:
1. Тренды по товарам
2. Сезонность спроса
3. Эффективность управления запасами
4. Потенциальные проблемы

ВЕРНИ ОТВЕТ В JSON ФОРМАТЕ (все текстовые поля на русском языке):
{
  "insights": [
    {
      "type": "TREND|SEASONALITY|EFFICIENCY|PROBLEM",
      "title": "строка на русском",
      "description": "строка на русском",
      "severity": "LOW|MEDIUM|HIGH",
      "affected_products": ["string"]
    }
  ],
  "confidence": число
}

ВАЖНО: Все текстовые поля (title, description) должны быть на русском языке.
Только JSON, без дополнительного текста.
`;
  }

  private buildPredictionPrompt(request: AIAnalysisRequest): string {
    // Ограничиваем данные для предотвращения превышения токенов
    const historicalDataJson = this.limitDataSize(request.historicalData || [], 8, 20000);
    const currentStockJson = this.limitDataSize(request.currentStock || [], 6, 15000);
    
    return `
Ты - AI аналитик склада. Создай прогнозы на основе данных склада. Все советы и описания должны быть НА РУССКОМ ЯЗЫКЕ.

ВАЖНО: Все текстовые поля (reasoning, analysis_summary) должны быть на русском языке.
Данные (JSON) оставляй в оригинальном виде.

ИСТОРИЧЕСКИЕ ДАННЫЕ:
${historicalDataJson}

ТЕКУЩИЕ ОСТАТКИ:
${currentStockJson}

СОЗДАЙ ПРОГНОЗЫ НА ${request.periodDays || 7} ДНЕЙ:
ВАЖНО: Прогноз создается только на ${request.periodDays || 7} дней. days_until_stockout не должен превышать ${request.periodDays || 7} дней!

1. Рассчитай через сколько дней закончатся запасы (days_until_stockout) на основе текущего остатка и исторических данных о потреблении
   - days_until_stockout НЕ должен превышать ${request.periodDays || 7} дней (это период прогноза)
   - Если запасы закончатся позже ${request.periodDays || 7} дней, укажи ${request.periodDays || 7} или null
2. Рекомендуемое количество для заказа (recommended_order_quantity) - ОБЯЗАТЕЛЬНО учитывай optimal_stock из БД (это оптимальный уровень запаса для товара)
   - Если current_stock < optimal_stock, то recommended_order_quantity = optimal_stock - current_stock + дополнительный запас на время доставки (3-5 дней)
   - Если current_stock >= optimal_stock, то recommended_order_quantity = 0 (запас достаточен)
   - Всегда учитывай optimal_stock как целевой уровень запаса для товара
3. Риски дефицита (высокий риск если current_stock < min_stock)

ОБЯЗАТЕЛЬНО:
- Используй ТЕКУЩИЙ ОСТАТОК (current_stock) из данных текущих остатков
- Используй optimal_stock (оптимальный уровень запаса) из данных текущих остатков для расчета recommended_order_quantity
- Используй min_stock (минимальный уровень запаса) из данных текущих остатков для оценки риска
- Если current_stock = 0, то это критическая ситуация

ВЕРНИ ОТВЕТ В JSON ФОРМАТЕ (все текстовые поля на русском языке):
{
  "predictions": [
    {
      "product_id": "string",
      "product_name": "string",
      "current_stock": число (ОБЯЗАТЕЛЬНО из текущих остатков, НЕ 0 если есть остатки),
      "days_until_stockout": число (сколько дней до исчерпания запасов),
      "recommended_order_quantity": число (сколько заказать),
      "confidence_score": число (от 0 до 1),
      "risk_level": "HIGH|MEDIUM|LOW",
      "reasoning": "строка на русском - объяснение прогноза"
    }
  ],
  "period_days": ${request.periodDays || 7},
  "analysis_summary": "строка на русском"
}

ВАЖНО: 
- current_stock ДОЛЖЕН браться из ТЕКУЩИХ ОСТАТКОВ и быть реальным числом
- optimal_stock (оптимальный запас) УКАЗАН в данных текущих остатков - используй его как ЦЕЛЕВОЙ УРОВЕНЬ для recommended_order_quantity
- min_stock (минимальный запас) УКАЗАН в данных текущих остатков - используй для оценки риска дефицита
- recommended_order_quantity рассчитывай так: если current_stock < optimal_stock, то заказать нужно (optimal_stock - current_stock) + запас на доставку
- Если current_stock >= optimal_stock, то recommended_order_quantity = 0 (запас достаточен)
- Если current_stock в данных = 0, но есть исторические данные - укажи это в reasoning
- Все текстовые поля должны быть на русском языке
- Только JSON, без дополнительного текста
`;
  }

  private buildRecommendationPrompt(request: AIAnalysisRequest): string {
    // Ограничиваем данные для предотвращения превышения токенов
    const historicalDataJson = this.limitDataSize(request.historicalData || [], 6, 15000);
    
    return `
Ты - AI аналитик склада. Предоставь рекомендации по оптимизации склада НА РУССКОМ ЯЗЫКЕ.

ВАЖНО: Все советы, рекомендации, описания, title, description, expected_impact должны быть написаны НА РУССКОМ ЯЗЫКЕ.
Данные (JSON) оставляй в оригинальном виде.

ДАННЫЕ:
${historicalDataJson}

РЕКОМЕНДАЦИИ ПО:
1. Управлению запасами
2. Оптимизации процессов
3. Снижению рисков

ВЕРНИ ОТВЕТ В JSON ФОРМАТЕ (все текстовые поля на русском языке):
{
  "recommendations": [
    {
      "category": "INVENTORY|PROCESS|RISK",
      "title": "строка на русском",
      "description": "строка на русском",
      "priority": "LOW|MEDIUM|HIGH",
      "expected_impact": "строка на русском"
    }
  ],
  "confidence": число
}

ВАЖНО: Все текстовые поля (title, description, expected_impact) должны быть на русском языке.
Только JSON, без дополнительного текста.
`;
  }

  private parseAIResponse(responseText: string, request?: AIAnalysisRequest): any {
    try {
      // Пытаемся найти JSON в ответе
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Нормализуем predictions если они есть
        if (parsed.predictions && Array.isArray(parsed.predictions)) {
          // Находим информацию о местоположении из currentStock для каждого товара
          const currentStockMap = new Map<string, any>();
          if (request && request.currentStock && Array.isArray(request.currentStock)) {
            request.currentStock.forEach((cs: any) => {
              if (cs && cs.product_id) {
                currentStockMap.set(cs.product_id, cs);
              }
            });
          }

          parsed.predictions = parsed.predictions.map((p: any) => {
            const stockInfo: any = currentStockMap.get(p.product_id);
            
            // Валидация и нормализация days_until_stockout
            let days_until_stockout: number | null = null;
            if (p.days_until_stockout !== undefined && p.days_until_stockout !== null) {
              const rawDays = Number(p.days_until_stockout);
              if (!isNaN(rawDays) && rawDays >= 0) {
                // Ограничиваем максимальное значение до периода прогноза (periodDays)
                // или до 365 дней максимум, если период больше года
                const periodDays = request?.periodDays || 7;
                const maxDays = Math.min(periodDays, 365);
                if (rawDays > maxDays) {
                  console.warn(`⚠️ AI returned days_until_stockout: ${rawDays} for product ${p.product_id}, capping to period ${maxDays} days`);
                  days_until_stockout = maxDays;
                } else {
                  days_until_stockout = Math.floor(rawDays);
                }
              }
            }
            
            // Определяем risk_level на основе валидированных данных
            let risk_level: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
            if (p.risk_level) {
              risk_level = p.risk_level;
            } else if (days_until_stockout !== null) {
              if (days_until_stockout <= 2) {
                risk_level = 'HIGH';
              } else if (days_until_stockout <= 5) {
                risk_level = 'MEDIUM';
              } else {
                risk_level = 'LOW';
              }
            }
            
            return {
              product_id: p.product_id,
              product_name: p.product_name || 'Неизвестный товар',
              current_stock: Number(p.current_stock) || (stockInfo ? Number(stockInfo.current_stock) : 0),
              days_until_stockout: days_until_stockout,
              recommended_order_quantity: Number(p.recommended_order_quantity) || Number(p.recommended_order) || 0,
              confidence_score: Math.min(1, Math.max(0, Number(p.confidence_score) || Number(p.confidence) || 0)), // Ограничиваем 0-1
              risk_level: risk_level,
              reasoning: p.reasoning || '',
              // Добавляем информацию о местоположении если есть
              zone: stockInfo?.zone || p.zone,
              row_number: stockInfo?.row_number || p.row_number,
              shelf_number: stockInfo?.shelf_number || p.shelf_number
            };
          });
        }
        
        return parsed;
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return this.getFallbackResponse();
    }
  }

  private getFallbackResponse(reason?: string): AIAnalysisResponse {
    return {
      predictions: [],
      insights: [],
      recommendations: [],
      confidence: 0,
      provider: this.providerName,
      timestamp: new Date().toISOString(),
      isFallback: true,
      fallbackReason: reason || 'Gemini AI недоступен'
    };
  }

  private getErrorResponse(error: any): AIAnalysisResponse {
    let errorCode = 'UNKNOWN_ERROR';
    let errorMessage = 'Неизвестная ошибка Gemini AI';
    let errorDetails = '';

    // Обработка специфичных ошибок Gemini
    if (error.message || error.error) {
      const errorMsg = error.message || error.error?.message || '';
      
      if (errorMsg.includes('token') || errorMsg.includes('exceeds')) {
        errorCode = 'TOKEN_LIMIT_EXCEEDED';
        errorMessage = 'Превышен лимит токенов Gemini AI';
        errorDetails = 'Слишком много данных для обработки. Используются ограниченные данные.';
      } else if (errorMsg.includes('quota')) {
        errorCode = 'QUOTA_EXCEEDED';
        errorMessage = 'Превышена квота Gemini AI';
        errorDetails = 'Достигнут лимит запросов к Gemini AI. Попробуйте позже.';
      } else if (errorMsg.includes('location') || errorMsg.includes('region')) {
        errorCode = 'LOCATION_NOT_SUPPORTED';
        errorMessage = 'Gemini AI недоступен в вашем регионе';
        errorDetails = 'Gemini AI не поддерживается в текущей локации.';
      } else if (errorMsg.includes('API key') || errorMsg.includes('authentication')) {
        errorCode = 'AUTHENTICATION_ERROR';
        errorMessage = 'Ошибка аутентификации Gemini AI';
        errorDetails = 'Неверный или отсутствующий API ключ Gemini.';
      } else if (errorMsg.includes('rate limit')) {
        errorCode = 'RATE_LIMIT_EXCEEDED';
        errorMessage = 'Превышен лимит запросов Gemini AI';
        errorDetails = 'Слишком много запросов. Подождите перед повторной попыткой.';
      } else if (errorMsg.includes('model')) {
        errorCode = 'MODEL_ERROR';
        errorMessage = 'Ошибка модели Gemini AI';
        errorDetails = 'Проблема с доступностью модели Gemini.';
      } else if (error.error?.message) {
        errorMessage = `Ошибка Gemini AI: ${error.error.message}`;
        errorDetails = error.error.message;
        if (error.error.message.includes('token')) {
          errorCode = 'TOKEN_LIMIT_EXCEEDED';
          errorDetails = 'Превышен лимит токенов (1,048,575). Используются ограниченные данные.';
        }
      } else {
        errorMessage = `Ошибка Gemini AI: ${errorMsg}`;
        errorDetails = errorMsg;
      }
    }

    console.error(`❌ Gemini AI Error [${errorCode}]:`, errorMessage, errorDetails);

    return {
      predictions: [],
      insights: [],
      recommendations: [],
      confidence: 0,
      provider: this.providerName,
      timestamp: new Date().toISOString(),
      error: {
        code: errorCode,
        message: errorMessage,
        details: errorDetails
      },
      isFallback: true,
      fallbackReason: errorMessage
    };
  }
}

