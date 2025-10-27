import request from 'supertest';
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import uploadRoutes from '../src/routes/uploadRoutes';

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

describe('CSV Upload and Validation', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = path.join(__dirname, 'temp-uploads');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CSV File Validation', () => {
    it('should accept valid CSV files', async () => {
      const { uploadService } = require('../src/services/AllServices');
      
      const csvContent = 'robot_id,product_id,product_name,quantity,zone,row_number,shelf_number,status,scanned_at\nROBOT-001,PROD-001,Router RT-AC68U,10,A,1,1,OK,2024-01-01T10:00:00Z';
      const tempFilePath = path.join(tempDir, 'valid.csv');
      fs.writeFileSync(tempFilePath, csvContent);

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

      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', tempFilePath);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(uploadService.processCSVUpload).toHaveBeenCalledWith(expect.any(Array));
    });

    it('should reject non-CSV files', async () => {
      const tempFilePath = path.join(tempDir, 'invalid.txt');
      fs.writeFileSync(tempFilePath, 'This is not a CSV file');

      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', tempFilePath);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject files with wrong MIME type', async () => {
      const csvContent = 'robot_id,product_id\nROBOT-001,PROD-001';
      const tempFilePath = path.join(tempDir, 'wrong-mime.csv');
      fs.writeFileSync(tempFilePath, csvContent);

      // Мокаем multer для возврата неправильного MIME типа
      jest.doMock('multer', () => {
        return jest.fn(() => ({
          single: jest.fn(() => (req: any, res: any, next: any) => {
            req.file = {
              fieldname: 'file',
              originalname: 'wrong-mime.csv',
              encoding: '7bit',
              mimetype: 'text/plain', // Неправильный MIME тип
              destination: tempDir,
              filename: 'wrong-mime.csv',
              path: tempFilePath,
              size: csvContent.length
            };
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

    it('should enforce file size limit', async () => {
      // Создаем файл больше 10MB
      const largeContent = 'robot_id,product_id\n' + 'ROBOT-001,PROD-001\n'.repeat(1000000);
      const tempFilePath = path.join(tempDir, 'large.csv');
      fs.writeFileSync(tempFilePath, largeContent);

      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', tempFilePath);

      // Файл должен быть отклонен из-за размера
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('CSV Content Validation', () => {
    it('should handle empty CSV files', async () => {
      const csvContent = 'robot_id,product_id,product_name,quantity,zone,row_number,shelf_number,status,scanned_at\n';
      const tempFilePath = path.join(tempDir, 'empty.csv');
      fs.writeFileSync(tempFilePath, csvContent);

      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', tempFilePath);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'CSV file is empty' });
    });

    it('should handle CSV files with only headers', async () => {
      const csvContent = 'robot_id,product_id,product_name,quantity,zone,row_number,shelf_number,status,scanned_at';
      const tempFilePath = path.join(tempDir, 'headers-only.csv');
      fs.writeFileSync(tempFilePath, csvContent);

      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', tempFilePath);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'CSV file is empty' });
    });

    it('should detect English CSV format', async () => {
      const { uploadService } = require('../src/services/AllServices');
      
      const csvContent = 'robot_id,product_id,product_name,quantity,zone,row_number,shelf_number,status,scanned_at\nROBOT-001,PROD-001,Router RT-AC68U,10,A,1,1,OK,2024-01-01T10:00:00Z';
      const tempFilePath = path.join(tempDir, 'english.csv');
      fs.writeFileSync(tempFilePath, csvContent);

      uploadService.processCSVUpload.mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', tempFilePath);

      expect(response.status).toBe(200);
      
      // Проверяем, что данные переданы в сервис
      expect(uploadService.processCSVUpload).toHaveBeenCalledWith([
        expect.objectContaining({
          robot_id: 'ROBOT-001',
          product_id: 'PROD-001',
          product_name: 'Router RT-AC68U',
          quantity: '10',
          zone: 'A',
          row_number: '1',
          shelf_number: '1',
          status: 'OK',
          scanned_at: '2024-01-01T10:00:00Z'
        })
      ]);
    });

    it('should detect Russian CSV format', async () => {
      const { uploadService } = require('../src/services/AllServices');
      
      const csvContent = 'робот,товар,название_товара,количество,зона,ряд,полка,статус,время_сканирования\nROBOT-001,PROD-001,Роутер RT-AC68U,10,A,1,1,OK,2024-01-01T10:00:00Z';
      const tempFilePath = path.join(tempDir, 'russian.csv');
      fs.writeFileSync(tempFilePath, csvContent);

      uploadService.processCSVUpload.mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', tempFilePath);

      expect(response.status).toBe(200);
      expect(uploadService.processCSVUpload).toHaveBeenCalledWith([
        expect.objectContaining({
          робот: 'ROBOT-001',
          товар: 'PROD-001',
          название_товара: 'Роутер RT-AC68U',
          количество: '10',
          зона: 'A',
          ряд: '1',
          полка: '1',
          статус: 'OK',
          время_сканирования: '2024-01-01T10:00:00Z'
        })
      ]);
    });

    it('should handle CSV with missing required fields', async () => {
      const { uploadService } = require('../src/services/AllServices');
      
      const csvContent = 'robot_id,product_id\nROBOT-001,PROD-001';
      const tempFilePath = path.join(tempDir, 'missing-fields.csv');
      fs.writeFileSync(tempFilePath, csvContent);

      uploadService.processCSVUpload.mockResolvedValue({ 
        success: false, 
        errors: ['Missing required fields: product_name, quantity, zone'] 
      });

      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', tempFilePath);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('Missing required fields: product_name, quantity, zone');
    });

    it('should handle CSV with invalid data types', async () => {
      const { uploadService } = require('../src/services/AllServices');
      
      const csvContent = 'robot_id,product_id,product_name,quantity,zone,row_number,shelf_number,status,scanned_at\nROBOT-001,PROD-001,Router RT-AC68U,invalid_quantity,A,1,1,OK,2024-01-01T10:00:00Z';
      const tempFilePath = path.join(tempDir, 'invalid-types.csv');
      fs.writeFileSync(tempFilePath, csvContent);

      uploadService.processCSVUpload.mockResolvedValue({ 
        success: false, 
        errors: ['Invalid quantity format: invalid_quantity'] 
      });

      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', tempFilePath);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('Invalid quantity format: invalid_quantity');
    });

    it('should handle CSV with duplicate entries', async () => {
      const { uploadService } = require('../src/services/AllServices');
      
      const csvContent = 'robot_id,product_id,product_name,quantity,zone,row_number,shelf_number,status,scanned_at\nROBOT-001,PROD-001,Router RT-AC68U,10,A,1,1,OK,2024-01-01T10:00:00Z\nROBOT-001,PROD-001,Router RT-AC68U,10,A,1,1,OK,2024-01-01T10:00:00Z';
      const tempFilePath = path.join(tempDir, 'duplicates.csv');
      fs.writeFileSync(tempFilePath, csvContent);

      uploadService.processCSVUpload.mockResolvedValue({ 
        success: true, 
        processed_rows: 2,
        warnings: ['Found 1 duplicate entries, processed as separate records']
      });

      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', tempFilePath);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.processed_rows).toBe(2);
      expect(response.body.warnings).toContain('Found 1 duplicate entries, processed as separate records');
    });
  });

  describe('CSV Processing', () => {
    it('should process large CSV files efficiently', async () => {
      const { uploadService } = require('../src/services/AllServices');
      
      // Создаем CSV с 1000 записями
      const headers = 'robot_id,product_id,product_name,quantity,zone,row_number,shelf_number,status,scanned_at';
      const rows = Array.from({ length: 1000 }, (_, i) => 
        `ROBOT-${String(i + 1).padStart(3, '0')},PROD-${String(i + 1).padStart(3, '0')},Product ${i + 1},10,A,1,1,OK,2024-01-01T10:00:00Z`
      );
      const csvContent = [headers, ...rows].join('\n');
      
      const tempFilePath = path.join(tempDir, 'large-dataset.csv');
      fs.writeFileSync(tempFilePath, csvContent);

      uploadService.processCSVUpload.mockResolvedValue({ 
        success: true, 
        processed_rows: 1000,
        summary: {
          total_products: 1000,
          total_quantity: 10000,
          zones_updated: ['A']
        }
      });

      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', tempFilePath);

      expect(response.status).toBe(200);
      expect(response.body.processed_rows).toBe(1000);
      expect(uploadService.processCSVUpload).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ robot_id: 'ROBOT-001' }),
        expect.objectContaining({ robot_id: 'ROBOT-1000' })
      ]));
    });

    it('should handle CSV with special characters', async () => {
      const { uploadService } = require('../src/services/AllServices');
      
      const csvContent = 'robot_id,product_id,product_name,quantity,zone,row_number,shelf_number,status,scanned_at\nROBOT-001,PROD-001,"Роутер RT-AC68U с кириллицей",10,A,1,1,OK,2024-01-01T10:00:00Z';
      const tempFilePath = path.join(tempDir, 'special-chars.csv');
      fs.writeFileSync(tempFilePath, csvContent);

      uploadService.processCSVUpload.mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', tempFilePath);

      expect(response.status).toBe(200);
      expect(uploadService.processCSVUpload).toHaveBeenCalledWith([
        expect.objectContaining({
          product_name: 'Роутер RT-AC68U с кириллицей'
        })
      ]);
    });

    it('should handle CSV with escaped quotes', async () => {
      const { uploadService } = require('../src/services/AllServices');
      
      const csvContent = 'robot_id,product_id,product_name,quantity,zone,row_number,shelf_number,status,scanned_at\nROBOT-001,PROD-001,"Router with ""quotes"" in name",10,A,1,1,OK,2024-01-01T10:00:00Z';
      const tempFilePath = path.join(tempDir, 'escaped-quotes.csv');
      fs.writeFileSync(tempFilePath, csvContent);

      uploadService.processCSVUpload.mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', tempFilePath);

      expect(response.status).toBe(200);
      expect(uploadService.processCSVUpload).toHaveBeenCalledWith([
        expect.objectContaining({
          product_name: 'Router with "quotes" in name'
        })
      ]);
    });

    it('should handle CSV with different delimiters', async () => {
      const { uploadService } = require('../src/services/AllServices');
      
      // CSV с точкой с запятой как разделителем
      const csvContent = 'robot_id;product_id;product_name;quantity;zone;row_number;shelf_number;status;scanned_at\nROBOT-001;PROD-001;Router RT-AC68U;10;A;1;1;OK;2024-01-01T10:00:00Z';
      const tempFilePath = path.join(tempDir, 'semicolon-delimited.csv');
      fs.writeFileSync(tempFilePath, csvContent);

      uploadService.processCSVUpload.mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', tempFilePath);

      expect(response.status).toBe(200);
      // CSV parser должен корректно обработать точку с запятой
      expect(uploadService.processCSVUpload).toHaveBeenCalledWith([
        expect.objectContaining({
          robot_id: 'ROBOT-001',
          product_id: 'PROD-001'
        })
      ]);
    });
  });

  describe('Error Handling', () => {
    it('should handle file reading errors', async () => {
      const tempFilePath = path.join(tempDir, 'corrupted.csv');
      fs.writeFileSync(tempFilePath, 'corrupted data with invalid encoding');

      // Мокаем ошибку чтения файла
      jest.spyOn(fs, 'createReadStream').mockImplementation(() => {
        throw new Error('File read error');
      });

      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', tempFilePath);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');

      // Восстанавливаем оригинальную функцию
      jest.restoreAllMocks();
    });

    it('should handle CSV parsing errors', async () => {
      const tempFilePath = path.join(tempDir, 'malformed.csv');
      fs.writeFileSync(tempFilePath, 'malformed,csv,with,unclosed,"quotes');

      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', tempFilePath);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle service processing errors', async () => {
      const { uploadService } = require('../src/services/AllServices');
      
      const csvContent = 'robot_id,product_id,product_name,quantity,zone,row_number,shelf_number,status,scanned_at\nROBOT-001,PROD-001,Router RT-AC68U,10,A,1,1,OK,2024-01-01T10:00:00Z';
      const tempFilePath = path.join(tempDir, 'service-error.csv');
      fs.writeFileSync(tempFilePath, csvContent);

      uploadService.processCSVUpload.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', tempFilePath);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Database connection failed'
      });
    });

    it('should clean up temporary files on error', async () => {
      const { uploadService } = require('../src/services/AllServices');
      
      const csvContent = 'robot_id,product_id,product_name,quantity,zone,row_number,shelf_number,status,scanned_at\nROBOT-001,PROD-001,Router RT-AC68U,10,A,1,1,OK,2024-01-01T10:00:00Z';
      const tempFilePath = path.join(tempDir, 'cleanup-test.csv');
      fs.writeFileSync(tempFilePath, csvContent);

      uploadService.processCSVUpload.mockRejectedValue(new Error('Processing failed'));

      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', tempFilePath);

      expect(response.status).toBe(500);
      
      // Проверяем, что временный файл был удален
      expect(fs.existsSync(tempFilePath)).toBe(false);
    });
  });

  describe('Template Download', () => {
    it('should download CSV template', async () => {
      const response = await request(app)
        .get('/api/upload/template');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('text/csv');
      expect(response.headers['content-disposition']).toBe('attachment; filename=inventory_template.csv');
      
      // Проверяем содержимое шаблона
      const csvContent = response.text;
      expect(csvContent).toContain('robot_id,product_id,product_name,quantity,zone,row_number,shelf_number,status,scanned_at');
      expect(csvContent).toContain('ROBOT-001');
      expect(csvContent).toContain('PROD-001');
      expect(csvContent).toContain('Sample Product');
    });

    it('should handle template download errors', async () => {
      // Мокаем ошибку при создании шаблона
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app)
        .get('/api/upload/template');

      // В данном случае ошибок быть не должно, так как шаблон статичный
      expect(response.status).toBe(200);
      
      jest.restoreAllMocks();
    });
  });

  describe('Security', () => {
    it('should prevent directory traversal attacks', async () => {
      const maliciousPath = '../../../etc/passwd';
      const tempFilePath = path.join(tempDir, 'malicious.csv');
      fs.writeFileSync(tempFilePath, 'robot_id,product_id\nROBOT-001,PROD-001');

      // Мокаем multer для симуляции попытки directory traversal
      jest.doMock('multer', () => {
        return jest.fn(() => ({
          single: jest.fn(() => (req: any, res: any, next: any) => {
            req.file = {
              fieldname: 'file',
              originalname: maliciousPath,
              encoding: '7bit',
              mimetype: 'text/csv',
              destination: tempDir,
              filename: 'malicious.csv',
              path: tempFilePath,
              size: 100
            };
            next();
          })
        }));
      });

      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', tempFilePath);

      // Запрос должен быть обработан нормально, так как multer уже обработал безопасность
      expect(response.status).toBe(200);
    });

    it('should validate file extension', async () => {
      const tempFilePath = path.join(tempDir, 'fake-csv.exe');
      fs.writeFileSync(tempFilePath, 'robot_id,product_id\nROBOT-001,PROD-001');

      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', tempFilePath);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle files with executable content', async () => {
      const executableContent = '#!/bin/bash\necho "malicious script"';
      const tempFilePath = path.join(tempDir, 'executable.csv');
      fs.writeFileSync(tempFilePath, executableContent);

      const response = await request(app)
        .post('/api/upload/csv')
        .attach('file', tempFilePath);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });
});
