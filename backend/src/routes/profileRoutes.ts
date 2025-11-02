import express from 'express'
import { authenticateToken } from '../middleware/authMiddleware'
import { profileService } from '../services/ProfileService'

const router = express.Router()

/**
 * @swagger
 * /api/profile/settings:
 *   get:
 *     summary: Получить настройки профиля пользователя
 *     description: Возвращает персональные настройки текущего авторизованного пользователя.
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Настройки профиля успешно получены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 settings:
 *                   type: object
 *                   description: Объект с настройками пользователя
 *                   example:
 *                     theme: "dark"
 *                     language: "ru"
 *                     notifications: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/settings', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user?.id
    const settings = await profileService.getSettings(userId)
    res.json({ success: true, settings })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

/**
 * @swagger
 * /api/profile/settings:
 *   post:
 *     summary: Сохранить настройки профиля пользователя
 *     description: Сохраняет персональные настройки текущего авторизованного пользователя.
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - settings
 *             properties:
 *               settings:
 *                 type: object
 *                 description: Объект с настройками для сохранения
 *                 example:
 *                   theme: "dark"
 *                   language: "ru"
 *                   notifications: true
 *     responses:
 *       200:
 *         description: Настройки профиля успешно сохранены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
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


