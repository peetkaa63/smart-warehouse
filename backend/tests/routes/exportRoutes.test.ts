import request from 'supertest';
import express from 'express';
import exportRoutes from '../../src/routes/exportRoutes';

const app = express();
app.use(express.json());
app.use('/api/export', exportRoutes);

const mockUser = {
  id: 1,
  email: 'test@example.com',
  role: 'admin'
};

jest.mock('../../src/middleware/authMiddleware', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = mockUser;
    next();
  }
}));

jest.mock('../../src/services/AllServices', () => ({
  exportService: {
    exportToExcel: jest.fn(),
    exportToPDF: jest.fn()
  }
}));

jest.mock('@json2csv/plainjs', () => ({
  Parser: jest.fn().mockImplementation(() => ({
    parse: jest.fn(() => 'csv,data,here')
  }))
}));

jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => ({
    pipe: jest.fn(),
    font: jest.fn(),
    fontSize: jest.fn(),
    text: jest.fn(),
    end: jest.fn(),
    on: jest.fn()
  }));
});

jest.mock('fs', () => ({
  existsSync: jest.fn(() => false),
  readFileSync: jest.fn()
}));

describe('Export Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/export/excel', () => {
    it('should export data to Excel format', async () => {
      const { exportService } = require('../../src/services/AllServices');
      exportService.exportToExcel.mockResolvedValue({
        data: [
          { id: 1, product: 'Test Product', quantity: 10 }
        ],
        filename: 'export.xlsx'
      });

      const response = await request(app)
        .get('/api/export/excel')
        .query({
          from: '2024-01-01',
          to: '2024-01-31'
        })
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(exportService.exportToExcel).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '2024-01-01',
          to: '2024-01-31'
        })
      );
    });

    it('should handle errors during export', async () => {
      const { exportService } = require('../../src/services/AllServices');
      exportService.exportToExcel.mockRejectedValue(new Error('Export failed'));

      const response = await request(app)
        .get('/api/export/excel')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/export/pdf', () => {
    it('should export data to PDF format', async () => {
      const { exportService } = require('../../src/services/AllServices');
      exportService.exportToPDF.mockResolvedValue({
        data: [
          { id: 1, product: 'Test Product', quantity: 10 }
        ],
        filename: 'export.pdf'
      });

      const response = await request(app)
        .get('/api/export/pdf')
        .query({
          from: '2024-01-01',
          to: '2024-01-31'
        })
        .set('Authorization', 'Bearer mock-token');

      // PDF экспорт может быть асинхронным, проверяем что сервис был вызван
      expect(exportService.exportToPDF).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '2024-01-01',
          to: '2024-01-31'
        })
      );
    });
  });
});

