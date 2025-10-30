import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/authRoutes';
import { testConnection } from './config/database';
import { setupWebSocket } from './sockets/websocket';
import dashboardRoutes, { replenishmentRouter } from './routes/dashboardRoutes';
import robotsRoutes from './routes/robotsRoutes';
import historyRoutes from './routes/historyRoutes';
import uploadRoutes from './routes/uploadRoutes';
import exportRoutes from './routes/exportRoutes';
import aiRoutes from './routes/aiRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import advancedAnalyticsRoutes from './routes/advancedAnalyticsRoutes';
import adminRoutes from './routes/adminRoutes';
import profileRoutes from './routes/profileRoutes';
import configRoutes from './routes/configRoutes';
import { initTransportMode } from './services/TransportMode';
import { setupSwagger } from './config/swagger';
import { 
  errorHandler, 
  notFoundHandler, 
  requestIdMiddleware,
  requestLoggerMiddleware 
} from './middleware/errorMiddleware';
import { taskQueueService } from './services/TaskQueueService';
import { pool } from './config/database';

dotenv.config();

const app = express();
const server = createServer(app);

// CORS настройка
app.use(cors({
  origin: true, // Разрешаем все origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// WebSocket настройка
const io = new Server(server, {
  cors: {
    origin: true, // Разрешаем все origins для WebSocket
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(express.json());

// Request ID и логирование
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);

// Swagger документация
setupSwagger(app);

// Health check
app.get('/health', async (req, res) => {
  try {
    const dbStatus = await testConnection();
    res.json({ 
      status: 'OK', 
      database: dbStatus ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString() 
    });
  } catch (error: any) {
    res.status(500).json({ 
      status: 'ERROR', 
      database: 'error',
      error: error.message,
      timestamp: new Date().toISOString() 
    });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/robots', robotsRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/advancedAnalytics', advancedAnalyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/config', configRoutes);
app.use('/api/inventory', replenishmentRouter);

// Инициализация режима транспорта и WebSocket
initTransportMode().then(() => setupWebSocket(io));

// Error handling middleware (должен быть последним)
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// Функция ожидания с повторными попытками
const waitForDatabase = async (maxAttempts = 10, delay = 5000) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`🔌 Testing database connection (attempt ${attempt}/${maxAttempts})...`);
    
    const connected = await testConnection();
    if (connected) {
      console.log('✅ Database connection established!');
      return true;
    }
    
    if (attempt < maxAttempts) {
      console.log(`⏳ Waiting ${delay/1000} seconds before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error(`Failed to connect to database after ${maxAttempts} attempts`);
};

async function initializeStartTasksForAllRobots() {
  const robots = await pool.query('SELECT id FROM robots');
  const zones = ['A', 'B', 'C', 'D', 'E'];
  for (const robot of robots.rows) {
    zones.forEach((zone, idx) => {
      const taskId = `scan-${zone}`;
      taskQueueService.enqueue(robot.id, {
        id: taskId,
        priority: 1,
        payload: { zone, row: idx + 1, shelf: 1 }
      });
    });
  }
}

// Запуск сервера
const startServer = async () => {
  try {
    console.log('🚀 Starting Smart Warehouse backend...');
    
    // Ждем подключения к БД
    await waitForDatabase();
    await initializeStartTasksForAllRobots();
    
    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ WebSocket server initialized`);
      console.log(`✅ Health check: http://localhost:${PORT}/health`);
      console.log(`✅ API available: http://localhost:${PORT}/api`);
      console.log(`📚 Swagger documentation: http://localhost:${PORT}/api-docs`);
      console.log(`📄 Swagger JSON: http://localhost:${PORT}/api-docs.json`);
    });
  } catch (error: any) {
    console.error('💥 Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();