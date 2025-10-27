import { Request, Response } from 'express';
import { authService } from '../services/AuthService';
import { LoginResponse } from '../types';

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "admin@smartwarehouse.ru"
 *           description: "Email пользователя"
 *         password:
 *           type: string
 *           minLength: 8
 *           example: "SecurePass123!"
 *           description: "Пароль пользователя"
 *         rememberMe:
 *           type: boolean
 *           example: false
 *           description: "Запомнить пользователя"
 *     
 *     LoginResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         token:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *           description: "JWT токен авторизации"
 *         user:
 *           $ref: '#/components/schemas/User'
 *         message:
 *           type: string
 *           example: "Успешный вход в систему"
 */

/**
 * Аутентификация пользователя в системе
 * @param {Request} req - Express request объект
 * @param {Response} res - Express response объект
 * @returns {Promise<void>}
 * 
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вход в систему
 *     description: Аутентификация пользователя по email и паролю с возвратом JWT токена
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Успешная аутентификация
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Ошибка валидации данных
 *       401:
 *         description: Неверные учетные данные
 *       500:
 *         description: Внутренняя ошибка сервера
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, rememberMe } = req.body;

    console.log('🔐 AuthController: Login request for:', email);

    // Делегируем всю бизнес-логику сервису
    const response: LoginResponse = await authService.login({
      email,
      password,
      rememberMe
    });

    console.log('✅ AuthController: Login successful for:', email);
    res.json(response);
  } catch (error: any) {
    console.error('❌ AuthController login error:', error);
    // Используем стандартный error middleware вместо ручной обработки
    throw error;
  }
};

/**
 * Получение информации о текущем авторизованном пользователе
 * @param {Request} req - Express request объект с JWT токеном в заголовке Authorization
 * @param {Response} res - Express response объект
 * @returns {Promise<void>}
 * 
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
 *         description: Информация о пользователе успешно получена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Необходима авторизация
 *       404:
 *         description: Пользователь не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    console.log('👤 AuthController: Get current user request for ID:', userId);

    // Делегируем получение пользователя сервису
    const result = await authService.getCurrentUser(userId);
    
    if (!result.success || !result.user) {
      console.log('❌ AuthController: User not found for ID:', userId);
      return res.status(404).json({ error: result.error || 'User not found' });
    }

    console.log('✅ AuthController: Current user retrieved:', result.user.email);
    res.json({
      user: result.user
    });
  } catch (error: any) {
    console.error('❌ AuthController get current user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};