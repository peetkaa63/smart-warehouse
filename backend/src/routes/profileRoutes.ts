import express from 'express'
import { authenticateToken } from '../middleware/authMiddleware'
import { profileService } from '../services/ProfileService'

const router = express.Router()

router.get('/settings', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user?.id
    const settings = await profileService.getSettings(userId)
    res.json({ success: true, settings })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

router.post('/settings', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user?.id
    const settings = req.body?.settings || {}
    await profileService.saveSettings(userId, settings)
    res.json({ success: true })
  } catch (e: any) {
    console.error('❌ Profile settings save error:', e)
    res.status(500).json({ success: false, error: e.message })
  }
})

export default router


