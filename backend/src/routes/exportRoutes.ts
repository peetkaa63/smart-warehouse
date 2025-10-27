import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { exportService } from '../services/AllServices';
import { Parser } from '@json2csv/plainjs';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Вспомогательная функция для перевода статусов на русский
function getStatusText(status: string): string {
  const statusMap: { [key: string]: string } = {
    'OK': 'НОРМА',
    'LOW_STOCK': 'НИЗКИЙ',
    'CRITICAL': 'КРИТИЧЕСКИЙ'
  };
  return statusMap[status] || status;
}

// Функция для регистрации шрифтов
const registerFonts = (doc: PDFKit.PDFDocument): boolean => {
  try {
    const fontsDir = path.join(__dirname, '../fonts');
    console.log('📁 Fonts directory:', fontsDir);
    
    if (!fs.existsSync(fontsDir)) {
      console.log('❌ Fonts directory not found');
      return false;
    }

    const arialPath = path.join(fontsDir, 'arialmt.ttf');
    console.log('🔍 Looking for Arial font at:', arialPath);
    
    if (fs.existsSync(arialPath)) {
      doc.registerFont('Arial', arialPath);
      console.log('✅ Arial font registered successfully');
    } else {
      console.log('❌ Arial font not found at:', arialPath);
      const files = fs.readdirSync(fontsDir);
      console.log('📋 Available font files:', files);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error registering fonts:', error);
    return false;
  }
};

// GET /api/export/excel - экспорт в Excel
router.get('/excel', authenticateToken, async (req, res) => {
  try {
    const filters = req.query;
    const result = await exportService.exportToExcel(filters);
    
    // Конвертируем данные в CSV для Excel
    const parser = new Parser();
    const csv = parser.parse(result.data);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(csv);

  } catch (error: any) {
    console.error('❌ Excel export error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/export/pdf - экспорт в PDF
router.get('/pdf', authenticateToken, async (req, res) => {
  try {
    const filters = req.query;
    const result = await exportService.exportToPDF(filters);
    
    // Создаем PDF документ
    const doc = new PDFDocument();
    
    // Регистрируем шрифты
    const fontsRegistered = registerFonts(doc);
    const fontFamily = fontsRegistered ? 'Arial' : 'Helvetica';
    
    // Настраиваем заголовки ответа
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    
    // Подключаем поток к ответу
    doc.pipe(res);
    
    // Заголовок отчета
    doc.font(fontFamily)
       .fontSize(20)
       .text('Отчет по инвентаризации склада', 50, 50);
    
    doc.fontSize(12)
       .text(`Дата создания: ${new Date().toLocaleDateString('ru-RU')}`, 50, 80);
    
    // Добавляем данные
    let yPosition = 120;
    const pageHeight = 750;
    
    result.data.forEach((item: any, index: number) => {
      if (yPosition > pageHeight) {
        doc.addPage();
        yPosition = 50;
      }
      
      if (item.stats) {
        // Добавляем статистику
        doc.fontSize(14)
           .text('Статистика:', 50, yPosition);
        yPosition += 30;
        
        doc.fontSize(10)
           .text(`Всего сканирований: ${item.stats.total_scans}`, 70, yPosition);
        yPosition += 20;
        doc.text(`Уникальных товаров: ${item.stats.unique_products}`, 70, yPosition);
        yPosition += 20;
        doc.text(`Расхождений: ${item.stats.discrepancies}`, 70, yPosition);
        yPosition += 20;
        doc.text(`Среднее время зоны: ${item.stats.avg_zone_time} мин`, 70, yPosition);
        yPosition += 30;
      } else {
        // Добавляем данные сканирования
        doc.fontSize(10)
           .text(`${index + 1}. ${item.productName || 'N/A'}`, 50, yPosition);
        yPosition += 15;
        doc.text(`   Робот: ${item.robotId || 'N/A'}`, 70, yPosition);
        yPosition += 15;
        doc.text(`   Количество: ${item.quantity || 'N/A'}`, 70, yPosition);
        yPosition += 15;
        doc.text(`   Статус: ${getStatusText(item.status || 'N/A')}`, 70, yPosition);
        yPosition += 15;
        doc.text(`   Зона: ${item.zone || 'N/A'}, Ряд: ${item.rowNumber || 'N/A'}, Полка: ${item.shelfNumber || 'N/A'}`, 70, yPosition);
        yPosition += 20;
      }
    });
    
    // Завершаем документ
    doc.end();

  } catch (error: any) {
    console.error('❌ PDF export error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;