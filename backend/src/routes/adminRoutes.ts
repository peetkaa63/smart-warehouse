import express from 'express'
import { authenticateToken, requireRole } from '../middleware/authMiddleware'
import { taskQueueService } from '../services/TaskQueueService'
import { getTransportMode, setTransportMode } from '../services/TransportMode'
import { robotService } from '../sockets/websocket'

const router = express.Router()

/**
 * @swagger
 * /api/admin/logs:
 *   get:
 *     summary: Получить системные логи администратора
 *     description: Возвращает логи системы управления роботами и задачами. Доступно только для администраторов.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Логи успешно получены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       ts:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-15T10:30:00.000Z"
 *                       level:
 *                         type: string
 *                         enum: [INFO, WARN, ERROR]
 *                         example: "INFO"
 *                       message:
 *                         type: string
 *                         example: "Task enqueued for RB-001: TASK-001"
 *                       meta:
 *                         type: object
 *             example:
 *               success: true
 *               data:
 *                 - ts: "2024-01-15T10:30:00.000Z"
 *                   level: "INFO"
 *                   message: "Task enqueued for RB-001: TASK-001"
 *                   meta:
 *                     robotId: "RB-001"
 *                     task:
 *                       id: "TASK-001"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/logs', authenticateToken, requireRole(['admin']), (req, res) => {
  try {
    res.json({ success: true, data: taskQueueService.getAdminLogs() })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

export default router

/**
 * @swagger
 * /api/admin/transport-mode:
 *   get:
 *     summary: Получить текущий режим приема данных
 *     description: Возвращает текущий режим приема данных от роботов (HTTP или Socket). Доступно только для администраторов.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Режим приема данных успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 mode:
 *                   type: string
 *                   enum: [http, socket]
 *                   example: "socket"
 *                   description: Режим приема данных от роботов
 *             example:
 *               success: true
 *               mode: "socket"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Глобальный режим приема данных роботов (admin-only)
router.get('/transport-mode', authenticateToken, requireRole(['admin']), (req, res) => {
  res.json({ success: true, mode: getTransportMode() })
})

/**
 * @swagger
 * /api/admin/transport-mode:
 *   post:
 *     summary: Изменить режим приема данных от роботов
 *     description: Устанавливает режим приема данных от роботов (HTTP или Socket). Доступно только для администраторов.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mode]
 *             properties:
 *               mode:
 *                 type: string
 *                 enum: [http, socket]
 *                 example: "socket"
 *                 description: Режим приема данных от роботов
 *           example:
 *             mode: "socket"
 *     responses:
 *       200:
 *         description: Режим приема данных успешно изменен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *             example:
 *               success: true
 *       400:
 *         description: Ошибка валидации
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "mode must be http|socket"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
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


