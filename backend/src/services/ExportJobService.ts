import fs from 'fs';
import path from 'path';
import { exportRepository } from '../repositories/UploadExportRepository';
import PDFDocument from 'pdfkit';

type ExportType = 'excel' | 'pdf';

export interface ExportJobStatus {
  id: string;
  type: ExportType;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number; // 0..100
  processed: number;
  total: number;
  etaSeconds?: number;
  startedAt?: number;
  finishedAt?: number;
  filename?: string;
  filePath?: string;
  error?: string;
}

class ExportJobService {
  private jobs: Map<string, ExportJobStatus> = new Map();

  getJob(jobId: string): ExportJobStatus | undefined {
    return this.jobs.get(jobId);
  }

  async startJob(type: ExportType, filters: any, unlimited: boolean): Promise<ExportJobStatus> {
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const job: ExportJobStatus = {
      id,
      type,
      status: 'queued',
      progress: 0,
      processed: 0,
      total: 0,
      startedAt: Date.now()
    };
    this.jobs.set(id, job);

    // Fire and forget
    setImmediate(() => this.runJob(job, filters, unlimited).catch(() => {}));

    return job;
  }

  private async runJob(job: ExportJobStatus, filters: any, unlimited: boolean): Promise<void> {
    job.status = 'running';

    try {
      // Determine total for ETA
      const stats = await exportRepository.getExportStats(filters);
      const total = Number(stats.total_records_count || 0);
      job.total = total;

      const exportDir = path.join(process.cwd(), 'tmp', 'exports');
      fs.mkdirSync(exportDir, { recursive: true });

      if (job.type === 'excel') {
        const filename = `inventory_export_${new Date().toISOString().split('T')[0]}${unlimited ? '_full' : ''}.csv`;
        const filePath = path.join(exportDir, filename);
        job.filename = filename;
        job.filePath = filePath;

        // Stream CSV
        const stream = fs.createWriteStream(filePath);
        // Header
        stream.write('product_id;product_name;quantity;zone;date;row;shelf\n', 'utf8');

        const batchSize = 1000;
        let offset = 0;
        const startedAt = Date.now();
        while (true) {
          const rows = await exportRepository.getExportDataBatch(filters, batchSize, offset, unlimited);
          if (!rows || rows.length === 0) break;

          for (const row of rows) {
            const line = [
              row.productId || row.product_id || '',
              (row.productName || row.product_name || '').toString().replace(/;/g, ','),
              String(row.quantity ?? ''),
              row.zone || '',
              row.scannedAt ? new Date(row.scannedAt).toISOString().split('T')[0] : '',
              String(row.rowNumber ?? row.row_number ?? ''),
              String(row.shelfNumber ?? row.shelf_number ?? '')
            ].join(';') + '\n';
            if (!stream.write(line, 'utf8')) {
              await new Promise<void>(resolve => stream.once('drain', () => resolve()));
            }
            job.processed += 1;
            // progress and ETA
            if (job.total > 0) {
              job.progress = Math.min(100, Math.round((job.processed / job.total) * 100));
              const elapsed = (Date.now() - startedAt) / 1000;
              const rate = job.processed / Math.max(1, elapsed);
              job.etaSeconds = rate > 0 ? Math.max(0, Math.round((job.total - job.processed) / rate)) : undefined;
            }
          }

          offset += rows.length;

          // Yield to event loop
          await new Promise(resolve => setImmediate(resolve));
        }

        await new Promise<void>(resolve => stream.end(() => resolve()));
      } else {
        // PDF generation to file
        const filename = `inventory_report_${new Date().toISOString().split('T')[0]}${unlimited ? '_full' : ''}.pdf`;
        const filePath = path.join(path.join(process.cwd(), 'tmp', 'exports'), filename);
        job.filename = filename;
        job.filePath = filePath;

        const rows = await exportRepository.getExportDataForPDF(filters, unlimited);
        const statsFull = await exportRepository.getExportStats(filters);

        const doc = new PDFDocument({ margins: { top: 50, bottom: 50, left: 50, right: 50 }, size: 'A4', bufferPages: true });
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        let y = 50;
        const pageHeight = 750;
        const rowHeight = 25;

        doc.fontSize(16).text('Отчет по инвентаризации склада', 50, y);
        y += 30;

        // Table header
        doc.fontSize(12)
          .text('№', 50, y)
          .text('Товар', 80, y, { width: 200 })
          .text('Робот', 290, y, { width: 60 })
          .text('Кол-во', 355, y, { width: 60 })
          .text('Зона', 420, y, { width: 30 })
          .text('Статус', 460, y, { width: 100 });
        y += 25;
        doc.moveTo(50, y).lineTo(550, y).stroke();
        y += 10;

        const batchSize = 200;
        const startedAt = Date.now();
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          await new Promise(resolve => setImmediate(resolve));
          for (let j = 0; j < batch.length; j++) {
            const item = batch[j];
            const index = i + j;
            if (y > pageHeight - rowHeight) {
              doc.addPage();
              y = 50;
            }
            doc.fontSize(10)
              .text(`${index + 1}`, 50, y)
              .text(item.productName || item.productId || 'N/A', 80, y, { width: 200, ellipsis: true })
              .text(item.robotId || 'N/A', 290, y, { width: 60, ellipsis: true })
              .text(String(item.quantity || 'N/A'), 355, y, { width: 40 })
              .text(item.zone || 'N/A', 420, y, { width: 25 })
              .text(item.status || 'N/A', 460, y, { width: 100 });
            y += rowHeight;
            job.processed += 1;
            if (job.total > 0) {
              job.progress = Math.min(100, Math.round((job.processed / job.total) * 100));
              const elapsed = (Date.now() - startedAt) / 1000;
              const rate = job.processed / Math.max(1, elapsed);
              job.etaSeconds = rate > 0 ? Math.max(0, Math.round((job.total - job.processed) / rate)) : undefined;
            }
          }
        }

        // Stats section
        if (y > pageHeight - 150) {
          doc.addPage();
          y = 50;
        } else {
          y += 30;
        }
        doc.fontSize(14).text('Статистика:', 50, y);
        y += 25;
        doc.fontSize(11)
          .text(`Всего сканирований: ${statsFull.total_scans || 0}`, 70, y);
        y += 20;
        doc.text(`Уникальных товаров: ${statsFull.unique_products || 0}`, 70, y);
        y += 20;
        doc.text(`Расхождений: ${statsFull.discrepancies || 0}`, 70, y);

        await new Promise<void>((resolve, reject) => {
          writeStream.on('finish', () => resolve());
          writeStream.on('error', (e) => reject(e));
          doc.end();
        });
      }

      job.status = 'completed';
      job.progress = 100;
      job.finishedAt = Date.now();
    } catch (e: any) {
      job.status = 'failed';
      job.error = e?.message || String(e);
      job.finishedAt = Date.now();
    }
  }
}

export const exportJobService = new ExportJobService();


