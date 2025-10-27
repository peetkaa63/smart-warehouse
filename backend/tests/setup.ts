import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  // Создаем in-memory MongoDB для тестов
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Устанавливаем переменные окружения для тестов
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = mongoUri;
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.GEMINI_API_KEY = 'test-gemini-key';
});

afterAll(async () => {
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Мокаем внешние сервисы
jest.mock('../src/services/geminiService', () => ({
  __esModule: true,
  default: {
    analyzeInventoryData: jest.fn(),
    testConnection: jest.fn(),
    getStatus: jest.fn()
  }
}));

jest.mock('socket.io', () => ({
  Server: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    to: jest.fn().mockReturnThis()
  }))
}));

// Очищаем моки после каждого теста
afterEach(() => {
  jest.clearAllMocks();
});
