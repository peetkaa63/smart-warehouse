import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Используем DATABASE_URL из environment variables или формируем из отдельных параметров
const getDatabaseConfig = () => {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
    };
  }

  return {
    user: process.env.DB_USER || 'warehouse_user',
    host: process.env.DB_HOST || 'postgres', // ← В Docker используем имя сервиса
    database: process.env.DB_NAME || 'warehouse_db',
    password: process.env.DB_PASSWORD || 'secure_password',
    port: parseInt(process.env.DB_PORT || '5432'),
  };
};

export const pool = new Pool(getDatabaseConfig());

// Тестовое подключение
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

// Функция для проверки подключения
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Проверим, что таблицы существуют
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log(`✅ Available tables: ${result.rows.map(row => row.table_name).join(', ')}`);
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};