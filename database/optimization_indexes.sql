-- Оптимизация индексов для таблицы inventory_history
-- Выполнить после анализа производительности

-- 1. Составной индекс для частых запросов по дате и статусу
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_scanned_status 
ON inventory_history(scanned_at DESC, status) 
WHERE scanned_at IS NOT NULL;

-- 2. Составной индекс для запросов по роботу и дате
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_robot_scanned 
ON inventory_history(robot_id, scanned_at DESC) 
WHERE robot_id IS NOT NULL;

-- 3. Составной индекс для запросов по товару и дате
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_product_scanned 
ON inventory_history(product_id, scanned_at DESC) 
WHERE product_id IS NOT NULL;

-- 4. Составной индекс для запросов по зоне и дате
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_zone_scanned 
ON inventory_history(zone, scanned_at DESC) 
WHERE zone IS NOT NULL;

-- 5. Частичный индекс для критических товаров (часто запрашивается)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_critical 
ON inventory_history(product_id, scanned_at DESC) 
WHERE status = 'CRITICAL';

-- 6. Частичный индекс для недавних сканирований (последние 24 часа)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_recent 
ON inventory_history(scanned_at DESC, robot_id, product_id) 
WHERE scanned_at >= NOW() - INTERVAL '24 hours';

-- 7. Составной индекс для аналитических запросов
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_analytics 
ON inventory_history(product_id, zone, status, scanned_at DESC) 
WHERE scanned_at IS NOT NULL;

-- 8. Индекс для запросов по полке и ряду
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_location 
ON inventory_history(zone, row_number, shelf_number, scanned_at DESC) 
WHERE row_number IS NOT NULL AND shelf_number IS NOT NULL;

-- 9. Индекс для AI запросов (исторические данные)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_ai_data 
ON inventory_history(scanned_at ASC, product_id, quantity, status) 
WHERE scanned_at >= NOW() - INTERVAL '30 days';

-- 10. Индекс для статистики по дням
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_daily_stats 
ON inventory_history(DATE(scanned_at), product_id, status) 
WHERE scanned_at IS NOT NULL;

-- Анализ использования индексов
-- Выполнить после создания индексов для мониторинга
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch 
-- FROM pg_stat_user_indexes 
-- WHERE tablename = 'inventory_history' 
-- ORDER BY idx_scan DESC;

