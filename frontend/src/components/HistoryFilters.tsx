import React from 'react';
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  SelectChangeEvent,
} from '@mui/material';
import { FilterList } from '@mui/icons-material';

interface HistoryFiltersProps {
  filters: {
    from: string;
    to: string;
    zones: string[];
    statuses: string[];
    productId: string;
    robotId: string;
  };
  onFilterChange: (key: string, value: any) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
}

const zones = ['A', 'B', 'C', 'D', 'E'];
const statusOptions = ['OK', 'LOW_STOCK', 'CRITICAL'];

export const HistoryFilters: React.FC<HistoryFiltersProps> = ({
  filters,
  onFilterChange,
  onApplyFilters,
  onResetFilters,
}) => {
  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FilterList fontSize="small" />
        Фильтры
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          fullWidth
          size="small"
          label="От (дата)"
          type="date"
          value={filters.from}
          onChange={(e) => onFilterChange('from', e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          fullWidth
          size="small"
          label="До (дата)"
          type="date"
          value={filters.to}
          onChange={(e) => onFilterChange('to', e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <FormControl fullWidth size="small">
          <InputLabel>Зоны</InputLabel>
          <Select
            multiple
            value={filters.zones}
            onChange={(e: SelectChangeEvent<string[]>) => 
              onFilterChange('zones', e.target.value)
            }
            input={<OutlinedInput label="Зоны" />}
            renderValue={(selected) => selected.join(', ')}
          >
            {zones.map((zone) => (
              <MenuItem key={zone} value={zone}>
                <Checkbox checked={filters.zones.indexOf(zone) > -1} />
                <ListItemText primary={zone} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth size="small">
          <InputLabel>Статусы</InputLabel>
          <Select
            multiple
            value={filters.statuses}
            onChange={(e: SelectChangeEvent<string[]>) => 
              onFilterChange('statuses', e.target.value)
            }
            input={<OutlinedInput label="Статусы" />}
            renderValue={(selected) => selected.join(', ')}
          >
            {statusOptions.map((status) => (
              <MenuItem key={status} value={status}>
                <Checkbox checked={filters.statuses.indexOf(status) > -1} />
                <ListItemText primary={status} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          fullWidth
          size="small"
          label="ID товара"
          value={filters.productId}
          onChange={(e) => onFilterChange('productId', e.target.value)}
        />
        <TextField
          fullWidth
          size="small"
          label="ID робота"
          value={filters.robotId}
          onChange={(e) => onFilterChange('robotId', e.target.value)}
        />
      </Box>
      
      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
        <Button 
          variant="contained" 
          onClick={onApplyFilters}
          size="small"
          fullWidth
        >
          Применить
        </Button>
        <Button 
          variant="outlined" 
          onClick={onResetFilters}
          size="small"
          fullWidth
        >
          Сбросить
        </Button>
      </Box>
    </Paper>
  );
};