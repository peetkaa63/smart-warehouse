-- Инициализация базы данных для Умного Склада

-- Создание таблицы пользователей
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('operator', 'admin', 'viewer', 'manager')),
    blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы роботов
CREATE TABLE IF NOT EXISTS robots (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    battery_level INTEGER,
    last_update TIMESTAMP,
    current_zone VARCHAR(10),
    zone VARCHAR(10),
    current_row INTEGER,
    current_shelf INTEGER,
    last_maintenance TIMESTAMP,
    next_maintenance TIMESTAMP
);

-- Создание таблицы товаров
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    min_stock INTEGER DEFAULT 10,
    optimal_stock INTEGER DEFAULT 100
);

-- Создание таблицы истории инвентаризации
CREATE TABLE IF NOT EXISTS inventory_history (
    id SERIAL PRIMARY KEY,
    robot_id VARCHAR(50) REFERENCES robots(id),
    product_id VARCHAR(50) REFERENCES products(id),
    quantity INTEGER NOT NULL,
    zone VARCHAR(10) NOT NULL,
    row_number INTEGER,
    shelf_number INTEGER,
    status VARCHAR(50) CHECK (status IN ('OK', 'LOW_STOCK', 'CRITICAL')),
    scanned_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы прогнозов ИИ
CREATE TABLE IF NOT EXISTS ai_predictions (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(50) REFERENCES products(id),
    prediction_date DATE NOT NULL,
    days_until_stockout INTEGER,
    recommended_order INTEGER,
    confidence_score DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Уникальность для поддержки UPSERT по (product_id, prediction_date)

-- Настройки пользователя
CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    settings JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Глобальные настройки системы
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ai_predictions_product_date
ON ai_predictions(product_id, prediction_date);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_inventory_scanned ON inventory_history(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_history(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_zone ON inventory_history(zone);

-- ВСТАВКА ТЕСТОВЫХ ДАННЫХ

-- Тестовые пользователи (пароль: password123)
INSERT INTO users (email, password_hash, name, role) VALUES
('operator@rtk.ru', '$2b$10$JDc7XL7WCLS7/H9YoShMzOzWDbDFLnxqBwcvi8H3LXUWFsW8vtoHS', 'Иван Операторов', 'operator'),
('admin@rtk.ru', '$2b$10$JDc7XL7WCLS7/H9YoShMzOzWDbDFLnxqBwcvi8H3LXUWFsW8vtoHS', 'Петр Админов', 'admin'),
('viewer@rtk.ru', '$2b$10$JDc7XL7WCLS7/H9YoShMzOzWDbDFLnxqBwcvi8H3LXUWFsW8vtoHS', 'Сергей Наблюдателев', 'viewer')
ON CONFLICT (email) DO NOTHING;

-- Тестовые роботы
INSERT INTO robots (id, status, battery_level, last_update, current_zone, current_row, current_shelf) VALUES
('RB-001', 'active', 85, NOW(), 'A', 1, 1),
('RB-002', 'active', 45, NOW(), 'B', 5, 2),
('RB-003', 'charging', 95, NOW(), 'C', 10, 3),
('RB-004', 'offline', 15, NOW() - INTERVAL '1 hour', 'D', 15, 4),
('RB-005', 'active', 95, NOW(), 'B', 5, 2)
ON CONFLICT (id) DO NOTHING;

-- Тестовые товары
INSERT INTO products (id, name, category, min_stock, optimal_stock) VALUES
('TEL-4567', 'Роутер RT-AC68U', 'Сетевое оборудование', 5, 50),
('TEL-8901', 'Модем DSL-2640U', 'Сетевое оборудование', 10, 100),
('TEL-2345', 'Коммутатор SG-108', 'Сетевое оборудование', 3, 30),
('TEL-6789', 'IP-телефон T46S', 'Телефония', 8, 80),
('TEL-3456', 'Кабель UTP Cat6', 'Кабели', 20, 200)
ON CONFLICT (id) DO NOTHING;