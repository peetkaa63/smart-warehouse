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
      return this.getFallbackResponse();
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
    } catch (error) {
      console.error('❌ Gemini AI analysis error:', error);
      return this.getFallbackResponse();
    }
  }

  async getPredictions(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    if (!this.isAvailable()) {
      return this.getFallbackResponse();
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
    } catch (error) {
      console.error('❌ Gemini AI prediction error:', error);
      return this.getFallbackResponse();
    }
  }

  async getRecommendations(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    if (!this.isAvailable()) {
      return this.getFallbackResponse();
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
    } catch (error) {
      console.error('❌ Gemini AI recommendation error:', error);
      return this.getFallbackResponse();
    }
  }

  private buildAnalysisPrompt(request: AIAnalysisRequest): string {
    return `
Проанализируй данные склада и предоставь детальный анализ.

ИСТОРИЧЕСКИЕ ДАННЫЕ (${request.periodDays || 30} дней):
${JSON.stringify(request.historicalData.slice(0, 20), null, 2)}

ТЕКУЩИЕ ОСТАТКИ:
${JSON.stringify(request.currentStock.slice(0, 10), null, 2)}

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
    return `
Создай прогнозы на основе данных склада.

ИСТОРИЧЕСКИЕ ДАННЫЕ:
${JSON.stringify(request.historicalData.slice(0, 15), null, 2)}

ТЕКУЩИЕ ОСТАТКИ:
${JSON.stringify(request.currentStock.slice(0, 10), null, 2)}

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
    return `
Предоставь рекомендации по оптимизации склада.

ДАННЫЕ:
${JSON.stringify(request.historicalData.slice(0, 10), null, 2)}

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

  private getFallbackResponse(): AIAnalysisResponse {
    return {
      predictions: [],
      insights: [],
      recommendations: [],
      confidence: 0,
      provider: this.providerName,
      timestamp: new Date().toISOString()
    };
  }
}

