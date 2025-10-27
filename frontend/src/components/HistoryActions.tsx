import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
} from '@mui/material';
import { Download, Analytics } from '@mui/icons-material';

interface HistoryActionsProps {
  onExportExcel: () => void;
  onExportPDF: () => void;
  onOpenAnalytics: () => void;
}

export const HistoryActions: React.FC<HistoryActionsProps> = ({
  onExportExcel,
  onExportPDF,
  onOpenAnalytics,
}) => {
  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Действия с данными
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button 
          variant="contained" 
          startIcon={<Download />}
          onClick={onExportExcel}
        >
          Экспорт в Excel
        </Button>
        <Button 
          variant="contained" 
          startIcon={<Download />}
          onClick={onExportPDF}
        >
          Экспорт в PDF
        </Button>
        <Button 
          variant="outlined" 
          startIcon={<Analytics />} 
          onClick={onOpenAnalytics}
        >
          Расширенная аналитика
        </Button>
      </Box>
    </Paper>
  );
};