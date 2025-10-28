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
      const parsedResponse = this.parseAIResponse(responseText);
      
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
      const parsedResponse = this.parseAIResponse(responseText);
      
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
      const parsedResponse = this.parseAIResponse(responseText);
      
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
Проанализируй данные склада и предоставь детальный анализ.

ИСТОРИЧЕСКИЕ ДАННЫЕ (${request.periodDays || 30} дней):
${historicalDataJson}

ТЕКУЩИЕ ОСТАТКИ:
${currentStockJson}

ПРОАНАЛИЗИРУЙ:
1. Тренды по товарам
2. Сезонность спроса
3. Эффективность управления запасами
4. Потенциальные проблемы

ВЕРНИ ОТВЕТ В JSON ФОРМАТЕ:
{
  "insights": [
    {
      "type": "TREND|SEASONALITY|EFFICIENCY|PROBLEM",
      "title": "string",
      "description": "string",
      "severity": "LOW|MEDIUM|HIGH",
      "affected_products": ["string"]
    }
  ],
  "confidence": number
}

Только JSON, без дополнительного текста.
`;
  }

  private buildPredictionPrompt(request: AIAnalysisRequest): string {
    // Ограничиваем данные для предотвращения превышения токенов
    const historicalDataJson = this.limitDataSize(request.historicalData || [], 8, 20000);
    const currentStockJson = this.limitDataSize(request.currentStock || [], 6, 15000);
    
    return `
Создай прогнозы на основе данных склада.

ИСТОРИЧЕСКИЕ ДАННЫЕ:
${historicalDataJson}

ТЕКУЩИЕ ОСТАТКИ:
${currentStockJson}

СОЗДАЙ ПРОГНОЗЫ НА 7 ДНЕЙ:
1. Ожидаемый спрос по товарам
2. Рекомендуемые уровни запасов
3. Риски дефицита

ВЕРНИ ОТВЕТ В JSON ФОРМАТЕ:
{
  "predictions": [
    {
      "product_id": "string",
      "product_name": "string",
      "predicted_demand": number,
      "recommended_stock": number,
      "risk_level": "LOW|MEDIUM|HIGH",
      "confidence": number
    }
  ],
  "confidence": number
}

Только JSON, без дополнительного текста.
`;
  }

  private buildRecommendationPrompt(request: AIAnalysisRequest): string {
    // Ограничиваем данные для предотвращения превышения токенов
    const historicalDataJson = this.limitDataSize(request.historicalData || [], 6, 15000);
    
    return `
Предоставь рекомендации по оптимизации склада.

ДАННЫЕ:
${historicalDataJson}

РЕКОМЕНДАЦИИ ПО:
1. Управлению запасами
2. Оптимизации процессов
3. Снижению рисков

ВЕРНИ ОТВЕТ В JSON ФОРМАТЕ:
{
  "recommendations": [
    {
      "category": "INVENTORY|PROCESS|RISK",
      "title": "string",
      "description": "string",
      "priority": "LOW|MEDIUM|HIGH",
      "expected_impact": "string"
    }
  ],
  "confidence": number
}

Только JSON, без дополнительного текста.
`;
  }

  private parseAIResponse(responseText: string): any {
    try {
      // Пытаемся найти JSON в ответе
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
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

