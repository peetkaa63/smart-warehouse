import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Alert,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Edit, Refresh, Check, Close } from '@mui/icons-material';
import api from '../../services/api';

interface ProductLimit {
  id: string;
  name: string;
  min_stock: number;
  optimal_stock: number;
  category?: string;
}

interface Thresholds {
  critical: number;
  low_stock: number;
  warning: number;
}

const ProductLimitsWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  
  return (
    <>
      <Button
        variant="outlined"
        fullWidth
        onClick={() => setOpen(true)}
        sx={{ py: 2 }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6">📊 Управление товарами</Typography>
          <Typography variant="caption" color="text.secondary">
            Лимиты и пороги
          </Typography>
        </Box>
      </Button>
      <ProductLimitsDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
};

const ProductLimitsDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [products, setProducts] = useState<ProductLimit[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [thresholds, setThresholds] = useState<Thresholds>({ critical: 10, low_stock: 30, warning: 50 });
  const [error, setError] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ min_stock: number; optimal_stock: number }>({ min_stock: 0, optimal_stock: 0 });

  const loadProducts = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/api/admin/products/limits');
      setProducts(resp.data?.products || []);
      if (resp.data?.thresholds) {
        setThresholds(resp.data.thresholds);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadProducts();
    }
  }, [open]);

  const handleEdit = (product: ProductLimit) => {
    setEditingId(product.id);
    setEditData({ min_stock: product.min_stock, optimal_stock: product.optimal_stock });
  };

  const handleSave = async (id: string) => {
    try {
      await api.put(`/api/admin/products/${id}/limits`, editData);
      await loadProducts();
      setEditingId(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка сохранения');
    }
  };

  const handleSaveThresholds = async () => {
    try {
      await api.put('/api/admin/products/thresholds', thresholds);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка сохранения порогов');
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        component: motion.div,
        initial: { opacity: 0, scale: 0.9, y: 20 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.9, y: 20 },
        transition: { duration: 0.3, ease: 'easeOut' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Управление товарными лимитами</Typography>
          <IconButton onClick={loadProducts} disabled={loading}>
            <motion.div
              animate={{ rotate: loading ? 360 : 0 }}
              transition={{ 
                duration: loading ? 1 : 0,
                repeat: loading ? Infinity : 0,
                ease: 'linear'
              }}
            >
              <Refresh />
            </motion.div>
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            </motion.div>
          )}
        </AnimatePresence>
        
        <Paper sx={{ p: 2, mb: 3 }}>
		  <Typography variant="subtitle1" gutterBottom>Пороги для статусов</Typography>
		  <Box sx={{ 
			display: 'flex', 
			flexDirection: { xs: 'column', sm: 'row' }, 
			gap: 2, 
			mb: 2,
			alignItems: { xs: 'stretch', sm: 'flex-start' }
		  }}>
			<FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
			  <InputLabel>Critical</InputLabel>
			  <Select
				value={thresholds.critical}
				onChange={(e) => setThresholds({ ...thresholds, critical: Number(e.target.value) })}
				label="Critical"
			  >
				{[5, 10, 15, 20, 25, 30].map(v => (
				  <MenuItem key={v} value={v}>{v}</MenuItem>
				))}
			  </Select>
			</FormControl>
			<FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
			  <InputLabel>Low Stock</InputLabel>
			  <Select
				value={thresholds.low_stock}
				onChange={(e) => setThresholds({ ...thresholds, low_stock: Number(e.target.value) })}
				label="Low Stock"
			  >
				{[20, 30, 40, 50, 60].map(v => (
				  <MenuItem key={v} value={v}>{v}</MenuItem>
				))}
			  </Select>
			</FormControl>
			<FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
			  <InputLabel>Warning</InputLabel>
			  <Select
				value={thresholds.warning}
				onChange={(e) => setThresholds({ ...thresholds, warning: Number(e.target.value) })}
				label="Warning"
			  >
				{[40, 50, 60, 70, 80].map(v => (
				  <MenuItem key={v} value={v}>{v}</MenuItem>
				))}
			  </Select>
			</FormControl>
			<Button 
			  variant="contained" 
			  startIcon={<Save />} 
			  onClick={handleSaveThresholds}
			  sx={{ width: { xs: '100%', sm: 'auto' } }}
			>
			  Сохранить пороги
			</Button>
		  </Box>
		</Paper>

        <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          </motion.div>
        ) : (
          <motion.div
            key="table-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            layout
          >
            <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Товар</TableCell>
                  <TableCell>Min Stock</TableCell>
                  <TableCell>Optimal Stock</TableCell>
                  <TableCell>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {products.map((product, index) => (
                    <TableRow 
                      key={product.id}
                      component={motion.tr}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                    >
                    <TableCell>{product.name}</TableCell>
                    <TableCell>
                      {editingId === product.id ? (
                        <TextField
                          type="number"
                          size="small"
                          value={editData.min_stock}
                          onChange={(e) => setEditData({ ...editData, min_stock: Number(e.target.value) })}
                          sx={{ width: 100 }}
                        />
                      ) : (
                        product.min_stock
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === product.id ? (
                        <TextField
                          type="number"
                          size="small"
                          value={editData.optimal_stock}
                          onChange={(e) => setEditData({ ...editData, optimal_stock: Number(e.target.value) })}
                          sx={{ width: 100 }}
                        />
                      ) : (
                        product.optimal_stock
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === product.id ? (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton size="small" color="primary" onClick={() => handleSave(product.id)}>
                            <Check />
                          </IconButton>
                          <IconButton size="small" onClick={() => setEditingId(null)}>
                            <Close />
                          </IconButton>
                        </Box>
                      ) : (
                        <IconButton size="small" onClick={() => handleEdit(product)}>
                          <Edit />
                        </IconButton>
                      )}
                    </TableCell>
                    </TableRow>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </TableContainer>
          </motion.div>
        )}
        </AnimatePresence>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductLimitsWidget;
