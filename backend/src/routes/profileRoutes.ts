import express from 'express'
import { authenticateToken } from '../middleware/authMiddleware'
import { pool } from '../config/database'

const router = express.Router()

router.get('/settings', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user?.id
    const r = await pool.query('SELECT settings FROM user_settings WHERE user_id = $1', [userId])
    const settings = r.rows?.[0]?.settings || {}
    res.json({ success: true, settings })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

router.post('/settings', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user?.id
    const settings = req.body?.settings || {}
    await pool.query(
      `INSERT INTO user_settings(user_id, settings, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET settings = EXCLUDED.settings, updated_at = NOW()`,
      [userId, settings]
    )
    res.json({ success: true })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

export default router


