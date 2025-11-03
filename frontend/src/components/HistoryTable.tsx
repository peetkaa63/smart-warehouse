import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  CircularProgress,
} from '@mui/material';
import { Info } from '@mui/icons-material';
import { useSpring, animated } from '@react-spring/web';

interface HistoryItem {
  id: number;
  scannedAt: string;
  robotId: string;
  zone: string;
  productId: string;
  productName: string;
  quantity: number;
  status: 'OK' | 'LOW_STOCK' | 'CRITICAL';
  rowNumber: number;
  shelfNumber: number;
}

interface HistoryTableProps {
  data: HistoryItem[];
  loading: boolean;
  page: number;
  rowsPerPage: number;
  totalCount: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  hasActiveFilters: boolean;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'OK': return 'success';
    case 'LOW_STOCK': return 'warning';
    case 'CRITICAL': return 'error';
    default: return 'default';
  }
};

export const HistoryTable: React.FC<HistoryTableProps> = ({
  data,
  loading,
  page,
  rowsPerPage,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
  hasActiveFilters,
}) => {
  const tableAnimation = useSpring({
    height: loading ? 0 : 'auto',
    opacity: loading ? 0 : 1,
    config: { tension: 200, friction: 20 }
  });

  const loadingAnimation = useSpring({
    height: loading ? 'auto' : 0,
    opacity: loading ? 1 : 0,
    config: { tension: 200, friction: 20 }
  });
  const AnimatedBox = animated(Box as any);

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Таблица исторических данных
      </Typography>
      
      <>
        <AnimatedBox style={{ ...loadingAnimation, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        </AnimatedBox>
        <AnimatedBox style={{ ...tableAnimation, overflow: 'hidden' }}>
          {data.length > 0 ? (
                <>
                  <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Дата и время</TableCell>
                  <TableCell>ID робота</TableCell>
                  <TableCell>Зона</TableCell>
                  <TableCell>Артикул</TableCell>
                  <TableCell>Товар</TableCell>
                  <TableCell>Количество</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell>Полка</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>
                      {new Date(row.scannedAt).toLocaleString('ru-RU')}
                    </TableCell>
                    <TableCell>{row.robotId}</TableCell>
                    <TableCell>{row.zone}</TableCell>
                    <TableCell>{row.productId}</TableCell>
                    <TableCell>{row.productName}</TableCell>
                    <TableCell>{row.quantity}</TableCell>
                    <TableCell>
                      <Chip 
                        label={row.status} 
                        color={getStatusColor(row.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {row.rowNumber}-{row.shelfNumber}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[20, 50, 100]}
            component="div"
            count={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={onPageChange}
            onRowsPerPageChange={onRowsPerPageChange}
            labelRowsPerPage="Строк на странице:"
            labelDisplayedRows={({ from, to, count }) => 
              `${from}-${to} из ${count}`
            }
          />
                </>
          ) : (
            <Box 
              sx={{ 
                textAlign: 'center', 
                py: 6,
                color: 'text.secondary'
              }}
            >
              <Info sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" gutterBottom>
                Нет данных
              </Typography>
              <Typography variant="body1">
                {hasActiveFilters
                  ? 'Попробуйте изменить параметры фильтрации'
                  : 'Исторические данные появятся после работы роботов'
                }
              </Typography>
            </Box>
          )}
        </AnimatedBox>
      </>
    </Paper>
  );
};