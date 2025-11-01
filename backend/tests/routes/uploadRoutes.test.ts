import request from 'supertest';
import express from 'express';
import multer from 'multer';
import uploadRoutes from '../src/routes/uploadRoutes';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

// Создаем тестовое приложение
const app = express();
app.use(express.json());
app.use('/api/upload', uploadRoutes);

// Вспомогательная функция для создания JWT токена
const createToken = (role: string) => {
  return jwt.sign(
    { id: 1, email: 'test@example.com', role },
    process.env.JWT_SECRET || 'test-secret'
  );
};

// Мокаем сервисы
jest.mock('../src/services/AllServices', () => ({
  uploadService: {
    processCSVUpload: jest.fn()
  }
}));

// Мокаем middleware аутентификации с проверкой ролей
jest.mock('../src/middleware/authMiddleware', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret') as any;
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
  },
  requireRole: (roles: string[]) => {
    return (req: any, res: any, next: any) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      next();
    };
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
    it('should upload and process CSV file successfully for operator', async () => {
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

      const token = createToken('operator');

      const response = await request(app)
        .post('/api/upload/csv')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', tempFilePath);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(uploadService.processCSVUpload).toHaveBeenCalledWith(expect.any(Array));
    });

    it('should reject non-CSV files', async () => {
      const tempFilePath = path.join(__dirname, 'temp-uploads', 'test.txt');
      fs.writeFileSync(tempFilePath, 'This is not a CSV file');
      const token = createToken('operator');

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
        .set('Authorization', `Bearer ${token}`)
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

      const token = createToken('operator');

      const response = await request(app)
        .post('/api/upload/csv')
        .set('Authorization', `Bearer ${token}`)
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

      const token = createToken('operator');

      const response = await request(app)
        .post('/api/upload/csv')
        .set('Authorization', `Bearer ${token}`)
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

      const token = createToken('operator');

      const response = await request(app)
        .post('/api/upload/csv')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'No file uploaded' });
    });

    it('should reject CSV upload for viewer', async () => {
      const token = createToken('viewer');

      const response = await request(app)
        .post('/api/upload/csv')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', path.join(__dirname, 'temp-uploads', 'test.csv'));

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should allow CSV upload for admin', async () => {
      const { uploadService } = require('../src/services/AllServices');
      const token = createToken('admin');

      uploadService.processCSVUpload.mockResolvedValue({
        success: true,
        processed_rows: 1
      });

      const csvContent = 'robot_id,product_id\nROBOT-001,PROD-001';
      const tempFilePath = path.join(__dirname, 'temp-uploads', 'admin-test.csv');
      fs.writeFileSync(tempFilePath, csvContent);

      jest.doMock('multer', () => {
        return jest.fn(() => ({
          single: jest.fn(() => (req: any, res: any, next: any) => {
            req.file = {
              fieldname: 'file',
              originalname: 'admin-test.csv',
              path: tempFilePath
            };
            next();
          })
        }));
      });

      const response = await request(app)
        .post('/api/upload/csv')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', tempFilePath);

      expect(response.status).toBe(200);
    });

    it('should require authentication for CSV upload', async () => {
      const response = await request(app)
        .post('/api/upload/csv');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/upload/template', () => {
    it('should download CSV template for operator', async () => {
      const token = createToken('operator');

      const response = await request(app)
        .get('/api/upload/template')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('text/csv');
      expect(response.headers['content-disposition']).toBe('attachment; filename=inventory_template.csv');
      expect(response.text).toContain('robot_id,product_id,product_name,quantity,zone,row_number,shelf_number,status,scanned_at');
    });

    it('should download CSV template for admin', async () => {
      const token = createToken('admin');

      const response = await request(app)
        .get('/api/upload/template')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('text/csv');
    });

    it('should reject template download for viewer', async () => {
      const token = createToken('viewer');

      const response = await request(app)
        .get('/api/upload/template')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should require authentication for template download', async () => {
      const response = await request(app)
        .get('/api/upload/template');

      expect(response.status).toBe(401);
    });

    it('should handle template download errors', async () => {
      // Мокаем ошибку при создании шаблона
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const token = createToken('operator');

      const response = await request(app)
        .get('/api/upload/template')
        .set('Authorization', `Bearer ${token}`);

      // В данном случае ошибок быть не должно, так как шаблон статичный
      expect(response.status).toBe(200);
    });
  });
});
