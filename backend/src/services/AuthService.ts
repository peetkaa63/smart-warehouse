import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { userRepository, IUserRepository } from '../repositories/UserRepository';
import { User, PublicUser, LoginResponse } from '../types';

export interface LoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResult {
  success: boolean;
  user?: PublicUser;
  token?: string;
  error?: string;
}

export class AuthService {
  constructor(private userRepo: IUserRepository = userRepository) {}

  // Аутентификация пользователя
  async authenticateUser(email: string, password: string): Promise<AuthResult> {
    try {
      console.log('🔐 AuthService: Authenticating user:', email);

      // Найти пользователя
      const user = await this.userRepo.findByEmail(email);
      if (!user) {
        console.log('❌ AuthService: User not found:', email);
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // Проверить пароль
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        console.log('❌ AuthService: Invalid password for user:', email);
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      console.log('✅ AuthService: User authenticated successfully:', email);
      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      };
    } catch (error: any) {
      console.error('❌ AuthService authentication error:', error);
      return {
        success: false,
        error: 'Authentication failed: ' + error.message
      };
    }
  }

  // Создание JWT токена
  generateToken(user: PublicUser, rememberMe: boolean = false): string {
    const expiresIn = rememberMe ? '7d' : '24h';
    
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET!,
      { expiresIn }
    );

    console.log('🎫 AuthService: Token generated for user:', user.email);
    return token;
  }

  // Получение текущего пользователя
  async getCurrentUser(userId: number): Promise<AuthResult> {
    try {
      console.log('👤 AuthService: Getting current user:', userId);

      const user = await this.userRepo.findById(userId);
      if (!user) {
        console.log('❌ AuthService: User not found by ID:', userId);
        return {
          success: false,
          error: 'User not found'
        };
      }

      console.log('✅ AuthService: Current user retrieved:', user.email);
      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      };
    } catch (error: any) {
      console.error('❌ AuthService get current user error:', error);
      return {
        success: false,
        error: 'Failed to get current user: ' + error.message
      };
    }
  }

  // Полный процесс логина
  async login(loginData: LoginData): Promise<LoginResponse> {
    try {
      console.log('🚪 AuthService: Starting login process for:', loginData.email);

      // Аутентификация
      const authResult = await this.authenticateUser(loginData.email, loginData.password);
      if (!authResult.success || !authResult.user) {
        throw new Error(authResult.error || 'Authentication failed');
      }

      // Генерация токена
      const token = this.generateToken(authResult.user, loginData.rememberMe);

      const response: LoginResponse = {
        token,
        user: authResult.user
      };

      console.log('✅ AuthService: Login successful for:', loginData.email);
      return response;
    } catch (error: any) {
      console.error('❌ AuthService login error:', error);
      throw new Error(error.message || 'Login failed');
    }
  }

  // Валидация токена
  validateToken(token: string): { valid: boolean; payload?: any; error?: string } {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      return {
        valid: true,
        payload: decoded
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
}

export const authService = new AuthService();
