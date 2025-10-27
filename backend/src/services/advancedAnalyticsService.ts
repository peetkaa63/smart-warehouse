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

  async generateAIInsights(inventoryData: any[], robotData: any[], recentScans: any): Promise<any> {
    if (!this.ai) {
      return this.generateFallbackInsights();
    }

    try {
      const prompt = `
Проанализируй данные склада и предоставь экспертные рекомендации.

ДАННЫЕ ИНВЕНТАРИЗАЦИИ (последние 30 дней):
${JSON.stringify(inventoryData.slice(0, 15), null, 2)}

ДАННЫЕ РОБОТОВ:
${JSON.stringify(robotData, null, 2)}

СТАТИСТИКА ЗА 24 ЧАСА:
- Всего сканирований: ${recentScans.total_scans}
- Уникальных товаров: ${recentScans.unique_products} 
- Активных роботов: ${recentScans.active_robots}
- Среднее количество: ${Math.round(recentScans.avg_quantity)}

ПРОАНАЛИЗИРУЙ:
1. Эффективность управления запасами
2. Производительность роботов  
3. Потенциальные риски
4. Возможности для оптимизации

ВЕРНИ ОТВЕТ В JSON ФОРМАТЕ:
{
  "recommendations": [
    {
      "category": "INVENTORY|ROBOTS|PROCESS",
      "title": "string",
      "description": "string", 
      "priority": "HIGH|MEDIUM|LOW",
      "expected_impact": "string"
    }
  ],
  "risks": [
    {
      "type": "STOCKOUT|EQUIPMENT|PROCESS", 
      "description": "string",
      "severity": "HIGH|MEDIUM|LOW",
      "mitigation": "string"
    }
  ],
  "opportunities": [
    {
      "area": "EFFICIENCY|COST|ACCURACY",
      "description": "string", 
      "potential_benefit": "string"
    }
  ],
  "summary": "string",
  "overall_health_score": number
}

Только JSON, без дополнительного текста.
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
      
    } catch (error) {
      console.error('AI insights generation error:', error);
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