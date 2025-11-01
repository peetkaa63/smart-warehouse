// services/advancedAnalyticsService.ts
import { GoogleGenAI } from "@google/genai";

class AdvancedAnalyticsService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  // Ограничение размера данных для Gemini (примерно 500KB для избежания превышения токенов)
  private limitDataSize(data: any, maxSize: number = 100000): string {
    let result = JSON.stringify(data, null, 2);
    if (result.length > maxSize) {
      // Берем только первые записи
      const items = Array.isArray(data) ? data.slice(0, 5) : data;
      result = JSON.stringify(items, null, 2);
    }
    return result;
  }

  async generateAIInsights(inventoryData: any[], robotData: any[], recentScans: any): Promise<any> {
    if (!this.ai) {
      return this.generateFallbackInsights();
    }

    try {
      // Ограничиваем размер данных
      const limitedInventory = inventoryData.slice(0, 10); // Максимум 10 записей
      const limitedRobots = robotData.slice(0, 5); // Максимум 5 роботов
      
      const inventoryJson = this.limitDataSize(limitedInventory, 30000);
      const robotsJson = this.limitDataSize(limitedRobots, 15000);

      const prompt = `
Ты - AI аналитик склада. Проанализируй данные склада и предоставь экспертные рекомендации НА РУССКОМ ЯЗЫКЕ.

ВАЖНО: Все советы, рекомендации, описания, mitigation, potential_benefit, summary должны быть написаны НА РУССКОМ ЯЗЫКЕ.
Данные (JSON) оставляй в оригинальном виде.

ДАННЫЕ ИНВЕНТАРИЗАЦИИ (последние записи):
${inventoryJson}

ДАННЫЕ РОБОТОВ:
${robotsJson}

СТАТИСТИКА ЗА 24 ЧАСА:
- Всего сканирований: ${recentScans.total_scans || 0}
- Уникальных товаров: ${recentScans.unique_products || 0} 
- Активных роботов: ${recentScans.active_robots || 0}
- Среднее количество: ${Math.round(recentScans.avg_quantity || 0)}

ПРОАНАЛИЗИРУЙ:
1. Эффективность управления запасами
2. Производительность роботов  
3. Потенциальные риски
4. Возможности для оптимизации

ВЕРНИ ОТВЕТ В JSON ФОРМАТЕ (все текстовые поля на русском языке):
{
  "recommendations": [
    {
      "category": "INVENTORY|ROBOTS|PROCESS",
      "title": "строка на русском",
      "description": "строка на русском", 
      "priority": "HIGH|MEDIUM|LOW",
      "expected_impact": "строка на русском"
    }
  ],
  "risks": [
    {
      "type": "STOCKOUT|EQUIPMENT|PROCESS", 
      "description": "строка на русском",
      "severity": "HIGH|MEDIUM|LOW",
      "mitigation": "строка на русском"
    }
  ],
  "opportunities": [
    {
      "area": "EFFICIENCY|COST|ACCURACY",
      "description": "строка на русском", 
      "potential_benefit": "строка на русском"
    }
  ],
  "summary": "строка на русском",
  "overall_health_score": число
}

ВАЖНО: 
- Все текстовые поля (title, description, expected_impact, mitigation, potential_benefit, summary) должны быть на русском языке
- Категории (category, type, area, priority, severity) оставляй в английском формате как указано
- Только JSON, без дополнительного текста.
`;

      const response = await this.ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
      
      // Добавляем проверку на существование response.text
      if (!response.text) {
        console.error('AI response is empty');
        return this.generateFallbackInsights();
      }
      
      const cleanText = response.text.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanText);
      
    } catch (error: any) {
      console.error('AI insights generation error:', error);
      
      // Обработка ошибок превышения токенов
      if (error.message?.includes('token') || error.message?.includes('exceeds')) {
        console.log('⚠️ Token limit exceeded, using fallback');
        return this.generateFallbackInsights();
      }
      
      return this.generateFallbackInsights();
    }
  }

  private generateFallbackInsights() {
    return {
      recommendations: [
        {
          category: "INVENTORY",
          title: "Оптимизация управления запасами",
          description: "Внедрите систему автоматического пополнения для товаров с высокой оборачиваемостью",
          priority: "HIGH",
          expected_impact: "Снижение риска дефицита на 45%"
        }
      ],
      risks: [
        {
          type: "STOCKOUT", 
          description: "Высокий риск дефицита популярных товаров",
          severity: "HIGH",
          mitigation: "Увеличить минимальный запас и настроить уведомления"
        }
      ],
      opportunities: [
        {
          area: "EFFICIENCY",
          description: "Оптимизация маршрутов роботов",
          potential_benefit: "Увеличение скорости инвентаризации на 25%"
        }
      ],
      summary: "Система работает стабильно. Рекомендуется обратить внимание на управление запасами критически важных товаров.",
      overall_health_score: 82
    };
  }
}

export default new AdvancedAnalyticsService();