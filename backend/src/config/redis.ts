import Redis from 'ioredis';

// Конфигурация Redis
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
};

// Создание клиента Redis
export const redis = new Redis(redisConfig);

// Обработка ошибок подключения
redis.on('error', (error) => {
  console.error('❌ Redis connection error:', error);
});

redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redis.on('ready', () => {
  console.log('🚀 Redis ready for operations');
});

// Проверка подключения
export const checkRedisConnection = async (): Promise<boolean> => {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error('❌ Redis ping failed:', error);
    return false;
  }
};

// Утилиты для работы с кэшем
export class CacheManager {
  private static instance: CacheManager;
  private redis: Redis;

  constructor(redisClient: Redis) {
    this.redis = redisClient;
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager(redis);
    }
    return CacheManager.instance;
  }

  // Установка значения с TTL
  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.redis.setex(key, ttlSeconds, serialized);
    } catch (error) {
      console.error(`❌ Cache set error for key ${key}:`, error);
    }
  }

  // Получение значения
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`❌ Cache get error for key ${key}:`, error);
      return null;
    }
  }

  // Удаление ключа
  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error(`❌ Cache delete error for key ${key}:`, error);
    }
  }

  // Удаление по паттерну
  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error(`❌ Cache delete pattern error for ${pattern}:`, error);
    }
  }

  // Проверка существования ключа
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`❌ Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  // Установка значения только если ключ не существует
  async setnx(key: string, value: any, ttlSeconds: number = 300): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      const result = await this.redis.set(key, serialized, 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch (error) {
      console.error(`❌ Cache setnx error for key ${key}:`, error);
      return false;
    }
  }

  // Инкремент значения
  async incr(key: string, ttlSeconds: number = 300): Promise<number> {
    try {
      const result = await this.redis.incr(key);
      if (result === 1) {
        await this.redis.expire(key, ttlSeconds);
      }
      return result;
    } catch (error) {
      console.error(`❌ Cache incr error for key ${key}:`, error);
      return 0;
    }
  }

  // Получение множественных ключей
  async mget(keys: string[]): Promise<(any | null)[]> {
    try {
      const values = await this.redis.mget(...keys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      console.error(`❌ Cache mget error:`, error);
      return keys.map(() => null);
    }
  }

  // Установка множественных ключей
  async mset(keyValuePairs: Record<string, any>, ttlSeconds: number = 300): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      for (const [key, value] of Object.entries(keyValuePairs)) {
        const serialized = JSON.stringify(value);
        pipeline.setex(key, ttlSeconds, serialized);
      }
      await pipeline.exec();
    } catch (error) {
      console.error(`❌ Cache mset error:`, error);
    }
  }

  // Получение информации о Redis
  async getRedisInfo(section?: string): Promise<string> {
    if (section) {
      return await this.redis.info(section);
    }
    return await this.redis.info();
  }
}

// Экспорт singleton instance
export const cacheManager = CacheManager.getInstance();

// Ключи для кэширования
export const CacheKeys = {
  DASHBOARD_STATS: 'dashboard:stats',
  ROBOTS_LIST: 'robots:list',
  RECENT_SCANS: 'scans:recent',
  ZONE_STATISTICS: 'analytics:zones',
  PERFORMANCE_TRENDS: 'analytics:performance',
  SYSTEM_ALERTS: 'system:alerts',
  PRODUCT_STATS: 'products:stats',
  AI_PREDICTIONS: 'ai:predictions',
  USER_SESSION: 'user:session',
} as const;

// TTL константы (в секундах)
export const CacheTTL = {
  DASHBOARD: 30,        // 30 секунд для dashboard
  ROBOTS: 60,           // 1 минута для роботов
  SCANS: 120,           // 2 минуты для сканирований
  ANALYTICS: 300,       // 5 минут для аналитики
  AI_DATA: 1800,        // 30 минут для AI данных
  USER_SESSION: 3600,   // 1 час для пользовательских сессий
} as const;
