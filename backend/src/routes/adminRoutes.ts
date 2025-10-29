import express from 'express'
import { authenticateToken, requireRole } from '../middleware/authMiddleware'
import { taskQueueService } from '../services/TaskQueueService'
import { getTransportMode, setTransportMode } from '../services/TransportMode'
import { robotService } from '../sockets/websocket'

const router = express.Router()

router.get('/logs', authenticateToken, requireRole(['admin']), (req, res) => {
  try {
    res.json({ success: true, data: taskQueueService.getAdminLogs() })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

export default router

// Глобальный режим приема данных роботов (admin-only)
router.get('/transport-mode', authenticateToken, requireRole(['admin']), (req, res) => {
  res.json({ success: true, mode: getTransportMode() })
})

router.post('/transport-mode', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { mode } = req.body || {}
    if (mode !== 'http' && mode !== 'socket') return res.status(400).json({ success: false, error: 'mode must be http|socket' })
    await setTransportMode(mode)
    // уведомляем всех подключенных
    robotService?.io?.emit('system_notice', { type: 'transport_mode', mode, timestamp: new Date().toISOString() })
    res.json({ success: true })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})


