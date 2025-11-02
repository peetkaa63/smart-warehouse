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

/**
 * @swagger
 * /api/export/excel:
 *   get:
 *     summary: Экспортировать данные в Excel (CSV формат)
 *     description: Экспортирует данные инвентаря в CSV формат с разделителем ';'. Доступно для всех авторизованных пользователей.
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Начальная дата для экспорта
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Конечная дата для экспорта
 *       - in: query
 *         name: zone
 *         schema:
 *           type: string
 *         description: Фильтр по зоне
 *       - in: query
 *         name: product_id
 *         schema:
 *           type: string
 *         description: Фильтр по ID товара
 *     responses:
 *       200:
 *         description: CSV файл успешно создан
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *             example: |
 *               product_id;product_name;quantity;zone;date;row;shelf
 *               TEL-4567;Роутер RT-AC68U;25;A;2024-01-15;5;3
 *         headers:
 *           Content-Disposition:
 *             schema:
 *               type: string
 *               example: "attachment; filename=inventory_export_2024-01-15.csv"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// GET /api/export/excel - экспорт в Excel
router.get('/excel', authenticateToken, async (req, res) => {
  // Делаем асинхронную обработку, чтобы не блокировать сервер
  (async () => {
    try {
      const filters = req.query;
      
      // Получаем данные асинхронно
      const result = await exportService.exportToExcel(filters);
      
      // Готовим данные и заголовки под требуемый CSV формат c ';' разделителем
      // Формат: product_id;product_name;quantity;zone;date;row;shelf
      const mapped = (result.data || [])
        .filter((row: any) => !row.stats)
        .map((row: any) => ({
          product_id: row.productId || row.product_id || '',
          product_name: row.productName || row.product_name || '',
          quantity: row.quantity ?? '',
          zone: row.zone || '',
          date: row.scannedAt ? new Date(row.scannedAt).toISOString().split('T')[0] : '',
          row: row.rowNumber ?? row.row_number ?? '',
          shelf: row.shelfNumber ?? row.shelf_number ?? ''
        }));

      const parser = new Parser({
        fields: ['product_id', 'product_name', 'quantity', 'zone', 'date', 'row', 'shelf'],
        delimiter: ';'
      });
      const csv = parser.parse(mapped);
      
      const filename = result.filename?.replace(/\.xlsx?$/i, '.csv') || `inventory_export_${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);

    } catch (error: any) {
      console.error('❌ Excel export error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  })();
});

/**
 * @swagger
 * /api/export/pdf:
 *   get:
 *     summary: Экспортировать данные в PDF
 *     description: Экспортирует данные инвентаря в PDF формат с форматированием. Доступно для всех авторизованных пользователей.
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Начальная дата для экспорта
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Конечная дата для экспорта
 *       - in: query
 *         name: zone
 *         schema:
 *           type: string
 *         description: Фильтр по зоне
 *       - in: query
 *         name: product_id
 *         schema:
 *           type: string
 *         description: Фильтр по ID товара
 *     responses:
 *       200:
 *         description: PDF файл успешно создан
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *         headers:
 *           Content-Disposition:
 *             schema:
 *               type: string
 *               example: "attachment; filename=inventory_report_2024-01-15.pdf"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// GET /api/export/pdf - экспорт в PDF (асинхронный)
router.get('/pdf', authenticateToken, async (req, res) => {
  // Делаем асинхронную обработку, чтобы не блокировать сервер
  (async () => {
    try {
      const filters = req.query;
      
      // Получаем данные асинхронно
      const result = await exportService.exportToPDF(filters);
      
      // Создаем PDF документ
      const doc = new PDFDocument({
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        size: 'A4'
      });
      
      // Регистрируем шрифты
      const fontsRegistered = registerFonts(doc);
      const fontFamily = fontsRegistered ? 'Arial' : 'Helvetica';
      
      // Настраиваем заголовки ответа
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      
      // Подключаем поток к ответу
      doc.pipe(res);
      
      // Добавляем логотип (если есть)
      try {
        // Проверяем разные возможные пути к логотипу
        const possiblePaths = [
          path.join(__dirname, '../../../frontend/public/logo.png'),
          path.join(__dirname, '../../public/logo.png'),
          path.join(process.cwd(), 'public/logo.png'),
          path.join(process.cwd(), 'frontend/public/logo.png')
        ];
        
        let logoPath: string | null = null;
        for (const p of possiblePaths) {
          if (fs.existsSync(p)) {
            logoPath = p;
            break;
          }
        }
        
        if (logoPath) {
          doc.image(logoPath, 50, 30, { width: 60, height: 30 });
          console.log('✅ Logo added to PDF:', logoPath);
        } else {
          console.log('⚠️ Logo not found in any of the expected paths');
        }
      } catch (logoError) {
        console.log('⚠️ Error adding logo to PDF:', logoError);
      }
      
      // Заголовок отчета
      doc.font(fontFamily)
         .fontSize(20)
         .text('Отчет по инвентаризации склада', 120, 35);
      
      doc.fontSize(10)
         .text(`Дата создания: ${new Date().toLocaleDateString('ru-RU')}`, 120, 70);
      
      // Разделяем данные и статистику
      const dataRows = result.data.filter((item: any) => !item.stats);
      const stats = result.data.find((item: any) => item.stats)?.stats;
      
      // Добавляем данные сканирования в таблицу
      let yPosition = 110;
      const pageHeight = 750;
      const rowHeight = 25;
      const itemsPerPage = Math.floor((pageHeight - yPosition) / rowHeight);
      
      // Заголовки таблицы
      if (dataRows.length > 0) {
        doc.fontSize(12)
           .font(fontFamily + '-Bold')
           .text('№', 50, yPosition)
           .text('Товар', 80, yPosition)
           .text('Робот', 250, yPosition)
           .text('Кол-во', 320, yPosition)
           .text('Зона', 370, yPosition)
           .text('Статус', 400, yPosition);
        
        yPosition += 25;
        doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
        yPosition += 10;
      }
      
      dataRows.forEach((item: any, index: number) => {
        // Проверяем, нужна ли новая страница
        if (yPosition > pageHeight - rowHeight) {
          doc.addPage();
          yPosition = 50;
          // Повторяем заголовки на новой странице
          doc.fontSize(12)
             .font(fontFamily + '-Bold')
             .text('№', 50, yPosition)
             .text('Товар', 80, yPosition)
             .text('Робот', 250, yPosition)
             .text('Кол-во', 320, yPosition)
             .text('Зона', 370, yPosition)
             .text('Статус', 400, yPosition);
          yPosition += 25;
          doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
          yPosition += 10;
        }
        
        doc.fontSize(10)
           .font(fontFamily)
           .text(`${index + 1}`, 50, yPosition)
           .text(item.productName || item.productId || 'N/A', 80, yPosition, { width: 160, ellipsis: true })
           .text(item.robotId || 'N/A', 250, yPosition, { width: 60, ellipsis: true })
           .text(String(item.quantity || 'N/A'), 320, yPosition, { width: 40 })
           .text(item.zone || 'N/A', 370, yPosition, { width: 25 })
           .text(getStatusText(item.status || 'N/A'), 400, yPosition, { width: 100 });
        
        yPosition += rowHeight;
      });
      
      // Добавляем статистику на новой странице
      if (stats) {
        if (yPosition > pageHeight - 150) {
          doc.addPage();
          yPosition = 50;
        } else {
          yPosition += 30;
        }
        
        doc.fontSize(14)
           .font(fontFamily + '-Bold')
           .text('Статистика:', 50, yPosition);
        yPosition += 25;
        
        doc.fontSize(11)
           .font(fontFamily)
           .text(`Всего сканирований: ${stats.total_scans || 0}`, 70, yPosition);
        yPosition += 20;
        doc.text(`Уникальных товаров: ${stats.unique_products || 0}`, 70, yPosition);
        yPosition += 20;
        doc.text(`Расхождений: ${stats.discrepancies || 0}`, 70, yPosition);
        yPosition += 20;
        doc.text(`Среднее время зоны: ${stats.avg_zone_time || 0} мин`, 70, yPosition);
      }
      
      // Завершаем документ
      doc.end();

    } catch (error: any) {
      console.error('❌ PDF export error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  })();
});

export default router;