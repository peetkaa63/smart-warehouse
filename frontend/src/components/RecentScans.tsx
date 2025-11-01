import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Box
} from '@mui/material';
import { Pause, PlayArrow } from '@mui/icons-material';

interface Scan {
  time: string;
  robot_id: string;
  zone: string;
  product_name: string;
  product_id: string;
  quantity: number;
  status: 'OK' | 'LOW_STOCK' | 'CRITICAL';
}

interface RecentScansProps {
  scans: Scan[];
}

const RecentScans: React.FC<RecentScansProps> = ({ scans = [] }) => {
  const [autoScroll, setAutoScroll] = useState(true);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OK': return 'success';
      case 'LOW_STOCK': return 'warning';
      case 'CRITICAL': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'OK': return 'OK';
      case 'LOW_STOCK': return 'Низкий';
      case 'CRITICAL': return 'Критично';
      default: return status;
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '-';
    try {
      const date = new Date(timeString);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', timeString);
        return '-';
      }
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (error) {
      console.error('Error formatting time:', timeString, error);
      return '-';
    }
  };

  console.log('📦 RecentScans received:', scans);

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Последние сканирования</Typography>
        <IconButton 
          onClick={() => setAutoScroll(!autoScroll)}
          color={autoScroll ? "primary" : "default"}
        >
          {autoScroll ? <Pause /> : <PlayArrow />}
        </IconButton>
      </Box>
      
      <TableContainer sx={{ maxHeight: 300 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>Время</TableCell>
              <TableCell>Робот</TableCell>
              <TableCell>Зона</TableCell>
              <TableCell>Товар</TableCell>
              <TableCell align="right">Кол-во</TableCell>
              <TableCell>Статус</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scans.filter(scan => scan && scan.time && scan.robot_id).map((scan, index) => (
              <TableRow key={`${scan.robot_id}-${scan.time}-${index}`} hover>
                <TableCell>
                  {scan.time ? formatTime(scan.time) : '-'}
                </TableCell>
                <TableCell>{scan.robot_id || '-'}</TableCell>
                <TableCell>{scan.zone || '-'}</TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {scan.product_name || scan.product_id || 'N/A'}
                    </Typography>
                    {scan.product_id && (
                      <Typography variant="caption" color="textSecondary">
                        {scan.product_id}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell align="right">{scan.quantity !== undefined && scan.quantity !== null ? scan.quantity : 0}</TableCell>
                <TableCell>
                  <Chip 
                    label={getStatusText(scan.status)} 
                    color={getStatusColor(scan.status) as any}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
            {scans.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="textSecondary" sx={{ py: 2 }}>
                    Нет данных о сканированиях
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default RecentScans;