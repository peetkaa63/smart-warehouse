import express from 'express';
import { login, getCurrentUser } from '../controllers/authController';
import { validateLogin, handleValidationErrors } from '../middleware/validationMiddleware';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вход в систему
 *     description: Аутентификация пользователя по email и паролю
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: "admin@smartwarehouse.ru"
 *             password: "SecurePass123!"
 *     responses:
 *       200:
 *         description: Успешная аутентификация
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *             example:
 *               success: true
 *               token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               user:
 *                 id: 1
 *                 email: "admin@smartwarehouse.ru"
 *                 name: "Администратор"
 *                 role: "admin"
 *                 created_at: "2024-01-01T00:00:00.000Z"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Неверные учетные данные
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error:
 *                 code: "INVALID_CREDENTIALS"
 *                 message: "Invalid credentials"
 *                 messageRu: "Неверный email или пароль"
 *                 statusCode: 401
 *                 severity: "MEDIUM"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/login', validateLogin, handleValidationErrors, login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Получить текущего пользователя
 *     description: Возвращает информацию о текущем авторизованном пользователе
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Информация о пользователе
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *             example:
 *               success: true
 *               user:
 *                 id: 1
 *                 email: "admin@smartwarehouse.ru"
 *                 name: "Администратор"
 *                 role: "admin"
 *                 created_at: "2024-01-01T00:00:00.000Z"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/me', authenticateToken, getCurrentUser);

export default router;