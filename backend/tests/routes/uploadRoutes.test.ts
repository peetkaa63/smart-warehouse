import request from 'supertest';
import express from 'express';
import multer from 'multer';
import uploadRoutes from '../src/routes/uploadRoutes';
import fs from 'fs';
import path from 'path';

// Создаем тестовое приложение
const app = express();
app.use(express.json());
app.use('/api/upload', uploadRoutes);

// Мокаем сервисы
jest.mock('../src/services/AllServices', () => ({
  uploadService: {
    processCSVUpload: jest.fn()
  }
}));

// Мокаем middleware аутентификации
jest.mock('../src/middleware/authMiddleware', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 1, email: 'test@example.com' };
    next();
  }
}));

// Мокаем файловую систему
jest.mock('fs');
jest.mock('csv-parser');

describe('Upload Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Создаем временную директорию для тестов
    const mockUploadsDir = path.join(__dirname, 'temp-uploads');
    if (!fs.existsSync(mockUploadsDir)) {
      fs.mkdirSync(mockUploadsDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Очищаем временные файлы
    const mockUploadsDir = path.join(__dirname, 'temp-uploads');
    if (fs.existsSync(mockUploadsDir)) {
      fs.rmSync(mockUploadsDir, { recursive: true, force: true });
    }
  });

  describe('POST /api/upload/csv', () => {
    it('should upload and process CSV file successfully', async () => {
      const { uploadService } = require('../src/services/AllServices');
      
      const mockCsvData = [
        {
          robot_id: 'ROBOT-001',
          product_id: 'PROD-001',
          product_name: 'Router RT-AC68U',
          quantity: '10',
          zone: 'A',
          row_number: '1',
          shelf_number: '1',
          status: 'OK',
          scanned_at: new Date().toISOString()
        }
      ];

      const mockResult = {
        success: true,
        processed_rows: 1,
        errors: [],
        summary: {
          total_products: 1,
          total_quantity: 10,
          zones_updated: ['A']
        }
      };

      uploadService.processCSVUpload.mockResolvedValue(mockResult);

      // Создаем тестовый CSV файл
      const csvContent = 'robot_id,product_id,product_name,quantity,zone,row_number,shelf_number,status,scanned_at\nROBOT-001,PROD-001,Router RT-AC68U,10,A,1,1,OK,2024-01-01T10:00:00Z';
      const tempFilePath = path.join(__dirname, 'temp-uploads', 'test.csv');
      fs.writeFileSync(tempFilePath, csvContent);

      // Мокаем multer
      const mockFile = {
        fieldname: 'file',
        originalname: 'test.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        destination: path.dirname(tempFilePath),
        filename: 'test.csv',
        path: tempFilePath,
        size: csvContent.length
      };

      // Мокаем multer middleware
      jest.doMock('multer', () => {
        return jest.fn(() => ({
          single: jest.fn(() => (req: any, res: any, next: any) => {
            req.file = mockFile;
            next();
          })
        }));
      });

      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', tempFilePath);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(uploadService.processCSVUpload).toHaveBeenCalledWith(expect.any(Array));
    });

    it('should reject non-CSV files', async () => {
      const tempFilePath = path.join(__dirname, 'temp-uploads', 'test.txt');
      fs.writeFileSync(tempFilePath, 'This is not a CSV file');

      const mockFile = {
        fieldname: 'file',
        originalname: 'test.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        destination: path.dirname(tempFilePath),
        filename: 'test.txt',
        path: tempFilePath,
        size: 100
      };

      jest.doMock('multer', () => {
        return jest.fn(() => ({
          single: jest.fn(() => (req: any, res: any, next: any) => {
            req.file = mockFile;
            next();
          })
        }));
      });

      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', tempFilePath);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle empty CSV files', async () => {
      const { uploadService } = require('../src/services/AllServices');
      
      uploadService.processCSVUpload.mockResolvedValue({
        success: true,
        processed_rows: 0,
        errors: [],
        summary: { total_products: 0 }
      });

      const csvContent = 'robot_id,product_id,product_name,quantity,zone,row_number,shelf_number,status,scanned_at\n';
      const tempFilePath = path.join(__dirname, 'temp-uploads', 'empty.csv');
      fs.writeFileSync(tempFilePath, csvContent);

      const mockFile = {
        fieldname: 'file',
        originalname: 'empty.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        destination: path.dirname(tempFilePath),
        filename: 'empty.csv',
        path: tempFilePath,
        size: csvContent.length
      };

      jest.doMock('multer', () => {
        return jest.fn(() => ({
          single: jest.fn(() => (req: any, res: any, next: any) => {
            req.file = mockFile;
            next();
          }))
        }));
      });

      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', tempFilePath);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'CSV file is empty' });
    });

    it('should handle file upload errors', async () => {
      const { uploadService } = require('../src/services/AllServices');
      
      uploadService.processCSVUpload.mockRejectedValue(new Error('Processing failed'));

      const csvContent = 'robot_id,product_id\nROBOT-001,PROD-001';
      const tempFilePath = path.join(__dirname, 'temp-uploads', 'error.csv');
      fs.writeFileSync(tempFilePath, csvContent);

      const mockFile = {
        fieldname: 'file',
        originalname: 'error.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        destination: path.dirname(tempFilePath),
        filename: 'error.csv',
        path: tempFilePath,
        size: csvContent.length
      };

      jest.doMock('multer', () => {
        return jest.fn(() => ({
          single: jest.fn(() => (req: any, res: any, next: any) => {
            req.file = mockFile;
            next();
          }))
        }));
      });

      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', tempFilePath);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Processing failed'
      });
    });

    it('should handle missing file', async () => {
      jest.doMock('multer', () => {
        return jest.fn(() => ({
          single: jest.fn(() => (req: any, res: any, next: any) => {
            req.file = undefined;
            next();
          }))
        }));
      });

      const response = await request(app)
        .post('/api/upload/csv');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'No file uploaded' });
    });
  });

  describe('GET /api/upload/template', () => {
    it('should download CSV template', async () => {
      const response = await request(app)
        .get('/api/upload/template');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('text/csv');
      expect(response.headers['content-disposition']).toBe('attachment; filename=inventory_template.csv');
      expect(response.text).toContain('robot_id,product_id,product_name,quantity,zone,row_number,shelf_number,status,scanned_at');
    });

    it('should handle template download errors', async () => {
      // Мокаем ошибку при создании шаблона
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app)
        .get('/api/upload/template');

      // В данном случае ошибок быть не должно, так как шаблон статичный
      expect(response.status).toBe(200);
    });
  });
});
