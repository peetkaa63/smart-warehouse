// services/geminiService.ts
import { GoogleGenAI } from "@google/genai";

class GeminiService {
  private ai: GoogleGenAI | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn('⚠️ GEMINI_API_KEY not found in environment variables');
        return;
      }
      
      this.ai = new GoogleGenAI({ apiKey: apiKey });
      this.isInitialized = true;
      console.log('✅ Gemini AI service initialized successfully with @google/genai');
    } catch (error) {
      console.error('❌ Failed to initialize Gemini AI:', error);
      this.isInitialized = false;
    }
  }

  private limitJSONSize(data: any, maxSize: number = 15000): string {
    let result = JSON.stringify(data, null, 2);
    
    // Если превышает лимит, берём меньше данных
    if (result.length > maxSize) {
      const limited = Array.isArray(data) ? data.slice(0, 3) : data;
      result = JSON.stringify(limited, null, 2);
      
      // Если всё ещё превышает, обрезаем до maxSize
      if (result.length > maxSize) {
        result = result.substring(0, maxSize);
        result = result.substring(0, result.lastIndexOf(']') + 1);
      }
    }
    
    return result;
  }

  async analyzeInventoryData(historicalData: any[], currentStock: any[]): Promise<any> {
    try {
      // Проверяем инициализацию
      if (!this.isInitialized || !this.ai) {
        throw new Error('Gemini AI not initialized - check API key');
      }

      // Ограничиваем объем данных
      const limitedHistoricalData = historicalData.slice(0, 5); // Максимум 5 элементов
      const limitedCurrentStock = currentStock.slice(0, 5);

      console.log(`📊 Preparing data for AI: ${limitedHistoricalData.length} historical items, ${limitedCurrentStock.length} current items`);

      // Ограничиваем размер JSON
      const historicalJSON = this.limitJSONSize(limitedHistoricalData, 15000);
      const currentJSON = this.limitJSONSize(limitedCurrentStock, 10000);

      // Формируем промпт
      const prompt = `
Ты - AI аналитик склада компании "Ростелеком". Проанализируй данные инвентаризации и спрогнозируй остатки на следующие 7 дней.

КОНТЕКСТ:
Мы управляем складом сетевого оборудования. Товары: роутеры, модемы, коммутаторы, IP-телефоны, кабели.

ИСТОРИЧЕСКИЕ ДАННЫЕ (паттерны потребления):
${historicalJSON}

ТЕКУЩИЕ ОСТАТКИ:
${currentJSON}

ЗАДАЧА:
Для каждого товара рассчитай:
1. Через сколько дней закончатся запасы (days_until_stockout)
2. Рекомендуемое количество для заказа (recommended_order_quantity)
3. Достоверность прогноза (confidence_score от 0 до 1)
4. Краткое обоснование (reasoning)

УЧТИ:
- Минимальный запас обычно 10-20 единиц
- Время доставки новых товаров: 3-5 дней
- Сезонность не выражена
- Тренды потребления стабильные

ФОРМАТ ОТВЕТА - ТОЛЬКО JSON:
{
  "predictions": [
    {
      "product_id": "string",
      "product_name": "string", 
      "current_stock": number,
      "days_until_stockout": number,
      "recommended_order_quantity": number,
      "confidence_score": number,
      "reasoning": "string"
    }
  ],
  "analysis_summary": "string"
}

ВАЖНО: Верни только валидный JSON, без дополнительного текста.
`;

      console.log('🤖 Sending request to Gemini AI...');
      
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash", // Используем стабильную модель
        contents: prompt,
      });

      // Проверяем наличие текста в ответе
      if (!response.text) {
        throw new Error('Empty response from Gemini AI');
      }

      const text = response.text;
      
      console.log('✅ Received response from Gemini AI');
      console.log('📝 Raw AI response:', text.substring(0, 200) + '...');
      
      // Очищаем и парсим JSON ответ
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      const parsedResponse = JSON.parse(cleanText);
      
      console.log(`📊 AI generated ${parsedResponse.predictions?.length || 0} predictions`);
      
      return parsedResponse;

    } catch (error: any) {
      console.error('❌ Gemini API error:', error);
      
      // Детальная диагностика ошибок
      if (error.message?.includes('fetch failed') || error.message?.includes('network')) {
        console.error('🌐 Network error - check internet connection and API endpoint');
      }
      
      if (error.message?.includes('token') || error.message?.includes('exceeds')) {
        console.error('⚠️ Token limit exceeded, returning fallback response');
        // Возвращаем fallback вместо throw
        return {
          predictions: [],
          analysis_summary: 'Токен лимит превышен. Используйте меньше данных для анализа.'
        };
      }
      
      if (error.message?.includes('quota') || error.message?.includes('limit')) {
        console.error('🔧 API quota exceeded or rate limit reached');
        return {
          predictions: [],
          analysis_summary: 'Превышена квота API. Попробуйте позже.'
        };
      }
      
      if (error.message?.includes('model') || error.message?.includes('not found')) {
        console.error('🔧 Model not available, trying alternative...');
        // Попробуем альтернативную модель
        return await this.tryAlternativeModel(historicalData, currentStock);
      }
      
      throw new Error(`AI analysis failed: ${error.message}`);
    }
  }

  // Метод с альтернативной моделью
  private async tryAlternativeModel(historicalData: any[], currentStock: any[]): Promise<any> {
    try {
      if (!this.ai) throw new Error('AI not initialized');

      console.log('🔄 Trying alternative model with limited data...');
      
      const limitedHistoricalData = historicalData.slice(0, 3);
      const limitedCurrentStock = currentStock.slice(0, 3);

      const historicalJSON = this.limitJSONSize(limitedHistoricalData, 8000);
      const currentJSON = this.limitJSONSize(limitedCurrentStock, 5000);

      const prompt = `
Анализ складских остатков. Верни прогноз в JSON.

ДАННЫЕ:
${historicalJSON}

ТЕКУЩИЕ ОСТАТКИ:
${currentJSON}

JSON ФОРМАТ:
{
  "predictions": [
    {
      "product_id": "TEL-4567",
      "product_name": "Роутер RT-AC68U", 
      "current_stock": 15,
      "days_until_stockout": 3,
      "recommended_order_quantity": 50,
      "confidence_score": 0.85
    }
  ]
}
`;

      const response = await this.ai.models.generateContent({
        model: "gemini-2.0-flash", // Альтернативная модель
        contents: prompt,
      });

      // Проверяем наличие текста
      if (!response.text) {
        throw new Error('Empty response from alternative model');
      }

      const text = response.text;
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanText);

    } catch (altError: any) {
      console.error('❌ Alternative model also failed:', altError);
      // Возвращаем fallback вместо throw
      return {
        predictions: [],
        analysis_summary: 'Все модели AI недоступны. Используйте fallback режим.'
      };
    }
  }

  // Альтернативный метод для работы с табличными данными
  async predictStockLevels(inventoryData: any): Promise<any> {
    try {
      if (!this.isInitialized || !this.ai) {
        throw new Error('Gemini AI not initialized');
      }

      const limitedData = inventoryData.slice(0, 5);

      const prompt = `
Анализ складских остатков. Верни прогноз в JSON формате.

ДАННЫЕ:
${JSON.stringify(limitedData, null, 2)}

ТРЕБУЕМЫЙ ФОРМАТ JSON:
{
  "predictions": [
    {
      "product_id": "TEL-4567",
      "product_name": "Роутер RT-AC68U", 
      "current_stock": 15,
      "days_until_stockout": 3,
      "recommended_order_quantity": 50,
      "confidence_score": 0.85,
      "risk_level": "HIGH"
    }
  ]
}

risk_level: HIGH (<=2 дней), MEDIUM (3-5 дней), LOW (>5 дней)
`;

      const response = await this.ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });

      // Проверяем наличие текста
      if (!response.text) {
        throw new Error('Empty response from Gemini AI');
      }

      const text = response.text;
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanText);
    } catch (error) {
      console.error('❌ Error in Gemini prediction:', error);
      throw error;
    }
  }

  // Простой тест подключения
  async testConnection(): Promise<boolean> {
    try {
      if (!this.isInitialized || !this.ai) {
        return false;
      }

      const response = await this.ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: "Ответь одним словом: 'работает'",
      });

      // Проверяем наличие текста
      if (!response.text) {
        console.error('Empty response in connection test');
        return false;
      }

      const text = response.text.trim().toLowerCase();
      return text.includes('работает') || text.includes('ok') || text.includes('success');
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  // Получение доступных моделей
  async getAvailableModels(): Promise<string[]> {
    try {
      if (!this.ai) return [];
      
      // В новой версии API может быть другой способ получения моделей
      // Пока возвращаем известные рабочие модели
      return [
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-1.5-pro"
      ];
    } catch (error) {
      console.error('Error getting available models:', error);
      return [];
    }
  }

  // Метод для проверки статуса сервиса
  getStatus(): { initialized: boolean; hasApiKey: boolean } {
    return {
      initialized: this.isInitialized,
      hasApiKey: !!process.env.GEMINI_API_KEY
    };
  }
}

export default new GeminiService();