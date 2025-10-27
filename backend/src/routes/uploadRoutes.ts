import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import { authenticateToken } from '../middleware/authMiddleware';
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

// POST /api/upload/csv - загрузка CSV файла
router.post('/csv', authenticateToken, upload.single('file'), async (req, res) => {
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

// GET /api/upload/template - скачивание шаблона CSV
router.get('/template', authenticateToken, async (req, res) => {
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