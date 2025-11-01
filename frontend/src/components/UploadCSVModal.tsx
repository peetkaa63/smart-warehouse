import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  LinearProgress,
  Alert,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Fade,
  Zoom,
  Slide,
  Collapse
} from '@mui/material';
import {
  Close,
  CloudUpload,
  Description,
  Download,
  CheckCircle,
  Error,
  Language,
  FormatListBulleted
} from '@mui/icons-material';
import { uploadAPI } from '../services/api';

interface UploadResult {
  success: boolean;
  summary: {
    totalProcessed: number;
    imported: number;
    errors: number;
  };
  errors: Array<{
    row: number | string;
    error: string;
    data: any;
  }>;
}

interface UploadCSVModalProps {
  open: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

const UploadCSVModal: React.FC<UploadCSVModalProps> = ({
  open,
  onClose,
  onUploadSuccess
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [currentStep, setCurrentStep] = useState<'select' | 'preview' | 'result'>('select');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Сброс формы при открытии/закрытии модального окна
  React.useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      alert('Пожалуйста, выберите CSV файл');
      return;
    }

    setSelectedFile(file);
    setUploadResult(null);
    setCurrentStep('preview');
    
    // Простой предпросмотр первых 5 строк
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').slice(0, 6);
      const preview = lines.map(line => line.split(';'));
      setPreviewData(preview);
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const response = await uploadAPI.uploadCSV(selectedFile);
      setUploadResult(response.data);
      setCurrentStep('result');
      
      if (response.data.success) {
        console.log('✅ Upload successful');
      }
    } catch (error: any) {
      setUploadResult({
        success: false,
        summary: { totalProcessed: 0, imported: 0, errors: 1 },
        errors: [{ row: 'File', error: error.message, data: {} }]
      });
      setCurrentStep('result');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await uploadAPI.downloadTemplate();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'warehouse_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading template:', error);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewData([]);
    setUploadResult(null);
    setCurrentStep('select');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    // Если была успешная загрузка, вызываем callback
    if (uploadResult?.success) {
      onUploadSuccess();
    }
    resetForm();
    onClose();
  };

  const handleNewUpload = () => {
    resetForm();
  };

  const handleBackToSelect = () => {
    setCurrentStep('select');
    setSelectedFile(null);
    setPreviewData([]);
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      TransitionComponent={Fade}
      transitionDuration={400}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <CloudUpload color="primary" />
            <Typography variant="h6">
              Загрузка данных инвентаризации
            </Typography>
          </Box>
          <IconButton onClick={handleClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Индикатор шагов */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {['select', 'preview', 'result'].map((step, index) => (
              <React.Fragment key={step}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 
                      currentStep === step ? 'primary.main' :
                      ['select', 'preview', 'result'].indexOf(currentStep) > index ? 'success.main' :
                      'grey.300',
                    color: 
                      currentStep === step ? 'white' :
                      ['select', 'preview', 'result'].indexOf(currentStep) > index ? 'white' : // Белый текст на зеленом
                      'grey.700',
                    fontWeight: 'bold',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {currentStep === step ? (
                    <Zoom in={true}>
                      <span>{index + 1}</span>
                    </Zoom>
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </Box>
                {index < 2 && (
                  <Box
                    sx={{
                      width: 40,
                      height: 2,
                      backgroundColor: 
                        ['select', 'preview', 'result'].indexOf(currentStep) > index ? 'success.main' : 'grey.300',
                      transition: 'all 0.3s ease'
                    }}
                  />
                )}
              </React.Fragment>
            ))}
          </Box>
        </Box>

        {/* Шаг 1: Выбор файла */}
        <Collapse in={currentStep === 'select'} timeout={500}>
          <Box>
            <Typography variant="body2" color="textSecondary" paragraph>
              Загрузите CSV файл с данными инвентаризации
            </Typography>

            {/* Информация о поддерживаемых форматах */}
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 2, 
                mb: 2, 
                backgroundColor: 'primary.main',
                borderColor: 'primary.main'
              }}
            >
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Language sx={{ color: 'white' }} />
                <Typography variant="subtitle2" sx={{ color: 'white' }}>
                  Поддерживаемые форматы:
                </Typography>
              </Box>
              <Box 
                component="ul" 
                sx={{ 
                  pl: 2, 
                  color: 'white', 
                  fontSize: '0.875rem', 
                  mb: 0,
                  '& li': { mb: 0.5 }
                }}
              >
                <li>
                  <strong>Английский формат:</strong> product_id, product_name, quantity, zone, date
                </li>
                <li>
                  <strong>Русский формат:</strong> Артикул, Товар, Количество, Зона, Дата и время
                </li>
                <li>Разделитель: точка с запятой (;) или запятая</li>
                <li>Кодировка: UTF-8</li>
                <li>Опциональные поля: row, shelf (Ряд, Полка)</li>
              </Box>
            </Paper>

            <Paper
              variant="outlined"
              sx={{
                p: 3,
                textAlign: 'center',
                border: dragActive ? '2px dashed #1976d2' : '2px dashed #e0e0e0',
                backgroundColor: dragActive ? 'action.hover' : 'background.default',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                transform: dragActive ? 'scale(1.02)' : 'scale(1)'
              }}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Zoom in={!dragActive} timeout={300}>
                <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              </Zoom>
              
              <Fade in={true} timeout={500}>
                <Typography variant="h6" gutterBottom>
                  {dragActive ? 'Отпустите файл для загрузки' : 'Перетащите CSV файл сюда'}
                </Typography>
              </Fade>
              
              <Typography variant="body2" color="textSecondary" paragraph>
                или нажмите для выбора файла
              </Typography>
              
              <Button variant="outlined" size="large">
                Выбрать файл
              </Button>
            </Paper>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".csv,text/csv"
              style={{ display: 'none' }}
            />

            <Box textAlign="center" mt={2}>
              <Button
                startIcon={<Download />}
                onClick={handleDownloadTemplate}
                variant="text"
                size="small"
              >
                Скачать шаблон CSV
              </Button>
            </Box>
          </Box>
        </Collapse>

        {/* Шаг 2: Предпросмотр */}
        <Collapse in={currentStep === 'preview'} timeout={500}>
          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Description color="primary" />
              <Typography variant="subtitle1">
                {selectedFile?.name}
              </Typography>
              <Chip 
                label={`${((selectedFile?.size || 0) / 1024).toFixed(1)} KB`} 
                size="small" 
                variant="outlined" 
              />
            </Box>

            {previewData.length > 0 && (
              <Slide direction="up" in={true} timeout={500}>
                <Box mb={2}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Предпросмотр данных (первые 5 строк):
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {previewData[0]?.map((header: string, index: number) => (
                            <TableCell key={index} sx={{ fontWeight: 'bold', backgroundColor: 'grey.50' }}>
                              {header}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {previewData.slice(1).map((row: string[], rowIndex: number) => (
                          <TableRow key={rowIndex} hover>
                            {row.map((cell: string, cellIndex: number) => (
                              <TableCell key={cellIndex}>
                                {cell}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Slide>
            )}

            {uploading && (
              <Fade in={uploading} timeout={500}>
                <Box mb={2}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <CloudUpload color="primary" />
                    <Typography variant="body2" color="textSecondary">
                      Загрузка и обработка файла...
                    </Typography>
                  </Box>
                  <LinearProgress />
                </Box>
              </Fade>
            )}
          </Box>
        </Collapse>

        {/* Шаг 3: Результат */}
        <Collapse in={currentStep === 'result'} timeout={500}>
          <Box>
            {uploadResult && (
              <Zoom in={true} timeout={600}>
                <Alert 
                  severity={uploadResult.success ? "success" : "error"}
                  sx={{ mb: 2 }}
                  icon={uploadResult.success ? <CheckCircle /> : <Error />}
                >
                  <Typography variant="subtitle1" gutterBottom>
                    {uploadResult.success ? '✅ Загрузка завершена успешно!' : '❌ Ошибка при загрузке'}
                  </Typography>
                  <Box component="ul" sx={{ mb: 0, pl: 2 }}>
                    <li>Обработано записей: <strong>{uploadResult.summary?.totalProcessed ?? 0}</strong></li>
                    <li>Импортировано записей: <strong>{uploadResult.summary?.imported ?? 0}</strong></li>
                    <li>Обнаружено ошибок: <strong>{uploadResult.summary?.errors ?? 0}</strong></li>
                  </Box>
                </Alert>
              </Zoom>
            )}

            {uploadResult && uploadResult.errors.length > 0 && (
              <Slide direction="up" in={true} timeout={700}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Детали ошибок:
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Строка</strong></TableCell>
                          <TableCell><strong>Ошибка</strong></TableCell>
                          <TableCell><strong>Данные</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {uploadResult.errors.slice(0, 10).map((error, index) => (
                          <TableRow key={index} hover>
                            <TableCell>{error.row}</TableCell>
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Error color="error" fontSize="small" />
                                {error.error}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                                {JSON.stringify(error.data)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {uploadResult.errors.length > 10 && (
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                      ... и еще {uploadResult.errors.length - 10} ошибок
                    </Typography>
                  )}
                </Box>
              </Slide>
            )}
          </Box>
        </Collapse>
      </DialogContent>

      <DialogActions>
        {currentStep === 'select' && (
          <Button onClick={handleClose}>
            Отмена
          </Button>
        )}

        {currentStep === 'preview' && (
          <>
            <Button onClick={handleBackToSelect} disabled={uploading}>
              Назад
            </Button>
            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              startIcon={uploading ? null : <CloudUpload />}
            >
              {uploading ? 'Загрузка...' : 'Загрузить'}
            </Button>
          </>
        )}

        {currentStep === 'result' && uploadResult && (
          <>
            <Button onClick={handleNewUpload} startIcon={<CloudUpload />}>
              Новый файл
            </Button>
            <Button 
              variant="contained" 
              onClick={handleClose}
              startIcon={<CheckCircle />}
            >
              Готово
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default UploadCSVModal;