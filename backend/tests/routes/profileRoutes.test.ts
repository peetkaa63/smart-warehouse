import request from 'supertest';
import express from 'express';
import profileRoutes from '../../src/routes/profileRoutes';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use('/api/profile', profileRoutes);

const mockUser = {
  id: 1,
  email: 'test@example.com',
  role: 'admin'
};

jest.mock('../../src/middleware/authMiddleware', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = mockUser;
    next();
  }
}));

jest.mock('../../src/services/ProfileService', () => ({
  profileService: {
    getSettings: jest.fn(),
    saveSettings: jest.fn()
  }
}));

describe('Profile Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/profile/settings', () => {
    it('should return user settings successfully', async () => {
      const { profileService } = require('../../src/services/ProfileService');
      profileService.getSettings.mockResolvedValue({
        theme: 'dark',
        language: 'ru',
        notifications: true
      });

      const response = await request(app)
        .get('/api/profile/settings')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.settings).toHaveProperty('theme');
      expect(profileService.getSettings).toHaveBeenCalledWith(mockUser.id);
    });

    it('should handle errors when getting settings', async () => {
      const { profileService } = require('../../src/services/ProfileService');
      profileService.getSettings.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/profile/settings')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/profile/settings', () => {
    it('should save user settings successfully', async () => {
      const { profileService } = require('../../src/services/ProfileService');
      profileService.saveSettings.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/profile/settings')
        .set('Authorization', 'Bearer mock-token')
        .send({
          settings: {
            theme: 'light',
            language: 'en',
            notifications: false
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(profileService.saveSettings).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          theme: 'light',
          language: 'en',
          notifications: false
        })
      );
    });

    it('should handle empty settings object', async () => {
      const { profileService } = require('../../src/services/ProfileService');
      profileService.saveSettings.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/profile/settings')
        .set('Authorization', 'Bearer mock-token')
        .send({});

      expect(response.status).toBe(200);
      expect(profileService.saveSettings).toHaveBeenCalledWith(mockUser.id, {});
    });

    it('should handle errors when saving settings', async () => {
      const { profileService } = require('../../src/services/ProfileService');
      profileService.saveSettings.mockRejectedValue(new Error('Save failed'));

      const response = await request(app)
        .post('/api/profile/settings')
        .set('Authorization', 'Bearer mock-token')
        .send({
          settings: { theme: 'dark' }
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});

