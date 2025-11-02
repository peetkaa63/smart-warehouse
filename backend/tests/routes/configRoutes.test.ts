import request from 'supertest';
import express from 'express';
import configRoutes from '../../src/routes/configRoutes';

const app = express();
app.use(express.json());
app.use('/api/config', configRoutes);

jest.mock('../../src/services/TransportMode', () => ({
  getTransportMode: jest.fn(() => 'websocket')
}));

describe('Config Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/config/transport-mode', () => {
    it('should return transport mode without authentication', async () => {
      const response = await request(app)
        .get('/api/config/transport-mode');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.mode).toBe('websocket');
    });

    it('should return different transport modes', async () => {
      const { getTransportMode } = require('../../src/services/TransportMode');
      getTransportMode.mockReturnValue('http');

      const response = await request(app)
        .get('/api/config/transport-mode');

      expect(response.status).toBe(200);
      expect(response.body.mode).toBe('http');
    });
  });
});

