import React from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, List, ListItem, ListItemText } from '@mui/material'

interface ReplenishmentModalProps {
  open: boolean
  onClose: () => void
  suggestions: { low: any[]; surplus: any[] }
}

const ReplenishmentModal: React.FC<ReplenishmentModalProps> = ({ open, onClose, suggestions }) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Предложения по пополнению</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Зоны с дефицитом</Typography>
          <List dense>
            {(suggestions.low || []).map((i, idx) => (
              <ListItem key={`low-${idx}`}>
                <ListItemText primary={`Товар ${i.product_id} • зона ${i.zone}`} secondary={`Кол-во: ${i.qty}`} />
              </ListItem>
            ))}
            {(!suggestions.low || suggestions.low.length === 0) && (
              <ListItem><ListItemText primary="Нет дефицитов за сутки" /></ListItem>
            )}
          </List>
        </Box>
        <Box>
          <Typography variant="subtitle2">Зоны с избытком</Typography>
          <List dense>
            {(suggestions.surplus || []).map((i, idx) => (
              <ListItem key={`surplus-${idx}`}>
                <ListItemText primary={`Товар ${i.product_id} • зона ${i.zone}`} secondary={`Кол-во: ${i.qty}`} />
              </ListItem>
            ))}
            {(!suggestions.surplus || suggestions.surplus.length === 0) && (
              <ListItem><ListItemText primary="Нет избытков за сутки" /></ListItem>
            )}
          </List>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  )
}

export default ReplenishmentModal


