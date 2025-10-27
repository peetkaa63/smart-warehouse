import request from 'supertest';
import express from 'express';
import authRoutes from '../src/routes/authRoutes';
import { authenticateToken } from '../src/middleware/authMiddleware';
import jwt from 'jsonwebtoken';

// Создаем тестовое приложение
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

// Мокаем базу данных
const mockUser = {
  id: 1,
  email: 'test@example.com',
  password: '$2a$10$hashedpassword',
  role: 'admin'
};

jest.mock('../src/repositories/UserRepository', () => ({
  findByEmail: jest.fn(),
  findById: jest.fn()
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn()
}));

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const { findByEmail } = require('../src/repositories/UserRepository');
      const { compare } = require('bcryptjs');

      findByEmail.mockResolvedValue(mockUser);
      compare.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should return 401 for invalid credentials', async () => {
      const { findByEmail } = require('../src/repositories/UserRepository');
      const { compare } = require('bcryptjs');

      findByEmail.mockResolvedValue(mockUser);
      compare.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent user', async () => {
      const { findByEmail } = require('../src/repositories/UserRepository');

      findByEmail.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: '',
          password: ''
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const { findById } = require('../src/repositories/UserRepository');
      
      findById.mockResolvedValue(mockUser);
      
      const token = jwt.sign(
        { userId: mockUser.id, email: mockUser.email },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for missing token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent user', async () => {
      const { findById } = require('../src/repositories/UserRepository');
      
      findById.mockResolvedValue(null);
      
      const token = jwt.sign(
        { userId: 999, email: 'nonexistent@example.com' },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });
});

describe('Auth Middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    mockReq = {
      headers: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  it('should authenticate valid token', async () => {
    const { findById } = require('../src/repositories/UserRepository');
    
    findById.mockResolvedValue(mockUser);
    
    const token = jwt.sign(
      { userId: mockUser.id, email: mockUser.email },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    mockReq.headers.authorization = `Bearer ${token}`;

    await authenticateToken(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockReq.user).toEqual(mockUser);
  });

  it('should reject invalid token', async () => {
    mockReq.headers.authorization = 'Bearer invalid-token';

    await authenticateToken(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should reject missing token', async () => {
    await authenticateToken(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Access token required' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should reject expired token', async () => {
    const expiredToken = jwt.sign(
      { userId: mockUser.id, email: mockUser.email },
      process.env.JWT_SECRET!,
      { expiresIn: '-1h' }
    );

    mockReq.headers.authorization = `Bearer ${expiredToken}`;

    await authenticateToken(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Token expired' });
    expect(mockNext).not.toHaveBeenCalled();
  });
});
