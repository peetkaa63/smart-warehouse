import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';
import { uploadService } from '../services/AllServices';

const router = express.Router();

const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.csv');
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

// Функция для определения формата CSV по содержимому
function detectCsvFormat(headers: string | string[]): string {
  console.log('🔍 Detecting CSV format for headers:', headers);
  
  if (Array.isArray(headers)) {
    const headerString = headers.join(',');
    
    const hasEnglishHeaders = headerString.toLowerCase().includes('product_id') ||
                             headerString.toLowerCase().includes('robot_id') ||
                             headerString.toLowerCase().includes('quantity');
    
    const hasRussianHeaders = headerString.includes('товар') ||
                             headerString.includes('робот') ||
                             headerString.includes('количество');
    
    if (hasEnglishHeaders) return 'english';
    if (hasRussianHeaders) return 'russian';
  }
  
  return 'unknown';
}

/**
 * @swagger
 * /api/upload/csv:
 *   post:
 *     summary: Загрузить CSV файл с данными инвентаря
 *     description: Загружает и обрабатывает CSV файл с данными инвентаризации. Доступно для операторов и администраторов.
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV файл с данными инвентаря
 *           encoding:
 *             file:
 *               contentType: text/csv, application/vnd.ms-excel
 *     responses:
 *       200:
 *         description: CSV файл успешно обработан
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 processed_rows:
 *                   type: integer
 *                   example: 150
 *                   description: Количество обработанных строк
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: []
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total_products:
 *                       type: integer
 *                       example: 120
 *                     total_quantity:
 *                       type: integer
 *                       example: 5000
 *                     zones_updated:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["A", "B", "C"]
 *             example:
 *               success: true
 *               processed_rows: 150
 *               errors: []
 *               summary:
 *                 total_products: 120
 *                 total_quantity: 5000
 *                 zones_updated: ["A", "B", "C"]
 *       400:
 *         description: Ошибка валидации
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No file uploaded"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// POST /api/upload/csv - загрузка CSV файла
router.post('/csv', authenticateToken, requireRole(['operator', 'admin']), upload.single('file'), async (req, res) => {
  try {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

    console.log('📤 Processing uploaded file:', req.file.originalname);

    const csvData: any[] = [];
    const filePath = req.file.path;

    // Читаем CSV файл
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          csvData.push(row);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`📊 Parsed ${csvData.length} rows from CSV`);

    if (csvData.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty' });
    }

    // Определяем формат CSV
    const format = detectCsvFormat(Object.keys(csvData[0]));
    console.log('🔍 Detected CSV format:', format);

    // Обрабатываем данные через сервис
    const result = await uploadService.processCSVUpload(csvData);

    // Удаляем временный файл
    fs.unlinkSync(filePath);

    res.json(result);

  } catch (error: any) {
    console.error('❌ CSV upload error:', error);
    
    // Удаляем временный файл при ошибке
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/upload/template:
 *   get:
 *     summary: Скачать шаблон CSV файла
 *     description: Возвращает шаблон CSV файла для загрузки данных инвентаря. Доступно для операторов и администраторов.
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Шаблон CSV файла
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *             example: |
 *               robot_id,product_id,product_name,quantity,zone,row_number,shelf_number,status,scanned_at
 *               ROBOT-001,PROD-001,Sample Product,10,A,1,1,OK,2024-01-15T10:30:00.000Z
 *         headers:
 *           Content-Disposition:
 *             schema:
 *               type: string
 *               example: "attachment; filename=inventory_template.csv"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// GET /api/upload/template - скачивание шаблона CSV (доступно operator и admin для загрузки данных)
router.get('/template', authenticateToken, requireRole(['operator', 'admin']), async (req, res) => {
  try {
    const templateData = [
      {
        robot_id: 'ROBOT-001',
        product_id: 'PROD-001',
        product_name: 'Sample Product',
        quantity: '10',
        zone: 'A',
        row_number: '1',
        shelf_number: '1',
        status: 'OK',
        scanned_at: new Date().toISOString()
      }
    ];

    const csvContent = [
      'robot_id,product_id,product_name,quantity,zone,row_number,shelf_number,status,scanned_at',
      ...templateData.map(row => Object.values(row).join(','))
    ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory_template.csv');
    res.send(csvContent);

  } catch (error: any) {
    console.error('❌ Template download error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;