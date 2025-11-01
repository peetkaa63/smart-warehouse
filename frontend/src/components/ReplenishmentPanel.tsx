import React from 'react'
import { Paper, Box, Typography, List, ListItem, ListItemText, Button, Chip, CircularProgress, IconButton, useTheme } from '@mui/material'
import { Refresh, TrendingDown, TrendingUp, Warning } from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../services/api'

const ReplenishmentPanel: React.FC = () => {
  const theme = useTheme();
  const [data, setData] = React.useState<{ low: any[]; surplus: any[] }>({ low: [], surplus: [] })
  const [loading, setLoading] = React.useState(false)
  const [initialLoad, setInitialLoad] = React.useState(true)

  const load = async (manual: boolean = false) => {
    if (manual) {
      setLoading(true);
    }
    try {
      const resp = await api.get('/api/inventory/suggestions')
      const newData = resp.data?.data || { low: [], surplus: [] };
      setData(newData);
      if (initialLoad) {
        setTimeout(() => setInitialLoad(false), 100);
      }
    } catch (e) {
      console.error('Error loading replenishment suggestions:', e);
    } finally {
      if (manual) {
        setLoading(false);
      }
    }
  }

  React.useEffect(() => { load(false) }, [])

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Предложения по пополнению</Typography>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <IconButton size="small" disabled>
                <CircularProgress size={20} />
              </IconButton>
            </motion.div>
          ) : (
            <motion.div
              key="refresh"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <Button size="small" onClick={() => load(true)} startIcon={<Refresh />}>Обновить</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Дефицит */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Warning color="error" fontSize="small" />
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'error.main' }}>
              Дефицит (требуется пополнение)
            </Typography>
            <Chip 
              label={(data.low || []).length} 
              size="small" 
              color="error" 
              variant="outlined"
            />
          </Box>
          <AnimatePresence>
            <motion.div
              initial={initialLoad ? { opacity: 0, height: 0 } : false}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <List dense>
                {(data.low || []).map((i, idx) => (
                  <motion.div
                    key={`low-${idx}`}
                    initial={initialLoad ? { opacity: 0, x: -10 } : false}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <ListItem 
                      sx={{ 
                        mb: 0.5, 
                        borderRadius: 1,
                        backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(244, 67, 54, 0.1)' : '#ffebee',
                        border: '1px solid',
                        borderColor: 'error.light'
                      }}
                    >
                      <ListItemText 
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {i.product_name || i.productName || `Товар ${i.product_id || i.productId || 'N/A'}`}
                            </Typography>
                            <Chip label={`Зона ${i.zone}`} size="small" variant="outlined" />
                            {i.rowNumber || i.row_number ? (
                              <Chip 
                                label={`${i.zone}-${i.rowNumber || i.row_number}-${i.shelfNumber || i.shelf_number}`} 
                                size="small" 
                                variant="outlined"
                                color="secondary"
                              />
                            ) : null}
                          </Box>
                        } 
                        secondary={
                          <Box sx={{ mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              Текущее количество: <strong style={{ color: theme.palette.error.main }}>{i.qty || i.quantity || 0}</strong>
                            </Typography>
                            {i.status && (
                              <Chip 
                                label={i.status === 'CRITICAL' ? 'Критический' : i.status === 'LOW_STOCK' ? 'Низкий запас' : i.status === 'WARNING' ? 'Предупреждение' : i.status} 
                                size="small" 
                                color={i.status === 'CRITICAL' ? 'error' : i.status === 'LOW_STOCK' ? 'warning' : 'default'}
                                sx={{ ml: 1, mt: 0.5 }}
                              />
                            )}
                            {i.scannedAt || i.scanned_at ? (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                Последнее сканирование: {new Date(i.scannedAt || i.scanned_at).toLocaleString('ru-RU')}
                              </Typography>
                            ) : null}
                          </Box>
                        } 
                      />
                    </ListItem>
                  </motion.div>
                ))}
                {(!data.low || data.low.length === 0) && (
                  <ListItem>
                    <ListItemText 
                      primary={<Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>Нет дефицитов</Typography>} 
                    />
                  </ListItem>
                )}
              </List>
            </motion.div>
          </AnimatePresence>
        </Box>

        {/* Избыток */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <TrendingUp color="success" fontSize="small" />
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'success.main' }}>
              Избыток (излишки)
            </Typography>
            <Chip 
              label={(data.surplus || []).length} 
              size="small" 
              color="success" 
              variant="outlined"
            />
          </Box>
          <AnimatePresence>
            <motion.div
              initial={initialLoad ? { opacity: 0, height: 0 } : false}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <List dense>
                {(data.surplus || []).map((i, idx) => (
                  <motion.div
                    key={`surplus-${idx}`}
                    initial={initialLoad ? { opacity: 0, x: -10 } : false}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <ListItem 
                      sx={{ 
                        mb: 0.5, 
                        borderRadius: 1,
                        backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.1)' : '#e8f5e9',
                        border: '1px solid',
                        borderColor: 'success.light'
                      }}
                    >
                      <ListItemText 
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {i.product_name || i.productName || `Товар ${i.product_id || i.productId || 'N/A'}`}
                            </Typography>
                            <Chip label={`Зона ${i.zone}`} size="small" variant="outlined" />
                            {i.rowNumber || i.row_number ? (
                              <Chip 
                                label={`${i.zone}-${i.rowNumber || i.row_number}-${i.shelfNumber || i.shelf_number}`} 
                                size="small" 
                                variant="outlined"
                                color="secondary"
                              />
                            ) : null}
                          </Box>
                        } 
                        secondary={
                          <Box sx={{ mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              Текущее количество: <strong style={{ color: theme.palette.success.main }}>{i.qty || i.quantity || 0}</strong>
                            </Typography>
                            {i.avg_quantity && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                Среднее за 30 дней: {Math.round(i.avg_quantity)}
                              </Typography>
                            )}
                            {(i.qty || i.quantity || 0) > 100 && (
                              <Chip 
                                label="Высокий запас" 
                                size="small" 
                                color="success"
                                sx={{ ml: 1, mt: 0.5 }}
                              />
                            )}
                            {i.scannedAt || i.scanned_at ? (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                Последнее сканирование: {new Date(i.scannedAt || i.scanned_at).toLocaleString('ru-RU')}
                              </Typography>
                            ) : null}
                          </Box>
                        } 
                      />
                    </ListItem>
                  </motion.div>
                ))}
                {(!data.surplus || data.surplus.length === 0) && (
                  <ListItem>
                    <ListItemText 
                      primary={<Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>Нет избытков</Typography>} 
                    />
                  </ListItem>
                )}
              </List>
            </motion.div>
          </AnimatePresence>
        </Box>
      </Box>
    </Paper>
  )
}

export default ReplenishmentPanel
