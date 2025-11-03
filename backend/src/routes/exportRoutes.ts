import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { exportService } from '../services/AllServices';
import { Parser } from '@json2csv/plainjs';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { exportJobService } from '../services/ExportJobService';
import { robotService } from '../sockets/websocket';

const router = express.Router();

// Кэш для шрифтов и логотипа
let fontBuffer: Buffer | null = null;
let boldFontBuffer: Buffer | null = null;
let logoBuffer: Buffer | null = null;

// Предзагрузка ресурсов
const preloadResources = async (): Promise<void> => {
  try {
    const fontsDir = path.join(__dirname, '../fonts');
    
    // Загружаем шрифты
    const arialPath = path.join(fontsDir, 'arialmt.ttf');
    const arialBoldPath = path.join(fontsDir, 'arialbd.ttf');
    
    if (fs.existsSync(arialPath)) {
      fontBuffer = fs.readFileSync(arialPath);
      console.log('✅ Arial font preloaded');
    }
    
    if (fs.existsSync(arialBoldPath)) {
      boldFontBuffer = fs.readFileSync(arialBoldPath);
      console.log('✅ Arial-Bold font preloaded');
    } else if (fontBuffer) {
      boldFontBuffer = fontBuffer; // Используем обычный шрифт если жирного нет
    }
    
    // Загружаем логотип
    const logoPaths = [
      path.join(__dirname, '../fonts/logo.png'),
      path.join(__dirname, '../images/logo.png'),
      path.join(process.cwd(), 'images/logo.png')
    ];
    
    for (const logoPath of logoPaths) {
      if (fs.existsSync(logoPath)) {
        logoBuffer = fs.readFileSync(logoPath);
        console.log('✅ Logo preloaded from:', logoPath);
        break;
      }
    }
    
  } catch (error) {
    console.error('❌ Error preloading resources:', error);
  }
};

// Предзагружаем ресурсы при старте
preloadResources();

// Вспомогательная функция для перевода статусов на русский
function getStatusText(status: string): string {
  const statusMap: { [key: string]: string } = {
    'OK': 'НОРМА',
    'LOW_STOCK': 'НИЗКИЙ',
    'CRITICAL': 'КРИТИЧЕСКИЙ'
  };
  return statusMap[status] || status;
}

