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
    // Убеждаемся что settings это объект для JSONB
    let settingsJson = settings
    if (typeof settings === 'string') {
      try {
        settingsJson = JSON.parse(settings)
      } catch (e) {
        settingsJson = {}
      }
    }
    // Преобразуем в JSON строку для PostgreSQL JSONB
    const settingsStr = JSON.stringify(settingsJson)
    await pool.query(
      `INSERT INTO user_settings(user_id, settings, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (user_id) DO UPDATE SET settings = EXCLUDED.settings::jsonb, updated_at = NOW()`,
      [userId, settingsStr]
    )
    res.json({ success: true })
  } catch (e: any) {
    console.error('❌ Profile settings save error:', e)
    res.status(500).json({ success: false, error: e.message })
  }
})

export default router


