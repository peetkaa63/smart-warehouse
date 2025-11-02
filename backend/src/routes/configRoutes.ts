import express from 'express'
import { getTransportMode } from '../services/TransportMode'

const router = express.Router()

/**
 * @swagger
 * /api/config/transport-mode:
 *   get:
 *     summary: Получить режим транспорта (публичный)
 *     description: Возвращает текущий режим транспорта для коммуникации с роботами (WebSocket или HTTP). Этот endpoint доступен без аутентификации.
 *     tags: [Config]
 *     responses:
 *       200:
 *         description: Режим транспорта успешно получен
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
 *                   enum: [websocket, http]
 *                   description: Текущий режим транспорта
 *                   example: "websocket"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/transport-mode', (req, res) => {
  res.json({ success: true, mode: getTransportMode() })
})

export default router


