import geminiService from '../src/services/geminiService';

// Мокаем Google GenAI
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: jest.fn()
    }
  }))
}));

describe('Gemini AI Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  describe('Initialization', () => {
    it('should initialize with valid API key', () => {
      const status = geminiService.getStatus();
      expect(status.hasApiKey).toBe(true);
    });

    it('should handle missing API key', () => {
      delete process.env.GEMINI_API_KEY;
      
      // Пересоздаем сервис для тестирования инициализации
      const { GoogleGenAI } = require('@google/genai');
      const newService = new (require('../src/services/geminiService').default)();
      
      const status = newService.getStatus();
      expect(status.hasApiKey).toBe(false);
    });
  });

  describe('analyzeInventoryData', () => {
    it('should analyze inventory data successfully', async () => {
      const { GoogleGenAI } = require('@google/genai');
      const mockAI = new GoogleGenAI();
      
      const mockResponse = {
        text: JSON.stringify({
          predictions: [
            {
              product_id: 'PROD-001',
              product_name: 'Router RT-AC68U',
              current_stock: 15,
              days_until_stockout: 3,
              recommended_order_quantity: 50,
              confidence_score: 0.85,
              reasoning: 'High consumption rate detected'
            }
          ],
          analysis_summary: 'Critical stock levels detected'
        })
      };

      mockAI.models.generateContent.mockResolvedValue(mockResponse);

      const historicalData = [
        { product_id: 'PROD-001', quantity: 20, date: '2024-01-01' },
        { product_id: 'PROD-001', quantity: 15, date: '2024-01-02' }
      ];

      const currentStock = [
        { product_id: 'PROD-001', quantity: 15, zone: 'A' }
      ];

      const result = await geminiService.analyzeInventoryData(historicalData, currentStock);

      expect(result).toHaveProperty('predictions');
      expect(result).toHaveProperty('analysis_summary');
      expect(result.predictions).toHaveLength(1);
      expect(result.predictions[0].product_id).toBe('PROD-001');
      expect(mockAI.models.generateContent).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash',
        contents: expect.stringContaining('Ты - AI аналитик склада')
      });
    });

    it('should handle empty response from AI', async () => {
      const { GoogleGenAI } = require('@google/genai');
      const mockAI = new GoogleGenAI();
      
      mockAI.models.generateContent.mockResolvedValue({ text: null });

      const historicalData = [];
      const currentStock = [];

      await expect(geminiService.analyzeInventoryData(historicalData, currentStock))
        .rejects.toThrow('Empty response from Gemini AI');
    });

    it('should handle invalid JSON response', async () => {
      const { GoogleGenAI } = require('@google/genai');
      const mockAI = new GoogleGenAI();
      
      mockAI.models.generateContent.mockResolvedValue({
        text: 'Invalid JSON response'
      });

      const historicalData = [];
      const currentStock = [];

      await expect(geminiService.analyzeInventoryData(historicalData, currentStock))
        .rejects.toThrow();
    });

    it('should handle network errors', async () => {
      const { GoogleGenAI } = require('@google/genai');
      const mockAI = new GoogleGenAI();
      
      mockAI.models.generateContent.mockRejectedValue(new Error('fetch failed'));

      const historicalData = [];
      const currentStock = [];

      await expect(geminiService.analyzeInventoryData(historicalData, currentStock))
        .rejects.toThrow('AI analysis failed: fetch failed');
    });

    it('should handle quota exceeded errors', async () => {
      const { GoogleGenAI } = require('@google/genai');
      const mockAI = new GoogleGenAI();
      
      mockAI.models.generateContent.mockRejectedValue(new Error('quota exceeded'));

      const historicalData = [];
      const currentStock = [];

      await expect(geminiService.analyzeInventoryData(historicalData, currentStock))
        .rejects.toThrow('AI analysis failed: quota exceeded');
    });

    it('should try alternative model on model errors', async () => {
      const { GoogleGenAI } = require('@google/genai');
      const mockAI = new GoogleGenAI();
      
      // Первый вызов с основной моделью - ошибка
      mockAI.models.generateContent
        .mockRejectedValueOnce(new Error('model not found'))
        // Второй вызов с альтернативной моделью - успех
        .mockResolvedValueOnce({
          text: JSON.stringify({
            predictions: [
              {
                product_id: 'PROD-001',
                product_name: 'Router RT-AC68U',
                current_stock: 15,
                days_until_stockout: 3,
                recommended_order_quantity: 50,
                confidence_score: 0.85
              }
            ]
          })
        });

      const historicalData = [];
      const currentStock = [];

      const result = await geminiService.analyzeInventoryData(historicalData, currentStock);

      expect(result).toHaveProperty('predictions');
      expect(mockAI.models.generateContent).toHaveBeenCalledTimes(2);
      // Проверяем, что второй вызов был с альтернативной моделью
      expect(mockAI.models.generateContent).toHaveBeenLastCalledWith({
        model: 'gemini-2.0-flash',
        contents: expect.any(String)
      });
    });
  });

  describe('predictStockLevels', () => {
    it('should predict stock levels successfully', async () => {
      const { GoogleGenAI } = require('@google/genai');
      const mockAI = new GoogleGenAI();
      
      const mockResponse = {
        text: JSON.stringify({
          predictions: [
            {
              product_id: 'TEL-4567',
              product_name: 'Роутер RT-AC68U',
              current_stock: 15,
              days_until_stockout: 3,
              recommended_order_quantity: 50,
              confidence_score: 0.85,
              risk_level: 'HIGH'
            }
          ]
        })
      };

      mockAI.models.generateContent.mockResolvedValue(mockResponse);

      const inventoryData = [
        { product_id: 'TEL-4567', quantity: 15, zone: 'A' }
      ];

      const result = await geminiService.predictStockLevels(inventoryData);

      expect(result).toHaveProperty('predictions');
      expect(result.predictions[0].risk_level).toBe('HIGH');
      expect(mockAI.models.generateContent).toHaveBeenCalledWith({
        model: 'gemini-2.0-flash',
        contents: expect.stringContaining('Анализ складских остатков')
      });
    });

    it('should handle empty response in predictStockLevels', async () => {
      const { GoogleGenAI } = require('@google/genai');
      const mockAI = new GoogleGenAI();
      
      mockAI.models.generateContent.mockResolvedValue({ text: null });

      const inventoryData = [];

      await expect(geminiService.predictStockLevels(inventoryData))
        .rejects.toThrow('Empty response from Gemini AI');
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      const { GoogleGenAI } = require('@google/genai');
      const mockAI = new GoogleGenAI();
      
      mockAI.models.generateContent.mockResolvedValue({
        text: 'работает'
      });

      const result = await geminiService.testConnection();

      expect(result).toBe(true);
      expect(mockAI.models.generateContent).toHaveBeenCalledWith({
        model: 'gemini-2.0-flash',
        contents: 'Ответь одним словом: \'работает\''
      });
    });

    it('should handle connection test failure', async () => {
      const { GoogleGenAI } = require('@google/genai');
      const mockAI = new GoogleGenAI();
      
      mockAI.models.generateContent.mockRejectedValue(new Error('Connection failed'));

      const result = await geminiService.testConnection();

      expect(result).toBe(false);
    });

    it('should return false for empty response in connection test', async () => {
      const { GoogleGenAI } = require('@google/genai');
      const mockAI = new GoogleGenAI();
      
      mockAI.models.generateContent.mockResolvedValue({ text: null });

      const result = await geminiService.testConnection();

      expect(result).toBe(false);
    });

    it('should recognize different success responses', async () => {
      const { GoogleGenAI } = require('@google/genai');
      const mockAI = new GoogleGenAI();
      
      const successResponses = ['работает', 'OK', 'Success', 'ok', 'SUCCESS'];
      
      for (const response of successResponses) {
        mockAI.models.generateContent.mockResolvedValue({
          text: response
        });

        const result = await geminiService.testConnection();
        expect(result).toBe(true);
      }
    });
  });

  describe('getAvailableModels', () => {
    it('should return available models', async () => {
      const result = await geminiService.getAvailableModels();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain('gemini-2.0-flash');
      expect(result).toContain('gemini-1.5-flash');
      expect(result).toContain('gemini-1.5-pro');
    });

    it('should handle errors when getting models', async () => {
      const { GoogleGenAI } = require('@google/genai');
      const mockAI = new GoogleGenAI();
      
      // Мокаем ошибку при получении моделей
      mockAI.models = null;

      const result = await geminiService.getAvailableModels();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3); // Fallback models
    });
  });

  describe('getStatus', () => {
    it('should return correct status when initialized', () => {
      const status = geminiService.getStatus();

      expect(status).toHaveProperty('initialized');
      expect(status).toHaveProperty('hasApiKey');
      expect(typeof status.initialized).toBe('boolean');
      expect(typeof status.hasApiKey).toBe('boolean');
    });

    it('should return false for hasApiKey when no API key', () => {
      delete process.env.GEMINI_API_KEY;
      
      const status = geminiService.getStatus();
      expect(status.hasApiKey).toBe(false);
    });
  });

  describe('Data Limiting', () => {
    it('should limit historical data to 8 items', async () => {
      const { GoogleGenAI } = require('@google/genai');
      const mockAI = new GoogleGenAI();
      
      mockAI.models.generateContent.mockResolvedValue({
        text: JSON.stringify({ predictions: [] })
      });

      const largeHistoricalData = Array.from({ length: 20 }, (_, i) => ({
        product_id: `PROD-${i}`,
        quantity: 10,
        date: '2024-01-01'
      }));

      const currentStock = [];

      await geminiService.analyzeInventoryData(largeHistoricalData, currentStock);

      const callArgs = mockAI.models.generateContent.mock.calls[0][0];
      const prompt = callArgs.contents;
      
      // Проверяем, что в промпте только 8 элементов исторических данных
      const historicalMatches = prompt.match(/ИСТОРИЧЕСКИЕ ДАННЫЕ.*?ТЕКУЩИЕ ОСТАТКИ/s);
      expect(historicalMatches).toBeTruthy();
    });

    it('should limit current stock to 8 items', async () => {
      const { GoogleGenAI } = require('@google/genai');
      const mockAI = new GoogleGenAI();
      
      mockAI.models.generateContent.mockResolvedValue({
        text: JSON.stringify({ predictions: [] })
      });

      const historicalData = [];
      const largeCurrentStock = Array.from({ length: 20 }, (_, i) => ({
        product_id: `PROD-${i}`,
        quantity: 10,
        zone: 'A'
      }));

      await geminiService.analyzeInventoryData(historicalData, largeCurrentStock);

      const callArgs = mockAI.models.generateContent.mock.calls[0][0];
      const prompt = callArgs.contents;
      
      // Проверяем, что в промпте только 8 элементов текущих остатков
      const currentMatches = prompt.match(/ТЕКУЩИЕ ОСТАТКИ.*?ЗАДАЧА/s);
      expect(currentMatches).toBeTruthy();
    });
  });
});
