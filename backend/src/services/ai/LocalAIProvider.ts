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
    const currentStock = request.currentStock;
    
    // Простые прогнозы на основе текущих данных
    for (const item of currentStock) {
      const predictedDemand = Math.max(1, Math.floor(item.current_stock * 0.1)); // 10% от текущего запаса
      const recommendedStock = Math.max(predictedDemand * 2, 20); // 2x от прогнозируемого спроса
      
      predictions.push({
        product_id: item.product_id,
        product_name: item.product_name,
        predicted_demand: predictedDemand,
        recommended_stock: recommendedStock,
        risk_level: item.current_stock < 20 ? 'HIGH' : item.current_stock < 50 ? 'MEDIUM' : 'LOW',
        confidence: 0.5
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
      timestamp: new Date().toISOString()
    };
  }
}

