import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '../store'
import { Box, Paper, Typography, Avatar, Divider, List, ListItem, ListItemText, Switch, Button, Grid, Chip } from '@mui/material'
import { logout } from '../store/slices/authSlice'

const Profile: React.FC = () => {
  const dispatch = useDispatch()
  const { user } = useSelector((state: RootState) => state.auth)

  const [browserNotifications, setBrowserNotifications] = React.useState(Notification?.permission === 'granted')

  const handleToggleNotifications = async () => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission()
      }
      setBrowserNotifications(Notification.permission === 'granted')
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4} md={3}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 96, height: 96 }}>{user?.name?.[0] || 'U'}</Avatar>
              <Typography variant="h6">{user?.name}</Typography>
              <Chip label={user?.role || 'role'} size="small" color="primary" variant="outlined" />
            </Box>
          </Grid>
          <Grid item xs={12} sm={8} md={9}>
            <Typography variant="subtitle1" gutterBottom>Учетная запись</Typography>
            <List>
              <ListItem>
                <ListItemText primary="Email" secondary={user?.email || '—'} />
              </ListItem>
              <ListItem>
                <ListItemText primary="Роль" secondary={user?.role || '—'} />
              </ListItem>
            </List>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" gutterBottom>Настройки</Typography>
            <List>
              <ListItem secondaryAction={
                <Switch edge="end" onChange={handleToggleNotifications} checked={browserNotifications} />
              }>
                <ListItemText primary="Браузерные уведомления" secondary="Показывать нотификации при скрытой вкладке" />
              </ListItem>
            </List>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button variant="contained" color="error" onClick={() => dispatch(logout())}>Выйти</Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  )
}

export default Profile


