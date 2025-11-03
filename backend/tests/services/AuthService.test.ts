import { AuthService } from '../../src/services/AuthService';
import { userRepository } from '../../src/repositories/UserRepository';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

jest.mock('../../src/repositories/UserRepository');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  let authService: AuthService;
  const mockUser = {
    id: 1,
    email: 'test@example.com',
    password_hash: '$2a$10$hashed',
    name: 'Test User',
    role: 'admin' as const,
    created_at: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService();
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('authenticateUser', () => {
    it('should authenticate user with valid credentials', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.authenticateUser('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.user).toEqual({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin'
      });
      expect(result.error).toBeUndefined();
    });

    it('should return error for non-existent user', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);

      const result = await authService.authenticateUser('nonexistent@example.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
      expect(result.user).toBeUndefined();
    });

    it('should return error for invalid password', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await authService.authenticateUser('test@example.com', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
    });
  });

  describe('generateToken', () => {
    it('should generate JWT token for user', () => {
      const mockToken = 'generated-token';
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      const user = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin' as const
      };

      const token = authService.generateToken(user);

      expect(token).toBe(mockToken);
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 1, email: 'test@example.com', role: 'admin' },
        'test-secret',
        { expiresIn: '24h' }
      );
    });

    it('should generate token with longer expiry for rememberMe', () => {
      const mockToken = 'generated-token';
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      const user = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin' as const
      };

      authService.generateToken(user, true);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.any(Object),
        'test-secret',
        { expiresIn: '7d' }
      );
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user by ID', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.getCurrentUser(1);

      expect(result.success).toBe(true);
      expect(result.user).toEqual({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin'
      });
    });

    it('should return error for non-existent user', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);

      const result = await authService.getCurrentUser(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('validateToken', () => {
    it('should validate valid token', () => {
      const mockPayload = { id: 1, email: 'test@example.com', role: 'admin' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const result = authService.validateToken('valid-token');

      expect(result.valid).toBe(true);
      expect(result.payload).toEqual(mockPayload);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid token', () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = authService.validateToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token');
      expect(result.payload).toBeUndefined();
    });
  });
});

