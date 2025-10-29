import express from 'express'
import { getTransportMode } from '../services/TransportMode'

const router = express.Router()

router.get('/transport-mode', (req, res) => {
  res.json({ success: true, mode: getTransportMode() })
})

export default router


