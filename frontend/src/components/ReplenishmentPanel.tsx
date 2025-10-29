import React from 'react'
import { Paper, Box, Typography, List, ListItem, ListItemText, Button } from '@mui/material'
import api from '../services/api'

const ReplenishmentPanel: React.FC = () => {
  const [data, setData] = React.useState<{ low: any[]; surplus: any[] }>({ low: [], surplus: [] })

  const load = async () => {
    try {
      const resp = await api.get('/api/inventory/suggestions')
      setData(resp.data?.data || { low: [], surplus: [] })
    } catch {}
  }

  React.useEffect(() => { load() }, [])

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">Предложения по пополнению</Typography>
        <Button size="small" onClick={load}>Обновить</Button>
      </Box>
      <Typography variant="subtitle2">Дефицит</Typography>
      <List dense>
        {(data.low || []).map((i, idx) => (
          <ListItem key={`low-${idx}`}>
            <ListItemText primary={`Товар ${i.product_id} • зона ${i.zone}`} secondary={`Кол-во: ${i.qty}`} />
          </ListItem>
        ))}
        {(!data.low || data.low.length === 0) && <ListItem><ListItemText primary="Нет дефицитов" /></ListItem>}
      </List>
      <Typography variant="subtitle2" sx={{ mt: 1 }}>Избыток</Typography>
      <List dense>
        {(data.surplus || []).map((i, idx) => (
          <ListItem key={`surplus-${idx}`}>
            <ListItemText primary={`Товар ${i.product_id} • зона ${i.zone}`} secondary={`Кол-во: ${i.qty}`} />
          </ListItem>
        ))}
        {(!data.surplus || data.surplus.length === 0) && <ListItem><ListItemText primary="Нет избытков" /></ListItem>}
      </List>
    </Paper>
  )
}

export default ReplenishmentPanel


