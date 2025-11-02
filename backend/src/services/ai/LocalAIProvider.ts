import { IAIProvider, AIAnalysisRequest, AIAnalysisResponse } from './IAIProvider';

export class LocalAIProvider implements IAIProvider {
  private isInitialized: boolean = false;
  private providerName = 'LocalAI';

  async initialize(): Promise<boolean> {
    try {
      // Локальный AI провайдер - простые алгоритмы без внешних API
      this.isInitialized = true;
      console.log('✅ Local AI provider initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Local AI:', error);
      this.isInitialized = false;
      return false;
    }
  }

  isAvailable(): boolean {
    return this.isInitialized;
  }

  getProviderName(): string {
    return this.providerName;
  }

  async analyzeInventoryData(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    if (!this.isAvailable()) {
      return this.getFallbackResponse();
    }

    try {
      const insights = this.performLocalAnalysis(request);
      
      return {
        insights,
        confidence: 0.6, // Локальный анализ менее точный
        provider: this.providerName,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Local AI analysis error:', error);
      return this.getFallbackResponse();
    }
  }

  async getPredictions(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    if (!this.isAvailable()) {
      return this.getFallbackResponse();
    }

    try {
      const predictions = this.performLocalPredictions(request);
      
      return {
        predictions,
        confidence: 0.5, // Локальные прогнозы менее точные
        provider: this.providerName,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Local AI prediction error:', error);
      return this.getFallbackResponse();
    }
  }

  async getRecommendations(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    if (!this.isAvailable()) {
      return this.getFallbackResponse();
    }

    try {
      const recommendations = this.performLocalRecommendations(request);
      
      return {
        recommendations,
        confidence: 0.6,
        provider: this.providerName,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Local AI recommendation error:', error);
      return this.getFallbackResponse();
    }
  }

  private performLocalAnalysis(request: AIAnalysisRequest): any[] {
    const insights = [];
    
    // Простой анализ трендов
    const historicalData = request.historicalData;
    if (historicalData.length > 0) {
      const avgQuantity = historicalData.reduce((sum, item) => sum + (item.quantity || 0), 0) / historicalData.length;
      
      if (avgQuantity < 20) {
        insights.push({
          type: 'PROBLEM',
          title: 'Low Average Stock',
          description: `Average stock level is ${avgQuantity.toFixed(1)}, which is below recommended threshold`,
          severity: 'MEDIUM',
          affected_products: [...new Set(historicalData.map(item => item.product_id))]
        });
      }
    }

    // Анализ критических товаров
    const criticalItems = historicalData.filter(item => item.status === 'CRITICAL');
    if (criticalItems.length > 0) {
      insights.push({
        type: 'PROBLEM',
        title: 'Critical Stock Items',
        description: `${criticalItems.length} items are at critical stock levels`,
        severity: 'HIGH',
        affected_products: [...new Set(criticalItems.map(item => item.product_id))]
      });
    }

    return insights;
  }

  private performLocalPredictions(request: AIAnalysisRequest): any[] {
    const predictions = [];
    const currentStock = request.currentStock || [];
    const historicalData = request.historicalData || [];
    const periodDays = request.periodDays || 7;
    
    // Простые прогнозы на основе текущих данных и истории
    for (const item of currentStock) {
      const current_stock = Number(item.current_stock) || 0;
      const min_stock = Number(item.min_stock) || 10;
      const optimal_stock = Number(item.optimal_stock) || 50;
      
      // Получаем историю для этого товара
      const productHistory = historicalData.filter((h: any) => h.product_id === item.product_id);
      
      // Рассчитываем средний дневной расход из истории
      let avgDailyConsumption = 0;
      if (productHistory.length > 1) {
        const sortedHistory = productHistory.sort((a: any, b: any) => 
          new Date(a.date || a.scanned_at).getTime() - new Date(b.date || b.scanned_at).getTime()
        );
        const firstQty = Number(sortedHistory[0]?.quantity) || current_stock;
        const lastQty = Number(sortedHistory[sortedHistory.length - 1]?.quantity) || current_stock;
        const firstDate = new Date(sortedHistory[0]?.date || sortedHistory[0]?.scanned_at || new Date());
        const lastDate = new Date(sortedHistory[sortedHistory.length - 1]?.date || sortedHistory[sortedHistory.length - 1]?.scanned_at || new Date());
        const daysDiff = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
        avgDailyConsumption = Math.max(0, (firstQty - lastQty) / daysDiff);
      }
      
      // Если нет истории или очень маленькое потребление, используем правило: если текущий остаток меньше минимального, значит расход идет
      if (avgDailyConsumption <= 0.01 && current_stock < min_stock) {
        avgDailyConsumption = Math.max(0.1, (min_stock - current_stock) / 7); // Предполагаем 7 дней до минимума
      }
      
      // Рассчитываем дни до истощения запаса
      let days_until_stockout: number | null = null;
      if (avgDailyConsumption > 0.01 && current_stock > 0) {
        const calculatedDays = current_stock / avgDailyConsumption;
        // Ограничиваем максимальное значение (например, 365 дней)
        days_until_stockout = Math.min(365, Math.floor(calculatedDays));
      } else if (current_stock <= 0) {
        days_until_stockout = 0;
      } else if (avgDailyConsumption <= 0.01 && current_stock >= optimal_stock) {
        // Если потребление очень низкое и запас оптимален, возвращаем null (неопределенно)
        days_until_stockout = null;
      } else {
        days_until_stockout = null; // Невозможно определить
      }
      
      // Рекомендуемый заказ = разница между оптимальным и текущим стоком
      const recommended_order_quantity = Math.max(0, optimal_stock - current_stock);
      
      // Определяем уровень риска на основе текущего стока относительно min и optimal
      let risk_level: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
      if (current_stock < min_stock) {
        risk_level = 'HIGH';
      } else if (current_stock < (min_stock + optimal_stock) / 2) {
        risk_level = 'MEDIUM';
      }
      
      // Уверенность зависит от наличия исторических данных
      const confidence_score = productHistory.length > 5 ? 0.7 : productHistory.length > 0 ? 0.5 : 0.3;
      
      predictions.push({
        product_id: item.product_id,
        product_name: item.product_name,
        current_stock: current_stock,
        min_stock: min_stock,
        optimal_stock: optimal_stock,
        days_until_stockout: days_until_stockout,
        recommended_order_quantity: recommended_order_quantity,
        confidence_score: confidence_score,
        risk_level: risk_level,
        reasoning: avgDailyConsumption > 0 
          ? `Средний дневной расход: ${avgDailyConsumption.toFixed(1)} шт. Текущий остаток: ${current_stock} шт. Минимум: ${min_stock} шт.`
          : `Текущий остаток: ${current_stock} шт. Рекомендуется довести до оптимального уровня: ${optimal_stock} шт.`
      });
    }

    return predictions;
  }

  private performLocalRecommendations(request: AIAnalysisRequest): any[] {
    const recommendations = [];
    
    // Рекомендации на основе простых правил
    const historicalData = request.historicalData;
    const criticalCount = historicalData.filter(item => item.status === 'CRITICAL').length;
    
    if (criticalCount > 0) {
      recommendations.push({
        category: 'INVENTORY',
        title: 'Increase Stock Levels',
        description: `Consider increasing stock levels for ${criticalCount} critical items`,
        priority: 'HIGH',
        expected_impact: 'Reduced stockout risk'
      });
    }

    recommendations.push({
      category: 'PROCESS',
      title: 'Regular Monitoring',
      description: 'Implement more frequent inventory monitoring',
      priority: 'MEDIUM',
      expected_impact: 'Better visibility into stock levels'
    });

    return recommendations;
  }

  private getFallbackResponse(): AIAnalysisResponse {
    return {
      predictions: [],
      insights: [],
      recommendations: [],
      confidence: 0,
      provider: this.providerName,
      timestamp: new Date().toISOString(),
      isFallback: true,
      fallbackReason: 'Локальный AI провайдер недоступен'
    };
  }
}