// Оптимизированная функция создания PDF
const generatePDF = async (filters: any, res: express.Response): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Получаем данные асинхронно
      const result = await exportService.exportToPDF(filters);
      const dataRows = result.data.filter((item: any) => !item.stats);
      const stats = result.data.find((item: any) => item.stats)?.stats;

      // Создаем PDF документ с оптимизациями
      const doc = new PDFDocument({
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        size: 'A4',
        bufferPages: true // Буферизация страниц для производительности
      });

      // Настраиваем заголовки ответа
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

      let isFinished = false;

      // Обработчики ошибок
      doc.on('error', (error) => {
        if (!isFinished) {
          isFinished = true;
          reject(error);
        }
      });

      res.on('error', (error) => {
        if (!isFinished) {
          isFinished = true;
          reject(error);
        }
      });

      doc.on('end', () => {
        if (!isFinished) {
          isFinished = true;
          resolve();
        }
      });

      // Подключаем поток к ответу
      doc.pipe(res);

      // Регистрируем шрифты из буфера
      if (fontBuffer) {
        doc.registerFont('Arial', fontBuffer);
      }
      if (boldFontBuffer) {
        doc.registerFont('Arial-Bold', boldFontBuffer);
      }

      const fontFamily = fontBuffer ? 'Arial' : 'Helvetica';
      const boldFontFamily = boldFontBuffer ? 'Arial-Bold' : 'Helvetica-Bold';

      // Добавляем логотип из буфера
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, 50, 30, { width: 86, height: 30 });
        } catch (logoError) {
          console.log('⚠️ Error adding logo to PDF:', logoError);
        }
      }

      // Заголовок отчета
      doc.font(fontFamily)
         .fontSize(20)
         .text('Отчет по инвентаризации склада', 150, 35);

      doc.fontSize(10)
         .text(`Дата создания: ${new Date().toLocaleDateString('ru-RU')}`, 150, 70);

      // Добавляем данные сканирования в таблицу
      let yPosition = 110;
      const pageHeight = 750;
      const rowHeight = 25;
      const itemsPerPage = 20; // Ограничиваем количество элементов для производительности

      // Заголовки таблицы
      if (dataRows.length > 0) {
        doc.fontSize(12)
           .font(boldFontFamily)
           .text('№', 50, yPosition)
           .text('Товар', 80, yPosition, { width: 160 })
           .text('Робот', 250, yPosition, { width: 60 })
           .text('Кол-во', 320, yPosition, { width: 60 })
           .text('Зона', 370, yPosition, { width: 30 })
           .text('Статус', 410, yPosition, { width: 100 });

        yPosition += 25;
        doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
        yPosition += 10;
      }

      // Обрабатываем данные порциями для избежания блокировки
      const processInBatches = async () => {
        const batchSize = 50; // Обрабатываем по 50 элементов за раз
        
        for (let i = 0; i < dataRows.length; i += batchSize) {
          const batch = dataRows.slice(i, i + batchSize);
          
          // Даем event loop возможность обработать другие запросы
          if (i > 0) {
            await new Promise(resolve => setImmediate(resolve));
          }

          for (let j = 0; j < batch.length; j++) {
            const item = batch[j];
            const index = i + j;

            // Проверяем, нужна ли новая страница
            if (yPosition > pageHeight - rowHeight) {
              doc.addPage();
              yPosition = 50;
              
              // Повторяем заголовки на новой странице
              doc.fontSize(12)
                 .font(boldFontFamily)
                 .text('№', 50, yPosition)
                 .text('Товар', 80, yPosition, { width: 160 })
                 .text('Робот', 250, yPosition, { width: 60 })
                 .text('Кол-во', 320, yPosition, { width: 60 })
                 .text('Зона', 370, yPosition, { width: 30 })
                 .text('Статус', 410, yPosition, { width: 100 });
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
               .text(getStatusText(item.status || 'N/A'), 410, yPosition, { width: 100 });

            yPosition += rowHeight;
          }
        }

        // Добавляем статистику
        if (stats) {
          if (yPosition > pageHeight - 150) {
            doc.addPage();
            yPosition = 50;
          } else {
            yPosition += 30;
          }

          doc.fontSize(14)
             .font(boldFontFamily)
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
      };

      await processInBatches();

    } catch (error) {
      reject(error);
    }
  });
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
  try {
    const filters = req.query;
    
    const result = await exportService.exportToExcel(filters);
    
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
// GET /api/export/pdf - экспорт в PDF (асинхронный и оптимизированный)
router.get('/pdf', authenticateToken, async (req, res) => {
  try {
    // Отправляем immediate response что запрос принят
    res.setTimeout(300000); // 5 минут таймаут
    
    // Генерируем PDF асинхронно
    await generatePDF(req.query, res);
    
  } catch (error: any) {
    console.error('❌ PDF export error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

export default router;

// Async export jobs API
export const exportJobsRouter = express.Router();

// Start export job (unlimited supported)
exportJobsRouter.post('/start', authenticateToken, async (req, res) => {
  try {
    const { type, filters, unlimited } = req.body || {};
    if (type !== 'excel' && type !== 'pdf') {
      return res.status(400).json({ error: 'Invalid export type' });
    }
    const job = await exportJobService.startJob(type, filters || {}, Boolean(unlimited));
    // Optional: notify via socket
    try { robotService.io.emit('export_progress', { jobId: job.id, status: job.status, progress: job.progress }); } catch {}
    res.json({ jobId: job.id });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to start export job' });
  }
});

// Get job status
exportJobsRouter.get('/status/:jobId', authenticateToken, async (req, res) => {
  const job = exportJobService.getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({
    id: job.id,
    type: job.type,
    status: job.status,
    progress: job.progress,
    processed: job.processed,
    total: job.total,
    etaSeconds: job.etaSeconds,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    filename: job.filename
  });
});

// Download result
exportJobsRouter.get('/download/:jobId', authenticateToken, async (req, res) => {
  const job = exportJobService.getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (job.status !== 'completed' || !job.filePath || !job.filename) {
    return res.status(400).json({ error: 'Job not completed' });
  }
  res.setHeader('Content-Disposition', `attachment; filename="${job.filename}"`);
  if (job.type === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
  } else {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  }
  fs.createReadStream(job.filePath).pipe(res);
});