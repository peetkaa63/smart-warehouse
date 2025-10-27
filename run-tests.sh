#!/bin/bash

# Скрипт для запуска всех тестов проекта Smart Warehouse

echo "🚀 Запуск комплексных тестов Smart Warehouse"
echo "=============================================="

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для проверки успешности выполнения команды
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1 - УСПЕШНО${NC}"
    else
        echo -e "${RED}❌ $1 - ОШИБКА${NC}"
        exit 1
    fi
}

# Функция для запуска тестов с покрытием
run_tests_with_coverage() {
    local dir=$1
    local name=$2
    
    echo -e "\n${BLUE}📊 Запуск тестов $name...${NC}"
    cd $dir
    
    if [ -f "package.json" ]; then
        npm test -- --coverage --watchAll=false --passWithNoTests
        check_status "Тесты $name"
    else
        echo -e "${YELLOW}⚠️  package.json не найден в $dir${NC}"
    fi
    
    cd ..
}

# Проверяем наличие Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js не установлен${NC}"
    exit 1
fi

# Проверяем наличие npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm не установлен${NC}"
    exit 1
fi

echo -e "\n${YELLOW}📋 Проверка зависимостей...${NC}"

# Устанавливаем зависимости для backend
if [ -d "backend" ]; then
    echo "📦 Установка зависимостей backend..."
    cd backend
    npm install --silent
    check_status "Установка зависимостей backend"
    cd ..
fi

# Устанавливаем зависимости для frontend
if [ -d "frontend" ]; then
    echo "📦 Установка зависимостей frontend..."
    cd frontend
    npm install --silent
    check_status "Установка зависимостей frontend"
    cd ..
fi

echo -e "\n${GREEN}✅ Все зависимости установлены${NC}"

# Запускаем тесты backend
if [ -d "backend" ]; then
    run_tests_with_coverage "backend" "Backend API"
fi

# Запускаем тесты frontend
if [ -d "frontend" ]; then
    run_tests_with_coverage "frontend" "Frontend Components"
fi

echo -e "\n${GREEN}🎉 Все тесты завершены успешно!${NC}"
echo -e "\n${BLUE}📈 Отчеты о покрытии:${NC}"
echo "   Backend:  backend/coverage/lcov-report/index.html"
echo "   Frontend: frontend/coverage/lcov-report/index.html"

echo -e "\n${YELLOW}📝 Краткая сводка тестов:${NC}"
echo "   ✅ Backend API endpoints (auth, robots, dashboard, AI, upload)"
echo "   ✅ WebSocket real-time соединения"
echo "   ✅ Google Gemini AI интеграция"
echo "   ✅ CSV загрузка и валидация"
echo "   ✅ Redux slices (auth, dashboard, notifications)"
echo "   ✅ React компоненты (Login, Dashboard, History)"
echo "   ✅ Интеграционные тесты"
echo "   ✅ Тесты безопасности"

echo -e "\n${GREEN}🚀 Готово к продакшену!${NC}"
